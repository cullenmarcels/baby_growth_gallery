import type { PhotoSummary, PublishedPhotoDetail } from '@baby-growth-gallery/api-client';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Trash2,
  Upload,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { api } from './api';
import { babyKeys } from './baby-query';
import { ConfirmDialog } from './FamilyApp';
import { photoKeys } from './photo-query';
import styles from './PhotoBrowse.module.css';
import { userFacingError } from './user-facing-error';

const PAGE_SIZE = 24;

function useScope(): { familyId: string; babyId: string } {
  const auth = useAuth();
  return {
    familyId: auth.account?.activeFamilyId ?? '',
    babyId: auth.account?.activeBabyId ?? '',
  };
}

function usePublished(familyId: string, babyId: string) {
  return useInfiniteQuery({
    queryKey: photoKeys.published(familyId, babyId),
    queryFn: ({ pageParam }) =>
      api.listPublishedPhotos(familyId, babyId, {
        limit: PAGE_SIZE,
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: '',
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: Boolean(familyId && babyId),
  });
}

function useTimeline(familyId: string, babyId: string) {
  return useInfiniteQuery({
    queryKey: photoKeys.timeline(familyId, babyId),
    queryFn: ({ pageParam }) =>
      api.listTimeline(familyId, babyId, {
        limit: PAGE_SIZE,
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: '',
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: Boolean(familyId && babyId),
  });
}

function SignedPhoto({
  familyId,
  babyId,
  photoId,
  variant,
  alt,
  retryButton = false,
}: {
  familyId: string;
  babyId: string;
  photoId: string;
  variant: 'THUMBNAIL' | 'DISPLAY';
  alt: string;
  retryButton?: boolean;
}): React.JSX.Element {
  const [failedUrl, setFailedUrl] = useState<string>();
  const preview = useQuery({
    queryKey: photoKeys.preview(familyId, babyId, photoId, variant),
    queryFn: () => api.getPhotoPreview(familyId, babyId, photoId, variant),
    staleTime: 4 * 60_000,
    refetchInterval: 4 * 60_000,
  });
  const url = preview.data?.url;
  if (preview.isError || (url && url === failedUrl)) {
    return (
      <span className={styles.imageFallback} role="img" aria-label="照片预览暂不可用">
        <ImageIcon size={28} />
        预览暂不可用
        {retryButton ? (
          <button
            type="button"
            onClick={() => {
              setFailedUrl(undefined);
              void preview.refetch();
            }}
          >
            重试
          </button>
        ) : null}
      </span>
    );
  }
  return url ? (
    <img
      src={url}
      alt={alt}
      onError={() => {
        setFailedUrl(url);
        void preview.refetch();
      }}
    />
  ) : (
    <span className={styles.imageFallback} role="status">
      正在加载预览…
    </span>
  );
}

function PhotoTile({
  familyId,
  babyId,
  photo,
  naturalAspectRatio = false,
}: {
  familyId: string;
  babyId: string;
  photo: PhotoSummary;
  naturalAspectRatio?: boolean;
}): React.JSX.Element {
  return (
    <Link
      className={styles.tile}
      to={`/app/photos/${photo.id}`}
      aria-label={`查看照片：${photo.title || photo.capturedOn}`}
    >
      <span
        className={styles.tileImage}
        style={
          naturalAspectRatio && photo.width && photo.height
            ? { aspectRatio: `${photo.width} / ${photo.height}` }
            : undefined
        }
      >
        <SignedPhoto
          familyId={familyId}
          babyId={babyId}
          photoId={photo.id}
          variant="THUMBNAIL"
          alt={photo.title || '家庭照片'}
        />
      </span>
      <span className={styles.tileMeta}>
        <strong>{photo.title || '成长照片'}</strong>
        <time dateTime={photo.capturedOn}>{photo.capturedOn}</time>
      </span>
    </Link>
  );
}

function MasonryItem({ children }: { children: React.ReactNode }): React.JSX.Element {
  const itemRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const item = itemRef.current;
    const content = contentRef.current;
    const grid = item?.parentElement;
    if (!item || !content || !grid) return;
    const measure = () => {
      const gridStyle = getComputedStyle(grid);
      const rowHeight = Number.parseFloat(gridStyle.gridAutoRows);
      const gap = Number.parseFloat(gridStyle.rowGap);
      if (!rowHeight || Number.isNaN(gap)) return;
      const span = Math.max(
        1,
        Math.ceil((content.getBoundingClientRect().height + gap) / (rowHeight + gap)),
      );
      item.style.gridRowEnd = `span ${span}`;
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={itemRef} className={styles.galleryGridItem}>
      <div ref={contentRef}>{children}</div>
    </div>
  );
}

function BrowseState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}): React.JSX.Element {
  return (
    <div className={styles.state} role={onRetry ? 'alert' : 'status'}>
      <ImageIcon size={30} aria-hidden="true" />
      <p>{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry}>
          重试
        </button>
      ) : null}
    </div>
  );
}

export function GalleryPage(): React.JSX.Element {
  const { familyId, babyId } = useScope();
  const photos = usePublished(familyId, babyId);
  const items = photos.data?.pages.flatMap((page) => page.items) ?? [];
  if (!familyId || !babyId) return <Navigate replace to="/app" />;
  return (
    <section className={styles.page}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>家庭记忆</p>
          <h1>图集</h1>
          <p>按拍摄日浏览当前宝宝已发布的照片。</p>
        </div>
        <Link className={styles.actionLink} to="/app/photos/upload">
          <Upload size={17} />
          上传照片
        </Link>
      </header>
      {photos.isPending ? (
        <BrowseState message="正在加载图集…" />
      ) : photos.isError && items.length === 0 ? (
        <BrowseState
          message={userFacingError(photos.error, '图集加载失败，请重试。')}
          onRetry={() => void photos.refetch()}
        />
      ) : items.length === 0 ? (
        <BrowseState message="还没有已发布照片。上传并发布后就能在这里看到。" />
      ) : (
        <>
          <div className={styles.galleryGrid}>
            {items.map((photo) => (
              <MasonryItem key={photo.id}>
                <PhotoTile familyId={familyId} babyId={babyId} photo={photo} naturalAspectRatio />
              </MasonryItem>
            ))}
          </div>
          {photos.isError ? (
            <BrowseState
              message="更多照片加载失败，请重试。"
              onRetry={() => void photos.fetchNextPage()}
            />
          ) : null}
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
    </section>
  );
}

export function TimelinePage(): React.JSX.Element {
  const { familyId, babyId } = useScope();
  const timeline = useTimeline(familyId, babyId);
  const entries = timeline.data?.pages.flatMap((page) => page.items) ?? [];
  const months = new Map<string, PhotoSummary[]>();
  for (const entry of entries) {
    const month = entry.eventOn.slice(0, 7);
    months.set(month, [...(months.get(month) ?? []), entry.photo]);
  }
  if (!familyId || !babyId) return <Navigate replace to="/app" />;
  return (
    <section className={styles.page}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>成长足迹</p>
          <h1>时间轴</h1>
          <p>沿着拍摄日期，重温真实的成长照片。</p>
        </div>
      </header>
      {timeline.isPending ? (
        <BrowseState message="正在加载时间轴…" />
      ) : timeline.isError && entries.length === 0 ? (
        <BrowseState
          message={userFacingError(timeline.error, '时间轴加载失败，请重试。')}
          onRetry={() => void timeline.refetch()}
        />
      ) : entries.length === 0 ? (
        <BrowseState message="时间轴里还没有已发布照片。" />
      ) : (
        <>
          {[...months].map(([month, photos]) => (
            <section className={styles.month} key={month} aria-label={`${month} 的照片`}>
              <h2>{month.replace('-', ' 年 ')} 月</h2>
              <div className={styles.grid}>
                {photos.map((photo) => (
                  <PhotoTile key={photo.id} familyId={familyId} babyId={babyId} photo={photo} />
                ))}
              </div>
            </section>
          ))}
          {timeline.isError ? (
            <BrowseState
              message="更多时间轴照片加载失败，请重试。"
              onRetry={() => void timeline.fetchNextPage()}
            />
          ) : null}
          {timeline.hasNextPage ? (
            <button
              className={styles.loadMore}
              type="button"
              disabled={timeline.isFetchingNextPage}
              onClick={() => void timeline.fetchNextPage()}
            >
              {timeline.isFetchingNextPage ? '正在加载…' : '加载更多'}
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}

export function PhotoDetailPage(): React.JSX.Element {
  const { familyId, babyId } = useScope();
  const photoId = useParams().photoId ?? '';
  const [removedId, setRemovedId] = useState<string>();
  const queryClient = useQueryClient();
  const detail = useQuery({
    queryKey: photoKeys.detail(familyId, babyId, photoId),
    queryFn: () => api.getPublishedPhoto(familyId, babyId, photoId),
    enabled: Boolean(familyId && babyId && photoId),
    refetchOnWindowFocus: true,
  });
  useEffect(() => {
    if (!detail.isError) return;
    void queryClient.invalidateQueries({ queryKey: photoKeys.published(familyId, babyId) });
    void queryClient.invalidateQueries({ queryKey: photoKeys.timeline(familyId, babyId) });
  }, [detail.isError, familyId, babyId, queryClient]);
  if (!familyId || !babyId) return <Navigate replace to="/app" />;
  return (
    <section className={styles.page}>
      <Link className={styles.back} to="/app/gallery">
        <ArrowLeft size={17} />
        返回图集
      </Link>
      {removedId === photoId ? (
        <BrowseState message="照片已放入回收站，图集与时间轴已更新。" />
      ) : detail.isPending ? (
        <BrowseState message="正在加载照片详情…" />
      ) : detail.isError ? (
        <BrowseState
          message={userFacingError(detail.error, '这张照片已不可用，请刷新图集。')}
          onRetry={() => void detail.refetch()}
        />
      ) : (
        <DetailContent
          key={detail.data.photo.id}
          familyId={familyId}
          babyId={babyId}
          data={detail.data}
          onTrashed={() => setRemovedId(photoId)}
        />
      )}
    </section>
  );
}

function DetailContent({
  familyId,
  babyId,
  data,
  onTrashed,
}: {
  familyId: string;
  babyId: string;
  data: PublishedPhotoDetail;
  onTrashed: () => void;
}): React.JSX.Element {
  const { photo, previousPhotoId, nextPhotoId, canManage } = data;
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(photo.title ?? '');
  const [description, setDescription] = useState(photo.description ?? '');
  const [capturedOn, setCapturedOn] = useState(photo.capturedOn);
  const [location, setLocation] = useState(photo.location ?? '');
  const [busy, setBusy] = useState(false);
  const [confirmTrash, setConfirmTrash] = useState(false);
  const [notice, setNotice] = useState<string>();
  async function refresh(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: ['photos', familyId, babyId] });
    await queryClient.invalidateQueries({ queryKey: babyKeys.all });
  }
  async function save(): Promise<void> {
    setBusy(true);
    try {
      await api.updatePhoto(familyId, babyId, photo.id, {
        title: title.trim() || null,
        description: description.trim() || null,
        capturedOn,
        location: location.trim() || null,
      });
      await refresh();
      setEditing(false);
      setNotice('照片信息已保存，顺序已更新。');
    } catch (error) {
      setNotice(userFacingError(error, '保存失败，请刷新后重试。'));
      await refresh();
    } finally {
      setBusy(false);
    }
  }
  async function trash(): Promise<void> {
    setConfirmTrash(false);
    setBusy(true);
    try {
      await api.trashPhoto(familyId, babyId, photo.id);
      onTrashed();
      await refresh();
    } catch (error) {
      setNotice(userFacingError(error, '回收失败，请刷新后重试。'));
      await refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className={styles.detail}>
      <div className={styles.detailImage}>
        <SignedPhoto
          familyId={familyId}
          babyId={babyId}
          photoId={photo.id}
          variant="DISPLAY"
          alt={photo.title || '家庭照片'}
          retryButton
        />
      </div>
      <div className={styles.detailBody}>
        {notice ? (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        ) : null}
        <div className={styles.detailHeading}>
          <div>
            <p className={styles.eyebrow}>照片详情</p>
            <h1>{photo.title || '成长照片'}</h1>
          </div>
          {canManage ? (
            <div className={styles.actions}>
              <button type="button" disabled={busy} onClick={() => setEditing((value) => !value)}>
                编辑信息
              </button>
              <button type="button" disabled={busy} onClick={() => setConfirmTrash(true)}>
                <Trash2 size={16} />
                回收
              </button>
            </div>
          ) : null}
        </div>
        {editing && canManage ? (
          <form
            className={styles.editForm}
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <label>
              标题
              <input
                maxLength={80}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label>
              描述
              <textarea
                maxLength={1000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <label>
              拍摄日期
              <input
                required
                type="date"
                value={capturedOn}
                onChange={(event) => setCapturedOn(event.target.value)}
              />
            </label>
            <label>
              地点
              <input
                maxLength={80}
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              />
            </label>
            <div className={styles.actions}>
              <button type="button" onClick={() => setEditing(false)}>
                取消
              </button>
              <button type="submit" disabled={busy}>
                {busy ? '正在保存…' : '保存'}
              </button>
            </div>
          </form>
        ) : (
          <div className={styles.metadata}>
            <p>{photo.description || '暂无描述'}</p>
            <dl>
              <dt>拍摄日期</dt>
              <dd>{photo.capturedOn}</dd>
              <dt>地点</dt>
              <dd>{photo.location || '未填写'}</dd>
            </dl>
          </div>
        )}
        <nav className={styles.neighbors} aria-label="浏览相邻照片">
          {previousPhotoId ? (
            <Link to={`/app/photos/${previousPhotoId}`}>
              <ChevronLeft size={17} />
              上一张
            </Link>
          ) : (
            <span aria-disabled="true">
              <ChevronLeft size={17} />
              上一张
            </span>
          )}
          {nextPhotoId ? (
            <Link to={`/app/photos/${nextPhotoId}`}>
              下一张
              <ChevronRight size={17} />
            </Link>
          ) : (
            <span aria-disabled="true">
              下一张
              <ChevronRight size={17} />
            </span>
          )}
        </nav>
      </div>
      {confirmTrash ? (
        <ConfirmDialog
          title="放入回收站？"
          message="照片会从图集和时间轴隐藏；若它是宝宝头像，头像会恢复为昵称占位。"
          onCancel={() => setConfirmTrash(false)}
          onConfirm={trash}
        />
      ) : null}
    </article>
  );
}

export function BabyAvatarPickerPage(): React.JSX.Element {
  const { familyId, babyId } = useScope();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const family = useQuery({
    queryKey: ['family', familyId, 'detail'],
    queryFn: () => api.getFamily(familyId),
    enabled: Boolean(familyId),
  });
  const baby = useQuery({
    queryKey: babyKeys.detail(familyId, babyId),
    queryFn: () => api.getBaby(familyId, babyId),
    enabled: Boolean(familyId && babyId),
  });
  const photos = usePublished(familyId, babyId);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();
  const canManage = Boolean(
    family.data && ['OWNER', 'ADMIN'].includes(family.data.currentMembership.role),
  );
  const items = photos.data?.pages.flatMap((page) => page.items) ?? [];
  if (!familyId || !babyId) return <Navigate replace to="/app" />;
  async function select(photoId: string | null): Promise<void> {
    setBusy(true);
    setNotice(undefined);
    try {
      await api.setBabyAvatar(familyId, babyId, photoId);
      await queryClient.invalidateQueries({ queryKey: babyKeys.all });
      await navigate('/app/babies/manage');
    } catch (error) {
      setNotice(userFacingError(error, '设置头像失败，请刷新后重试。'));
      void family.refetch();
      void baby.refetch();
      void photos.refetch();
    } finally {
      setBusy(false);
    }
  }
  if (family.isPending || baby.isPending) return <BrowseState message="正在读取宝宝与家庭权限…" />;
  if (family.isError || baby.isError)
    return (
      <BrowseState
        message="宝宝或家庭状态已变化，请重新进入。"
        onRetry={() => {
          void family.refetch();
          void baby.refetch();
        }}
      />
    );
  if (!canManage) return <BrowseState message="只有家庭创建者或管理员可以设置宝宝头像。" />;
  return (
    <section className={styles.page}>
      <Link className={styles.back} to="/app/babies/manage">
        <ArrowLeft size={17} />
        返回宝宝档案
      </Link>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>宝宝档案</p>
          <h1>选择头像</h1>
          <p>从当前宝宝已发布的照片中选择，头像会居中显示。</p>
        </div>
        {baby.data.avatarPhotoId ? (
          <button
            className={styles.actionLink}
            type="button"
            disabled={busy}
            onClick={() => void select(null)}
          >
            清除头像
          </button>
        ) : null}
      </header>
      {notice ? (
        <p className={styles.notice} role="alert">
          {notice}
        </p>
      ) : null}
      {photos.isPending ? (
        <BrowseState message="正在加载可选照片…" />
      ) : photos.isError && items.length === 0 ? (
        <BrowseState message="照片加载失败，请重试。" onRetry={() => void photos.refetch()} />
      ) : items.length === 0 ? (
        <BrowseState message="当前宝宝还没有已发布照片。请先上传并发布。" />
      ) : (
        <>
          <div className={styles.grid}>
            {items.map((photo) => (
              <button
                className={styles.pickerTile}
                key={photo.id}
                type="button"
                disabled={busy}
                aria-pressed={baby.data.avatarPhotoId === photo.id}
                onClick={() => void select(photo.id)}
              >
                <span className={styles.tileImage}>
                  <SignedPhoto
                    familyId={familyId}
                    babyId={babyId}
                    photoId={photo.id}
                    variant="THUMBNAIL"
                    alt={photo.title || '可选头像照片'}
                  />
                </span>
                <span>
                  {photo.title || photo.capturedOn}
                  {baby.data.avatarPhotoId === photo.id ? ' · 当前头像' : ''}
                </span>
              </button>
            ))}
          </div>
          {photos.isError ? (
            <BrowseState
              message="更多照片加载失败，请重试。"
              onRetry={() => void photos.fetchNextPage()}
            />
          ) : null}
          {photos.hasNextPage ? (
            <button
              className={styles.loadMore}
              type="button"
              disabled={photos.isFetchingNextPage || busy}
              onClick={() => void photos.fetchNextPage()}
            >
              {photos.isFetchingNextPage ? '正在加载…' : '加载更多'}
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}
