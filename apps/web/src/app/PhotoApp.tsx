import type {
  PhotoSummary,
  PhotoUploadBatch,
  PhotoUploadInstruction,
} from '@baby-growth-gallery/api-client';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Camera,
  Check,
  CloudUpload,
  Image as ImageIcon,
  Images,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useBlocker, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { api } from './api';
import { ConfirmDialog } from './FamilyApp';
import styles from './PhotoApp.module.css';
import { photoKeys } from './photo-query';
import { userFacingError } from './user-facing-error';

const MAX_BYTES = 20 * 1024 * 1024;
const accepted =
  '.jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif';

type LocalStatus = 'ready' | 'uploading' | 'interrupted' | 'uploaded';
interface LocalFile {
  key: string;
  file: File | null;
  preview: string | null;
  progress: number;
  status: LocalStatus;
  error: string | undefined;
  photoId: string | undefined;
}

function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function isHeic(file: File): boolean {
  return /\.(heic|heif)$/i.test(file.name) || ['image/heic', 'image/heif'].includes(file.type);
}

function declaredType(file: File): string {
  if (file.type) return file.type.toLowerCase();
  if (/\.heic$/i.test(file.name)) return 'image/heic';
  if (/\.heif$/i.test(file.name)) return 'image/heif';
  return 'application/octet-stream';
}

function validateFiles(files: File[]): string | null {
  if (files.length === 0) return '请选择至少一张照片。';
  if (files.length > 20) return '每批最多选择 20 张照片。';
  for (const file of files) {
    if (file.size < 1) return '不能上传空文件。';
    if (file.size > MAX_BYTES) return `“${file.name}”超过 20 MiB。`;
    if (
      !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name) &&
      !['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(file.type)
    ) {
      return `“${file.name}”不是支持的照片格式。`;
    }
  }
  return null;
}

function uploadToS3(
  instruction: PhotoUploadInstruction,
  item: LocalFile,
  onProgress: (value: number) => void,
  register: (xhr: XMLHttpRequest) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!item.file) {
      reject(new Error('missing-local-file'));
      return;
    }
    const xhr = new XMLHttpRequest();
    register(xhr);
    xhr.open('POST', instruction.url);
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error('storage-upload-failed'));
    });
    xhr.addEventListener('abort', () => reject(new Error('storage-upload-cancelled')));
    xhr.addEventListener('error', () => reject(new Error('storage-upload-network')));
    const data = new FormData();
    Object.entries(instruction.fields).forEach(([key, value]) => data.append(key, value));
    data.append('file', item.file);
    xhr.send(data);
  });
}

export function PhotoUploadPage(): React.JSX.Element {
  const auth = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const familyId = auth.account?.activeFamilyId ?? '';
  const babyId = auth.account?.activeBabyId ?? '';
  const queryClient = useQueryClient();
  const [items, setItems] = useState<LocalFile[]>([]);
  const [batch, setBatch] = useState<PhotoUploadBatch>();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [batchDate, setBatchDate] = useState('');
  const [batchLocation, setBatchLocation] = useState('');
  const [batchDescription, setBatchDescription] = useState('');
  const [dragging, setDragging] = useState(false);
  const xhrs = useRef(new Map<string, XMLHttpRequest>());
  const itemsRef = useRef<LocalFile[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const hasBrowserUploads = items.some((item) => item.status === 'uploading');
  const leaveBlocker = useBlocker(hasBrowserUploads);
  const batchId = searchParams.get('batchId') ?? batch?.id ?? '';

  const batchQuery = useQuery({
    queryKey: photoKeys.batch(familyId, babyId, batchId),
    queryFn: () => api.getPhotoUploadBatch(familyId, babyId, batchId),
    enabled: Boolean(familyId && babyId && batchId),
    refetchInterval(query) {
      const photos = query.state.data?.photos;
      return photos?.some((photo) => ['QUEUED', 'PROCESSING'].includes(photo.status))
        ? 1_500
        : false;
    },
  });
  const currentBatch = batchQuery.data ?? batch;
  const visibleItems = currentBatch
    ? currentBatch.photos.map(
        (photo): LocalFile =>
          items.find((item) => item.photoId === photo.id) ?? {
            key: `resumed-${photo.id}`,
            file: null,
            preview: null,
            progress: 100,
            status: 'uploaded',
            error: undefined,
            photoId: photo.id,
          },
      )
    : items;

  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (!hasBrowserUploads) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [hasBrowserUploads]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(
    () => () => {
      itemsRef.current.forEach((item) => {
        if (item.preview) URL.revokeObjectURL(item.preview);
      });
    },
    [],
  );

  if (!familyId || !babyId) return <Navigate replace to="/app" />;

  function choose(files: File[]): void {
    const error = validateFiles(files);
    if (error) {
      setNotice(error);
      return;
    }
    items.forEach((item) => {
      if (item.preview) URL.revokeObjectURL(item.preview);
    });
    setItems(
      files.map((file, index) => ({
        key: `${file.name}-${file.size}-${file.lastModified}-${index}`,
        file,
        preview: isHeic(file) ? null : URL.createObjectURL(file),
        progress: 0,
        status: 'ready',
        error: undefined,
        photoId: undefined,
      })),
    );
    setBatch(undefined);
    setSelected(new Set());
    setNotice(undefined);
  }

  async function startUpload(): Promise<void> {
    const files = items.flatMap((item) => (item.file ? [item.file] : []));
    const error = validateFiles(files);
    if (error) {
      setNotice(error);
      return;
    }
    setBusy(true);
    setNotice(undefined);
    try {
      const created = await api.createPhotoUploadBatch(familyId, babyId, {
        files: files.map((file) => ({
          contentType: declaredType(file),
          sizeBytes: file.size,
          capturedOn: localToday(),
        })),
      });
      setBatch(created);
      setSearchParams({ batchId: created.id }, { replace: true });
      const instructions = new Map(
        (created.uploadInstructions ?? []).map((item) => [item.photoId, item]),
      );
      const linked = items.map((item, index) => ({ ...item, photoId: created.photos[index]?.id }));
      setItems(linked);
      await Promise.all(
        linked.map(async (item) => {
          if (!item.photoId) return;
          const instruction = instructions.get(item.photoId);
          if (!instruction) return;
          setItems((all) =>
            all.map((candidate) =>
              candidate.key === item.key
                ? { ...candidate, status: 'uploading', error: undefined }
                : candidate,
            ),
          );
          try {
            await uploadToS3(
              instruction,
              item,
              (progress) =>
                setItems((all) =>
                  all.map((candidate) =>
                    candidate.key === item.key ? { ...candidate, progress } : candidate,
                  ),
                ),
              (xhr) => xhrs.current.set(item.key, xhr),
            );
            await api.completePhotoUpload(familyId, babyId, created.id, item.photoId);
            setItems((all) =>
              all.map((candidate) =>
                candidate.key === item.key
                  ? { ...candidate, status: 'uploaded', progress: 100 }
                  : candidate,
              ),
            );
          } catch {
            setItems((all) =>
              all.map((candidate) =>
                candidate.key === item.key
                  ? { ...candidate, status: 'interrupted', error: '上传中断，可重新上传。' }
                  : candidate,
              ),
            );
          } finally {
            xhrs.current.delete(item.key);
          }
        }),
      );
      await queryClient.invalidateQueries({
        queryKey: photoKeys.batch(familyId, babyId, created.id),
      });
    } catch (errorValue) {
      setNotice(userFacingError(errorValue, '创建上传批次失败，请稍后重试。'));
    } finally {
      setBusy(false);
    }
  }

  async function retry(item: LocalFile): Promise<void> {
    if (!batch || !item.photoId) return;
    try {
      const instruction = await api.reissuePhotoUpload(familyId, babyId, batch.id, item.photoId);
      setItems((all) =>
        all.map((candidate) =>
          candidate.key === item.key
            ? { ...candidate, status: 'uploading', progress: 0, error: undefined }
            : candidate,
        ),
      );
      await uploadToS3(
        instruction,
        item,
        (progress) =>
          setItems((all) =>
            all.map((candidate) =>
              candidate.key === item.key ? { ...candidate, progress } : candidate,
            ),
          ),
        (xhr) => xhrs.current.set(item.key, xhr),
      );
      await api.completePhotoUpload(familyId, babyId, batch.id, item.photoId);
      setItems((all) =>
        all.map((candidate) =>
          candidate.key === item.key
            ? { ...candidate, status: 'uploaded', progress: 100 }
            : candidate,
        ),
      );
      await batchQuery.refetch();
    } catch (errorValue) {
      setNotice(userFacingError(errorValue, '重新上传失败，请稍后重试。'));
      setItems((all) =>
        all.map((candidate) =>
          candidate.key === item.key ? { ...candidate, status: 'interrupted' } : candidate,
        ),
      );
    }
  }

  async function savePhoto(
    photoId: string,
    fields: { title?: string; description?: string; capturedOn?: string; location?: string },
  ): Promise<void> {
    try {
      await api.updatePhoto(familyId, babyId, photoId, fields);
      await batchQuery.refetch();
      setNotice('照片信息已保存。');
    } catch (errorValue) {
      setNotice(userFacingError(errorValue));
    }
  }

  async function publish(): Promise<void> {
    if (!currentBatch || selected.size === 0) {
      setNotice('请先勾选要发布的草稿。');
      return;
    }
    setBusy(true);
    try {
      await api.publishPhotos(familyId, babyId, currentBatch.id, { photoIds: [...selected] });
      setSelected(new Set());
      await batchQuery.refetch();
      setNotice('所选照片已发布给家庭成员。');
    } catch (errorValue) {
      setNotice(userFacingError(errorValue, '发布失败，所选照片均未改变。'));
    } finally {
      setBusy(false);
    }
  }

  async function applyBatchMetadata(): Promise<void> {
    if (!currentBatch || selected.size === 0) {
      setNotice('请先勾选要批量编辑的草稿。');
      return;
    }
    if (!batchDate && !batchLocation.trim() && !batchDescription.trim()) {
      setNotice('请至少填写一项要批量套用的信息。');
      return;
    }
    setBusy(true);
    try {
      await api.updatePhotoBatch(familyId, babyId, currentBatch.id, {
        photoIds: [...selected],
        ...(batchDate ? { capturedOn: batchDate } : {}),
        ...(batchLocation.trim() ? { location: batchLocation } : {}),
        ...(batchDescription.trim() ? { description: batchDescription } : {}),
      });
      await batchQuery.refetch();
      setNotice(`已为 ${selected.size} 张草稿批量套用信息。`);
    } catch (errorValue) {
      setNotice(userFacingError(errorValue, '批量编辑失败，所选照片均未改变。'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.uploadPage}>
      <header className={styles.flowHeader}>
        <Link to="/app/home" aria-label="返回宝宝首页">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <strong>上传照片</strong>
          <span>原图仅在隔离区处理，发布前只有你可见</span>
        </div>
        <Link to="/app/photos/manage">我的上传</Link>
      </header>
      <section className={styles.flowBody}>
        <div className={styles.uploadIntro}>
          <p className={styles.eyebrow}>安全照片流程</p>
          <h1>把珍贵瞬间放进家庭记忆</h1>
          <p>支持 JPG、PNG、WebP、HEIC 和 HEIF；每批最多 20 张，单张不超过 20 MiB。</p>
        </div>
        {notice ? (
          <div className={styles.notice} role="status" tabIndex={-1}>
            {notice}
          </div>
        ) : null}
        {batchId && !currentBatch && batchQuery.isPending ? (
          <div className={styles.notice} role="status" aria-live="polite">
            正在恢复上传批次…
          </div>
        ) : null}
        {batchId && batchQuery.isError ? (
          <div className={styles.notice} role="alert">
            无法恢复这个上传批次。请检查当前家庭和宝宝，或重新开始上传。
            <button
              type="button"
              onClick={() => {
                setBatch(undefined);
                setItems([]);
                setSelected(new Set());
                setSearchParams({}, { replace: true });
              }}
            >
              重新开始
            </button>
          </div>
        ) : null}
        {!batchId ? (
          <div
            className={`${styles.dropZone} ${dragging ? styles.dragging : ''}`}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              choose([...event.dataTransfer.files]);
            }}
          >
            <CloudUpload size={40} />
            <h2>选择或拖放照片</h2>
            <p>HEIC 会在服务端生成安全缩略图，浏览器不会在主线程解码。</p>
            <div className={styles.chooseActions}>
              <button type="button" onClick={() => fileInput.current?.click()}>
                <Images size={18} />
                从相册选择
              </button>
              <button type="button" onClick={() => cameraInput.current?.click()}>
                <Camera size={18} />
                拍照
              </button>
            </div>
            <input
              ref={fileInput}
              className={styles.hiddenInput}
              type="file"
              accept={accepted}
              multiple
              onChange={(event) => choose([...(event.target.files ?? [])])}
            />
            <input
              ref={cameraInput}
              className={styles.hiddenInput}
              type="file"
              accept="image/jpeg,image/png,image/heic,image/heif"
              capture="environment"
              onChange={(event) => choose([...(event.target.files ?? [])])}
            />
          </div>
        ) : null}
        {visibleItems.length > 0 ? (
          <section className={styles.fileSection} aria-live="polite">
            <div className={styles.sectionHeading}>
              <div>
                <h2>{batchId ? '处理与编辑' : `已选择 ${items.length} 张`}</h2>
                <p>
                  {batchId
                    ? '完成处理的照片会自动保存为你的私有草稿。'
                    : '确认后将直接上传到私有隔离区。'}
                </p>
              </div>
              {!batchId ? (
                <button type="button" disabled={busy} onClick={() => void startUpload()}>
                  <Upload size={17} />
                  开始上传
                </button>
              ) : null}
            </div>
            <div className={styles.photoGrid}>
              {visibleItems.map((item, index) => {
                const server = currentBatch?.photos.find((photo) => photo.id === item.photoId);
                return (
                  <UploadCard
                    key={`${item.key}-${server?.id ?? 'local'}-${server?.updatedAt ?? 'pending'}`}
                    item={item}
                    photo={server}
                    selected={Boolean(server && selected.has(server.id))}
                    onSelect={(checked) => {
                      if (!server) return;
                      setSelected((previous) => {
                        const next = new Set(previous);
                        if (checked) next.add(server.id);
                        else next.delete(server.id);
                        return next;
                      });
                    }}
                    onCancel={() => xhrs.current.get(item.key)?.abort()}
                    onRetry={() => void retry(item)}
                    onSave={(fields) => {
                      if (server) void savePhoto(server.id, fields);
                    }}
                    familyId={familyId}
                    babyId={babyId}
                    index={index}
                  />
                );
              })}
            </div>
            {currentBatch?.photos.some((photo) => photo.status === 'DRAFT') ? (
              <>
                <form
                  className={styles.batchForm}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void applyBatchMetadata();
                  }}
                >
                  <div>
                    <strong>批量套用</strong>
                    <span>只更新已勾选草稿；标题仍需逐张填写。</span>
                  </div>
                  <label>
                    拍摄日期
                    <input
                      type="date"
                      value={batchDate}
                      max={localToday()}
                      onChange={(event) => setBatchDate(event.target.value)}
                    />
                  </label>
                  <label>
                    地点
                    <input
                      value={batchLocation}
                      maxLength={80}
                      onChange={(event) => setBatchLocation(event.target.value)}
                    />
                  </label>
                  <label>
                    描述
                    <textarea
                      value={batchDescription}
                      maxLength={1000}
                      onChange={(event) => setBatchDescription(event.target.value)}
                    />
                  </label>
                  <button type="submit" disabled={busy || selected.size === 0}>
                    套用到所选
                  </button>
                </form>
                <div className={styles.publishBar}>
                  <span>已选 {selected.size} 张草稿。一次发布请求会全部成功或全部不变。</span>
                  <button
                    type="button"
                    disabled={busy || selected.size === 0}
                    onClick={() => void publish()}
                  >
                    <Check size={17} />
                    发布所选
                  </button>
                </div>
              </>
            ) : null}
          </section>
        ) : null}
      </section>
      {leaveBlocker.state === 'blocked' ? (
        <ConfirmDialog
          title="离开上传页面？"
          message="仍有照片正在上传。离开后浏览器传输会中断，已完成的照片仍会继续在服务端处理。"
          onCancel={() => leaveBlocker.reset()}
          onConfirm={() => {
            xhrs.current.forEach((xhr) => xhr.abort());
            leaveBlocker.proceed();
            return Promise.resolve();
          }}
        />
      ) : null}
    </main>
  );
}

function UploadCard({
  item,
  photo,
  selected,
  onSelect,
  onCancel,
  onRetry,
  onSave,
  familyId,
  babyId,
  index,
}: {
  item: LocalFile;
  photo: PhotoSummary | undefined;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onCancel: () => void;
  onRetry: () => void;
  onSave: (fields: {
    title?: string;
    description?: string;
    capturedOn?: string;
    location?: string;
  }) => void;
  familyId: string;
  babyId: string;
  index: number;
}): React.JSX.Element {
  const [title, setTitle] = useState(photo?.title ?? '');
  const [description, setDescription] = useState(photo?.description ?? '');
  const [location, setLocation] = useState(photo?.location ?? '');
  const [capturedOn, setCapturedOn] = useState(photo?.capturedOn ?? localToday());
  const status = photo?.status;
  const draft = status === 'DRAFT';
  const safePreview = useQuery({
    queryKey: photoKeys.preview(familyId, babyId, photo?.id ?? '', 'THUMBNAIL'),
    queryFn: () => api.getPhotoPreview(familyId, babyId, photo!.id, 'THUMBNAIL'),
    enabled: Boolean(photo && ['DRAFT', 'PUBLISHED'].includes(photo.status)),
    staleTime: 4 * 60_000,
  });
  const previewUrl = safePreview.data?.url ?? item.preview;
  const stateText =
    item.status === 'uploading'
      ? `上传中 ${item.progress}%`
      : item.status === 'interrupted'
        ? '上传已中断'
        : status === 'QUEUED'
          ? '等待安全处理'
          : status === 'PROCESSING'
            ? '正在清除元数据并生成变体'
            : status === 'DRAFT'
              ? '私有草稿已就绪'
              : status === 'FAILED'
                ? '处理失败'
                : status === 'PUBLISHED'
                  ? '已发布'
                  : '等待上传';
  return (
    <article className={styles.uploadCard}>
      <div className={styles.previewBox}>
        {previewUrl ? (
          <img src={previewUrl} alt={`所选照片 ${index + 1}`} />
        ) : (
          <>
            <LoaderCircle className={status === 'PROCESSING' ? styles.spin : ''} />
            <span>{draft ? '安全缩略图暂不可用' : '安全缩略图处理中'}</span>
          </>
        )}
      </div>
      <div className={styles.cardBody}>
        <div className={styles.statusLine}>
          <strong>{stateText}</strong>
          {draft ? (
            <label>
              <input
                type="checkbox"
                checked={selected}
                onChange={(event) => onSelect(event.target.checked)}
              />
              发布
            </label>
          ) : null}
        </div>
        {item.status === 'uploading' ? (
          <>
            <progress value={item.progress} max="100" />
            <button type="button" className={styles.textButton} onClick={onCancel}>
              <X size={15} />
              取消上传
            </button>
          </>
        ) : null}
        {item.status === 'interrupted' ? (
          <button type="button" className={styles.textButton} onClick={onRetry}>
            <RefreshCw size={15} />
            重新上传
          </button>
        ) : null}
        {!item.file && status === 'AWAITING_UPLOAD' ? (
          <p className={styles.errorText}>
            刷新后浏览器不会保留原文件。请重新选择照片建立新批次，或在“我的上传”中丢弃此项目。
          </p>
        ) : null}
        {status === 'FAILED' ? (
          <p className={styles.errorText}>{failureMessage(photo?.failureCode ?? null)}</p>
        ) : null}
        {draft ? (
          <form
            className={styles.metaForm}
            onSubmit={(event) => {
              event.preventDefault();
              onSave({ title, description, location, capturedOn });
            }}
          >
            <label>
              标题（选填）
              <input
                value={title}
                maxLength={80}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label>
              拍摄日期
              <input
                type="date"
                value={capturedOn}
                max={localToday()}
                required
                onChange={(event) => setCapturedOn(event.target.value)}
              />
            </label>
            <label>
              地点（选填）
              <input
                value={location}
                maxLength={80}
                onChange={(event) => setLocation(event.target.value)}
              />
            </label>
            <label>
              描述（选填）
              <textarea
                value={description}
                maxLength={1000}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <small>
              草稿将在{' '}
              {photo?.draftExpiresAt
                ? new Date(photo.draftExpiresAt).toLocaleDateString('zh-CN')
                : '30 天后'}{' '}
              到期，编辑不会延长期限。
            </small>
            <button type="submit">保存信息</button>
          </form>
        ) : null}
      </div>
    </article>
  );
}

export function PhotoManagePage(): React.JSX.Element {
  const auth = useAuth();
  const familyId = auth.account?.activeFamilyId ?? '';
  const babyId = auth.account?.activeBabyId ?? '';
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<'mine' | 'family'>('mine');
  const [status, setStatus] = useState('');
  const [notice, setNotice] = useState<string>();
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    action: () => Promise<void>;
  }>();
  const family = useQuery({
    queryKey: ['family', familyId, 'detail'],
    queryFn: () => api.getFamily(familyId),
    enabled: Boolean(familyId),
  });
  const canManageFamily = Boolean(
    family.data && ['OWNER', 'ADMIN'].includes(family.data.currentMembership.role),
  );
  const photos = useInfiniteQuery({
    queryKey: photoKeys.manage(familyId, babyId, scope, status),
    queryFn: ({ pageParam }) =>
      api.managePhotos(familyId, babyId, {
        scope,
        ...(status
          ? { status: status as 'DRAFT' | 'PUBLISHED' | 'TRASHED' | 'PROCESSING' | 'FAILED' }
          : {}),
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(familyId && babyId && (scope === 'mine' || canManageFamily)),
    refetchInterval(query) {
      return query.state.data?.pages.some((page) =>
        page.items.some((photo) => ['QUEUED', 'PROCESSING'].includes(photo.status)),
      )
        ? 2_000
        : false;
    },
  });
  const photoItems = photos.data?.pages.flatMap((page) => page.items) ?? [];
  if (!familyId || !babyId) return <Navigate replace to="/app" />;

  async function refresh(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: ['photos', familyId, babyId] });
  }
  function act(
    title: string,
    message: string,
    action: () => Promise<unknown>,
    success: string,
  ): void {
    setConfirm({
      title,
      message,
      action: async () => {
        try {
          await action();
          await refresh();
          setNotice(success);
        } catch (error) {
          setNotice(userFacingError(error));
        }
      },
    });
  }
  return (
    <div className={styles.managePage}>
      <section className={styles.manageHero}>
        <div>
          <p className={styles.eyebrow}>照片管理</p>
          <h1>我的上传</h1>
          <p>草稿只对创建者可见；发布后家庭成员均可查看。</p>
        </div>
        <Link to="/app/photos/upload">
          <Upload size={17} />
          上传照片
        </Link>
      </section>
      {notice ? (
        <div className={styles.notice} role="status">
          {notice}
        </div>
      ) : null}
      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          aria-selected={scope === 'mine'}
          onClick={() => {
            setScope('mine');
            setStatus('');
          }}
        >
          我的上传
        </button>
        {canManageFamily ? (
          <button
            type="button"
            aria-selected={scope === 'family'}
            onClick={() => {
              setScope('family');
              setStatus('');
            }}
          >
            家庭已发布
          </button>
        ) : null}
      </div>
      <label className={styles.filter}>
        状态筛选
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">全部状态</option>
          {scope === 'mine' ? (
            <>
              <option value="PROCESSING">处理中</option>
              <option value="DRAFT">私有草稿</option>
              <option value="FAILED">处理失败</option>
            </>
          ) : null}
          <option value="PUBLISHED">已发布</option>
          <option value="TRASHED">回收站</option>
        </select>
      </label>
      {photos.isPending ? (
        <ManageState text="正在加载照片…" busy />
      ) : photos.isError ? (
        <ManageState text="照片列表加载失败，请重试。" />
      ) : photoItems.length === 0 ? (
        <ManageState text="这里还没有照片。" />
      ) : (
        <>
          <div className={styles.manageGrid}>
            {photoItems.map((photo) => (
              <ManageCard
                key={photo.id}
                familyId={familyId}
                babyId={babyId}
                photo={photo}
                canManageFamily={canManageFamily}
                onTrash={() =>
                  act(
                    '放入回收站？',
                    '照片将从普通内容中隐藏，并在 30 天后永久清理。',
                    () => api.trashPhoto(familyId, babyId, photo.id),
                    '照片已放入回收站。',
                  )
                }
                onRestore={() =>
                  void api
                    .restorePhoto(familyId, babyId, photo.id)
                    .then(refresh)
                    .then(() => setNotice('照片已恢复。'))
                    .catch((error) => {
                      setNotice(userFacingError(error));
                      void refresh();
                      void family.refetch();
                    })
                }
                onDiscard={() =>
                  act(
                    '丢弃私有项目？',
                    '对象将由后台安全清理，此操作无法恢复。',
                    () => api.discardPhoto(familyId, babyId, photo.id),
                    '已安排安全清理。',
                  )
                }
              />
            ))}
          </div>
          {photos.hasNextPage ? (
            <button
              className={styles.loadMore}
              type="button"
              disabled={photos.isFetchingNextPage}
              onClick={() => void photos.fetchNextPage()}
            >
              {photos.isFetchingNextPage ? '正在加载…' : '加载更多'}
            </button>
          ) : null}
        </>
      )}
      {confirm ? (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          onCancel={() => setConfirm(undefined)}
          onConfirm={async () => {
            const action = confirm.action;
            setConfirm(undefined);
            await action();
          }}
        />
      ) : null}
    </div>
  );
}

function ManageCard({
  familyId,
  babyId,
  photo,
  canManageFamily,
  onTrash,
  onRestore,
  onDiscard,
}: {
  familyId: string;
  babyId: string;
  photo: PhotoSummary;
  canManageFamily: boolean;
  onTrash: () => void;
  onRestore: () => void;
  onDiscard: () => void;
}): React.JSX.Element {
  const preview = useQuery({
    queryKey: photoKeys.preview(familyId, babyId, photo.id, 'THUMBNAIL'),
    queryFn: () => api.getPhotoPreview(familyId, babyId, photo.id, 'THUMBNAIL'),
    enabled: ['DRAFT', 'PUBLISHED', 'TRASHED'].includes(photo.status),
    staleTime: 4 * 60_000,
  });
  return (
    <article className={styles.manageCard}>
      <div className={styles.manageImage}>
        {preview.data ? (
          <img src={preview.data.url} alt={photo.title || '家庭照片缩略图'} />
        ) : (
          <ImageIcon size={28} />
        )}
      </div>
      <div>
        <span className={styles.statusBadge}>{statusLabel(photo.status)}</span>
        <h2>{photo.title || '未命名照片'}</h2>
        <p>
          {photo.capturedOn} {photo.location ? `· ${photo.location}` : ''}
        </p>
        {photo.status === 'DRAFT' && photo.draftExpiresAt ? (
          <small>{new Date(photo.draftExpiresAt).toLocaleDateString('zh-CN')} 到期</small>
        ) : null}
        {photo.status === 'TRASHED' && photo.purgeAfter ? (
          <small>{new Date(photo.purgeAfter).toLocaleDateString('zh-CN')} 永久清理</small>
        ) : null}
        <div className={styles.cardActions}>
          {['AWAITING_UPLOAD', 'QUEUED', 'PROCESSING', 'DRAFT', 'FAILED'].includes(photo.status) ? (
            <Link to={`/app/photos/upload?batchId=${encodeURIComponent(photo.batchId)}`}>
              查看上传批次
            </Link>
          ) : null}
          {photo.status === 'PUBLISHED' ? (
            <button type="button" onClick={onTrash}>
              <Trash2 size={15} />
              回收
            </button>
          ) : null}
          {photo.status === 'TRASHED' && photo.canRestore ? (
            <button type="button" onClick={onRestore}>
              <RotateCcw size={15} />
              恢复
            </button>
          ) : null}
          {['DRAFT', 'FAILED', 'AWAITING_UPLOAD', 'QUEUED', 'PROCESSING'].includes(photo.status) ? (
            <button type="button" onClick={onDiscard}>
              <Trash2 size={15} />
              丢弃
            </button>
          ) : null}
        </div>
        {photo.status === 'TRASHED' && !photo.canRestore ? (
          <p role="status">
            {canManageFamily
              ? '恢复期限已过，无法恢复。'
              : '此照片不可自行恢复；若仍在恢复期，请联系家庭管理员。'}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function statusLabel(status: PhotoSummary['status']): string {
  return (
    {
      AWAITING_UPLOAD: '待上传',
      QUEUED: '等待处理',
      PROCESSING: '处理中',
      DRAFT: '私有草稿',
      PUBLISHED: '已发布',
      TRASHED: '回收站',
      FAILED: '处理失败',
    } as const
  )[status];
}
function failureMessage(code: string | null): string {
  const messages: Record<string, string> = {
    PHOTO_FORMAT_UNSUPPORTED: '文件真实格式不受支持。',
    PHOTO_ANIMATION_UNSUPPORTED: '暂不支持动画或多图照片。',
    PHOTO_PIXEL_LIMIT_EXCEEDED: '照片像素超过 5000 万。',
    PHOTO_DIMENSIONS_UNSUPPORTED: '照片单边尺寸超过处理上限。',
    PHOTO_PROCESSING_FAILED: '照片内容损坏或无法安全处理。',
  };
  return code
    ? (messages[code] ?? '照片处理失败，请重新选择文件。')
    : '照片处理失败，请重新选择文件。';
}
function ManageState({ text, busy = false }: { text: string; busy?: boolean }): React.JSX.Element {
  return (
    <div className={styles.manageState} aria-live="polite" aria-busy={busy}>
      {busy ? <LoaderCircle className={styles.spin} /> : <Images />}
      <p>{text}</p>
    </div>
  );
}
