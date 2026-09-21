import type {
  MilestoneDetail,
  MilestoneSummary,
  PhotoSummary,
} from '@baby-growth-gallery/api-client';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Image as ImageIcon,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { api } from './api';
import { babyKeys } from './baby-query';
import { ConfirmDialog } from './FamilyApp';
import { milestoneKeys } from './milestone-query';
import { photoKeys } from './photo-query';
import styles from './MilestoneApp.module.css';
import { userFacingError } from './user-facing-error';

const PAGE_SIZE = 20;

function useScope(): { familyId: string; babyId: string } {
  const auth = useAuth();
  return {
    familyId: auth.account?.activeFamilyId ?? '',
    babyId: auth.account?.activeBabyId ?? '',
  };
}

function localToday(): string {
  const date = new Date();
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function useMilestoneList(familyId: string, babyId: string, state: 'PENDING' | 'COMPLETED') {
  return useInfiniteQuery({
    queryKey: milestoneKeys.list(familyId, babyId, state),
    queryFn: ({ pageParam }) =>
      api.listMilestones(familyId, babyId, {
        state,
        limit: PAGE_SIZE,
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: '',
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: Boolean(familyId && babyId),
  });
}

function StateCard({ message, retry }: { message: string; retry?: () => void }): React.JSX.Element {
  return (
    <div className={styles.state} role={retry ? 'alert' : 'status'}>
      <Sparkles size={28} aria-hidden="true" />
      <p>{message}</p>
      {retry ? <button onClick={retry}>重试</button> : null}
    </div>
  );
}

function MilestoneCard({ item }: { item: MilestoneSummary }): React.JSX.Element {
  return (
    <Link className={styles.card} to={`/app/milestones/${item.id}`}>
      <span className={item.state === 'COMPLETED' ? styles.doneIcon : styles.pendingIcon}>
        {item.state === 'COMPLETED' ? <Check size={18} /> : <CalendarDays size={18} />}
      </span>
      <span className={styles.cardBody}>
        <strong>{item.title}</strong>
        <span>{item.source === 'TEMPLATE' ? '固定模板' : '自定义'}</span>
        {item.state === 'COMPLETED' ? (
          <time dateTime={item.completedOn ?? undefined}>完成于 {item.completedOn}</time>
        ) : item.reminderOn ? (
          <time dateTime={item.reminderOn}>提醒日 {item.reminderOn}</time>
        ) : (
          <span>未设置提醒</span>
        )}
      </span>
      {item.photoCount ? <span className={styles.photoCount}>{item.photoCount} 张照片</span> : null}
    </Link>
  );
}

export function MilestonePage(): React.JSX.Element {
  const { familyId, babyId } = useScope();
  const today = localToday();
  const [tab, setTab] = useState<'PENDING' | 'COMPLETED'>('PENDING');
  const overview = useInfiniteQuery({
    queryKey: milestoneKeys.overview(familyId, babyId, today),
    queryFn: ({ pageParam }) =>
      api.getMilestoneOverview(familyId, babyId, {
        fromOn: today,
        limit: 8,
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: '',
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: Boolean(familyId && babyId),
  });
  const pending = useMilestoneList(familyId, babyId, 'PENDING');
  const completed = useMilestoneList(familyId, babyId, 'COMPLETED');
  const current = tab === 'PENDING' ? pending : completed;
  const items = current.data?.pages.flatMap((page) => page.items) ?? [];
  const recent = completed.data?.pages[0]?.items.slice(0, 3) ?? [];
  const progress = overview.data?.pages[0]?.progress;
  const reminders = overview.data?.pages.flatMap((page) => page.reminders) ?? [];
  if (!familyId || !babyId) return <Navigate replace to="/app" />;
  return (
    <section className={styles.page}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>成长清单</p>
          <h1>里程碑</h1>
          <p>记录家人共同见证的每一个成长瞬间。</p>
        </div>
        <Link className={styles.primaryAction} to="/app/milestones/new">
          <Plus size={17} />
          添加里程碑
        </Link>
      </header>

      {overview.isPending ? (
        <StateCard message="正在读取成长进度…" />
      ) : overview.isError && !overview.data ? (
        <StateCard
          message={userFacingError(overview.error, '成长进度加载失败，请重试。')}
          retry={() => void overview.refetch()}
        />
      ) : (
        <div className={styles.overviewGrid}>
          <article className={styles.progressCard}>
            <p>完成进度</p>
            <strong>
              {progress?.completed ?? 0} / {progress?.total ?? 0}
            </strong>
            <span>已完成 {progress?.completed ?? 0} 项</span>
          </article>
          <article className={styles.summaryCard}>
            <h2>日期提醒</h2>
            {reminders.length ? (
              <ul>
                {reminders.map((item) => (
                  <li key={item.id}>
                    <Link to={`/app/milestones/${item.id}`}>{item.title}</Link>
                    <time dateTime={item.reminderOn ?? undefined}>
                      {item.reminderOn === today ? '今天' : item.reminderOn}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.muted}>今天和未来没有待提醒项目。</p>
            )}
            {overview.hasNextPage ? (
              <button
                className={styles.summaryMore}
                disabled={overview.isFetchingNextPage}
                onClick={() => void overview.fetchNextPage()}
              >
                {overview.isFetchingNextPage ? '加载中…' : '加载更多'}
              </button>
            ) : null}
            {overview.isFetchNextPageError ? (
              <p className={styles.inlineError} role="alert">
                更多提醒加载失败，请重试。
              </p>
            ) : null}
          </article>
          <article className={styles.summaryCard}>
            <h2>最近完成</h2>
            {recent.length ? (
              <ul>
                {recent.map((item) => (
                  <li key={item.id}>
                    <Link to={`/app/milestones/${item.id}`}>{item.title}</Link>
                    <time dateTime={item.completedOn ?? undefined}>{item.completedOn}</time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.muted}>还没有已完成的里程碑。</p>
            )}
          </article>
        </div>
      )}

      <div className={styles.tabs} role="tablist" aria-label="里程碑列表">
        <button role="tab" aria-selected={tab === 'PENDING'} onClick={() => setTab('PENDING')}>
          清单
        </button>
        <button role="tab" aria-selected={tab === 'COMPLETED'} onClick={() => setTab('COMPLETED')}>
          已完成
        </button>
      </div>
      {current.isPending ? (
        <StateCard message="正在加载里程碑…" />
      ) : current.isError && !items.length ? (
        <StateCard
          message={userFacingError(current.error, '里程碑加载失败，请重试。')}
          retry={() => void current.refetch()}
        />
      ) : !items.length ? (
        <StateCard
          message={tab === 'PENDING' ? '清单还是空的，可以先添加一项。' : '还没有已完成的里程碑。'}
        />
      ) : (
        <>
          <div className={styles.listGrid}>
            {items.map((item) => (
              <MilestoneCard item={item} key={item.id} />
            ))}
          </div>
          {current.isFetchNextPageError ? (
            <p className={styles.notice} role="alert">
              更多项目加载失败，请重试。
            </p>
          ) : null}
          {current.hasNextPage ? (
            <button
              className={styles.loadMore}
              disabled={current.isFetchingNextPage}
              onClick={() => void current.fetchNextPage()}
            >
              {current.isFetchingNextPage ? '加载中…' : '加载更多'}
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}

export function MilestoneNewPage(): React.JSX.Element {
  const { familyId, babyId } = useScope();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'TEMPLATE' | 'CUSTOM'>('TEMPLATE');
  const [title, setTitle] = useState('');
  const [reminderOn, setReminderOn] = useState('');
  const [busyKey, setBusyKey] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const templates = useQuery({
    queryKey: milestoneKeys.templates(familyId, babyId),
    queryFn: () => api.listMilestoneTemplates(familyId, babyId),
    enabled: Boolean(familyId && babyId),
  });
  if (!familyId || !babyId) return <Navigate replace to="/app" />;

  async function create(
    body:
      | { source: 'TEMPLATE'; templateKey: string; reminderOn?: string }
      | { source: 'CUSTOM'; title: string; reminderOn?: string },
  ): Promise<void> {
    setBusyKey(body.source === 'TEMPLATE' ? body.templateKey : 'CUSTOM');
    setNotice(undefined);
    try {
      const created = await api.createMilestone(familyId, babyId, body);
      await queryClient.invalidateQueries({ queryKey: milestoneKeys.all });
      await navigate(`/app/milestones/${created.id}`);
    } catch (error) {
      setNotice(userFacingError(error, '添加失败，请检查内容后重试。'));
      void templates.refetch();
    } finally {
      setBusyKey(undefined);
    }
  }

  return (
    <section className={styles.page}>
      <Link className={styles.back} to="/app/milestones">
        <ArrowLeft size={17} />
        返回清单
      </Link>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>成长清单</p>
          <h1>添加里程碑</h1>
          <p>从固定模板开始，或记录属于宝宝的独特瞬间。</p>
        </div>
      </header>
      <div className={styles.tabs} role="tablist" aria-label="添加方式">
        <button role="tab" aria-selected={mode === 'TEMPLATE'} onClick={() => setMode('TEMPLATE')}>
          模板
        </button>
        <button role="tab" aria-selected={mode === 'CUSTOM'} onClick={() => setMode('CUSTOM')}>
          自定义
        </button>
      </div>
      <label className={styles.field}>
        提醒日期（可选）
        <input
          type="date"
          min={localToday()}
          value={reminderOn}
          onChange={(event) => setReminderOn(event.target.value)}
        />
      </label>
      {notice ? (
        <p className={styles.notice} role="alert">
          {notice}
        </p>
      ) : null}
      {mode === 'TEMPLATE' ? (
        templates.isPending ? (
          <StateCard message="正在加载模板…" />
        ) : templates.isError ? (
          <StateCard message="模板加载失败，请重试。" retry={() => void templates.refetch()} />
        ) : (
          <div className={styles.templateGrid}>
            {templates.data.items.map((item) => (
              <article className={styles.templateCard} key={item.key}>
                <Sparkles size={20} aria-hidden="true" />
                <strong>{item.title}</strong>
                <button
                  disabled={item.isAdded || Boolean(busyKey)}
                  onClick={() =>
                    void create({
                      source: 'TEMPLATE',
                      templateKey: item.key,
                      ...(reminderOn ? { reminderOn } : {}),
                    })
                  }
                >
                  {item.isAdded ? '已加入' : busyKey === item.key ? '添加中…' : '加入'}
                </button>
              </article>
            ))}
          </div>
        )
      ) : (
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            const clean = title.trim();
            if (!clean) {
              setNotice('请输入里程碑标题。');
              return;
            }
            void create({ source: 'CUSTOM', title: clean, ...(reminderOn ? { reminderOn } : {}) });
          }}
        >
          <label className={styles.field}>
            标题
            <input
              maxLength={40}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </label>
          <div className={styles.actions}>
            <Link to="/app/milestones">取消</Link>
            <button className={styles.primaryButton} disabled={Boolean(busyKey)}>
              {busyKey ? '保存中…' : '保存'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function SignedThumbnail({
  familyId,
  babyId,
  photo,
  selected,
  toggle,
}: {
  familyId: string;
  babyId: string;
  photo: Pick<PhotoSummary, 'id' | 'title' | 'capturedOn'>;
  selected: boolean;
  toggle: () => void;
}): React.JSX.Element {
  const [failedUrl, setFailedUrl] = useState<string>();
  const preview = useQuery({
    queryKey: photoKeys.preview(familyId, babyId, photo.id, 'THUMBNAIL'),
    queryFn: () => api.getPhotoPreview(familyId, babyId, photo.id, 'THUMBNAIL'),
    staleTime: 4 * 60_000,
  });
  const url = preview.data?.url;
  const unavailable = preview.isError || Boolean(url && url === failedUrl);
  return (
    <button className={styles.photoOption} type="button" aria-pressed={selected} onClick={toggle}>
      {url && !unavailable ? (
        <img
          src={url}
          alt={photo.title || '里程碑照片'}
          onError={() => {
            setFailedUrl(url);
            void preview.refetch();
          }}
        />
      ) : (
        <span>
          <ImageIcon size={24} />
          {unavailable ? '预览不可用' : '预览加载中'}
        </span>
      )}
      <strong>{photo.title || photo.capturedOn}</strong>
      {selected ? (
        <i>
          <Check size={15} />
          已选择
        </i>
      ) : null}
    </button>
  );
}

function PhotoPicker({
  familyId,
  babyId,
  selected,
  close,
  change,
}: {
  familyId: string;
  babyId: string;
  selected: string[];
  close: () => void;
  change: (ids: string[]) => void;
}): React.JSX.Element {
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const photos = useInfiniteQuery({
    queryKey: photoKeys.published(familyId, babyId),
    queryFn: ({ pageParam }) =>
      api.listPublishedPhotos(familyId, babyId, {
        limit: 24,
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: '',
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const items = photos.data?.pages.flatMap((page) => page.items) ?? [];
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButton.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key !== 'Tab') return;
      const controls = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled)');
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      previous?.focus();
    };
  }, [close]);
  return (
    <div className={styles.backdrop} role="presentation">
      <div
        className={styles.picker}
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-picker-title"
      >
        <header>
          <div>
            <h2 id="photo-picker-title">选择照片</h2>
            <p>已选择 {selected.length} / 10 张</p>
          </div>
          <button ref={closeButton} onClick={close} aria-label="关闭照片选择">
            <X size={20} />
          </button>
        </header>
        {photos.isPending ? (
          <StateCard message="正在加载照片…" />
        ) : photos.isError && !items.length ? (
          <StateCard message="照片加载失败，请重试。" retry={() => void photos.refetch()} />
        ) : !items.length ? (
          <StateCard message="当前宝宝还没有已发布照片。" />
        ) : (
          <div className={styles.photoGrid}>
            {items.map((photo) => (
              <SignedThumbnail
                key={photo.id}
                familyId={familyId}
                babyId={babyId}
                photo={photo}
                selected={selected.includes(photo.id)}
                toggle={() => {
                  if (selected.includes(photo.id)) change(selected.filter((id) => id !== photo.id));
                  else if (selected.length < 10) change([...selected, photo.id]);
                }}
              />
            ))}
          </div>
        )}
        <footer>
          {photos.hasNextPage ? (
            <button
              disabled={photos.isFetchingNextPage}
              onClick={() => void photos.fetchNextPage()}
            >
              {photos.isFetchingNextPage ? '加载中…' : '加载更多'}
            </button>
          ) : (
            <span />
          )}
          <button className={styles.primaryButton} onClick={close}>
            完成选择
          </button>
        </footer>
      </div>
    </div>
  );
}

function DetailPhoto({
  familyId,
  babyId,
  photo,
}: {
  familyId: string;
  babyId: string;
  photo: MilestoneDetail['photos'][number];
}): React.JSX.Element {
  const [failedUrl, setFailedUrl] = useState<string>();
  const preview = useQuery({
    queryKey: photoKeys.preview(familyId, babyId, photo.id, 'THUMBNAIL'),
    queryFn: () => api.getPhotoPreview(familyId, babyId, photo.id, 'THUMBNAIL'),
    staleTime: 4 * 60_000,
  });
  const url = preview.data?.url;
  const unavailable = preview.isError || Boolean(url && url === failedUrl);
  return (
    <Link className={styles.detailPhoto} to={`/app/photos/${photo.id}`}>
      {url && !unavailable ? (
        <img
          src={url}
          alt={photo.title || '关联照片'}
          onError={() => {
            setFailedUrl(url);
            void preview.refetch();
          }}
        />
      ) : (
        <span>
          <ImageIcon size={24} />
          {unavailable ? '预览不可用' : '预览加载中'}
        </span>
      )}
      <strong>{photo.title || photo.capturedOn}</strong>
    </Link>
  );
}

export function MilestoneDetailPage(): React.JSX.Element {
  const { familyId, babyId } = useScope();
  const milestoneId = useParams().milestoneId ?? '';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<'item' | 'completion'>();
  const [title, setTitle] = useState('');
  const [reminderOn, setReminderOn] = useState('');
  const [reminderTouched, setReminderTouched] = useState(false);
  const [completedOn, setCompletedOn] = useState(localToday());
  const [note, setNote] = useState('');
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const [picker, setPicker] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();
  const closePicker = useCallback(() => setPicker(false), []);
  const detail = useQuery({
    queryKey: milestoneKeys.detail(familyId, babyId, milestoneId),
    queryFn: () => api.getMilestone(familyId, babyId, milestoneId),
    enabled: Boolean(familyId && babyId && milestoneId),
    refetchOnWindowFocus: true,
  });
  const baby = useQuery({
    queryKey: babyKeys.detail(familyId, babyId),
    queryFn: () => api.getBaby(familyId, babyId),
    enabled: Boolean(familyId && babyId),
  });
  if (!familyId || !babyId) return <Navigate replace to="/app" />;
  const item = detail.data;

  function startItemEdit(value: MilestoneDetail): void {
    setTitle(value.title);
    setReminderOn(value.reminderOn ?? '');
    setReminderTouched(false);
    setEditing('item');
    setNotice(undefined);
  }
  function startCompletion(value: MilestoneDetail): void {
    setCompletedOn(value.completedOn ?? localToday());
    setNote(value.completionNote ?? '');
    setPhotoIds(value.photos.map((photo) => photo.id));
    setEditing('completion');
    setNotice(undefined);
  }
  async function refresh(): Promise<void> {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: milestoneKeys.all }),
      queryClient.invalidateQueries({ queryKey: photoKeys.timeline(familyId, babyId) }),
      queryClient.invalidateQueries({ queryKey: ['family', familyId, 'activities'] }),
    ]);
  }
  async function run(
    action: (value: MilestoneDetail) => Promise<unknown>,
    success: string,
  ): Promise<void> {
    if (!item) return;
    setBusy(true);
    setNotice(undefined);
    try {
      await action(item);
      await refresh();
      setEditing(undefined);
      setNotice(success);
      await detail.refetch();
    } catch (error) {
      setNotice(userFacingError(error, '保存失败，内容可能已经变化，请刷新后重试。'));
      await detail.refetch();
    } finally {
      setBusy(false);
    }
  }
  async function remove(): Promise<void> {
    if (!item) return;
    setBusy(true);
    try {
      await api.removeMilestone(familyId, babyId, item.id, item.version);
      await refresh();
      await navigate('/app/milestones');
    } catch (error) {
      setConfirmRemove(false);
      setNotice(userFacingError(error, '移出失败，请刷新后重试。'));
      await detail.refetch();
    } finally {
      setBusy(false);
    }
  }

  function saveItem(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!item) return;
    const cleanTitle = title.trim();
    const originalReminder = item.reminderOn ?? '';
    const body: {
      expectedVersion: number;
      title?: string;
      reminderOn?: string | null;
    } = { expectedVersion: item.version };
    if (item.source === 'CUSTOM' && cleanTitle !== item.title) body.title = cleanTitle;
    if (reminderOn !== originalReminder) body.reminderOn = reminderOn || null;
    if (body.title === undefined && body.reminderOn === undefined) {
      setNotice('没有需要保存的修改。');
      return;
    }
    void run((value) => api.updateMilestone(familyId, babyId, value.id, body), '信息已保存。');
  }

  return (
    <section className={styles.page}>
      <Link className={styles.back} to="/app/milestones">
        <ArrowLeft size={17} />
        返回清单
      </Link>
      {detail.isPending ? (
        <StateCard message="正在加载里程碑…" />
      ) : detail.isError || !item ? (
        <StateCard
          message={userFacingError(detail.error, '这个里程碑已不可用，请返回清单。')}
          retry={() => void detail.refetch()}
        />
      ) : (
        <article className={styles.detailCard}>
          <header>
            <div>
              <p className={styles.eyebrow}>{item.source === 'TEMPLATE' ? '固定模板' : '自定义'}</p>
              <h1>{item.title}</h1>
              <p>
                {item.state === 'COMPLETED'
                  ? `完成于 ${item.completedOn}`
                  : item.reminderOn
                    ? `提醒日 ${item.reminderOn}`
                    : '未设置提醒'}
              </p>
            </div>
            {item.state === 'COMPLETED' ? (
              <span className={styles.statusDone}>
                <Check size={16} />
                已完成
              </span>
            ) : (
              <span className={styles.statusPending}>清单中</span>
            )}
          </header>
          {notice ? (
            <p className={styles.notice} role="status" aria-live="polite">
              {notice}
            </p>
          ) : null}
          <dl className={styles.details}>
            <dt>创建者</dt>
            <dd>{item.createdBy.displayName}</dd>
            <dt>提醒日期</dt>
            <dd>{item.reminderOn || '未设置'}</dd>
            {item.state === 'COMPLETED' ? (
              <>
                <dt>完成日期</dt>
                <dd>{item.completedOn}</dd>
                <dt>完成说明</dt>
                <dd className={styles.wrap}>{item.completionNote || '未填写'}</dd>
              </>
            ) : null}
          </dl>
          {item.photos.length ? (
            <div>
              <h2>关联照片</h2>
              <div className={styles.detailPhotos}>
                {item.photos.map((photo) => (
                  <DetailPhoto familyId={familyId} babyId={babyId} photo={photo} key={photo.id} />
                ))}
              </div>
            </div>
          ) : null}
          {item.canManage && !editing ? (
            <div className={styles.actions}>
              {item.state === 'PENDING' ? (
                <button className={styles.primaryButton} onClick={() => startCompletion(item)}>
                  完成
                </button>
              ) : (
                <button className={styles.primaryButton} onClick={() => startCompletion(item)}>
                  编辑完成
                </button>
              )}
              <button onClick={() => startItemEdit(item)}>编辑</button>
              {item.state === 'COMPLETED' ? (
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(
                      (value) => api.reopenMilestone(familyId, babyId, value.id, value.version),
                      '已撤销完成。',
                    )
                  }
                >
                  撤销完成
                </button>
              ) : null}
              <button onClick={() => setConfirmRemove(true)}>移出清单</button>
            </div>
          ) : null}
          {item.canManage && editing === 'item' ? (
            <form className={styles.form} onSubmit={saveItem}>
              {item.source === 'CUSTOM' ? (
                <label className={styles.field}>
                  标题
                  <input
                    required
                    maxLength={40}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </label>
              ) : null}
              <label className={styles.field}>
                提醒日期（可选）
                <input
                  type="date"
                  min={
                    reminderTouched || !item.reminderOn || item.reminderOn >= localToday()
                      ? localToday()
                      : undefined
                  }
                  value={reminderOn}
                  onChange={(event) => {
                    setReminderTouched(true);
                    setReminderOn(event.target.value);
                  }}
                />
              </label>
              <div className={styles.actions}>
                <button type="button" onClick={() => setEditing(undefined)}>
                  取消
                </button>
                <button className={styles.primaryButton} disabled={busy}>
                  {busy ? '保存中…' : '保存'}
                </button>
              </div>
            </form>
          ) : null}
          {item.canManage && editing === 'completion' ? (
            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault();
                void run(
                  (value) =>
                    value.state === 'PENDING'
                      ? api.completeMilestone(familyId, babyId, value.id, {
                          expectedVersion: value.version,
                          completedOn,
                          completionNote: note.trim() || null,
                          photoIds,
                        })
                      : api.updateMilestoneCompletion(familyId, babyId, value.id, {
                          expectedVersion: value.version,
                          completedOn,
                          completionNote: note.trim() || null,
                          photoIds,
                        }),
                  item.state === 'PENDING' ? '里程碑已完成。' : '完成信息已保存。',
                );
              }}
            >
              <label className={styles.field}>
                完成日期
                <input
                  type="date"
                  required
                  min={baby.data?.birthDate}
                  max={localToday()}
                  value={completedOn}
                  onChange={(event) => setCompletedOn(event.target.value)}
                />
              </label>
              <label className={styles.field}>
                完成说明（可选）
                <textarea
                  maxLength={1000}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </label>
              <div className={styles.selectionRow}>
                <button type="button" onClick={() => setPicker(true)}>
                  选择照片
                </button>
                <span>已选择 {photoIds.length} / 10 张</span>
              </div>
              <div className={styles.actions}>
                <button type="button" onClick={() => setEditing(undefined)}>
                  取消
                </button>
                <button className={styles.primaryButton} disabled={busy}>
                  {busy ? '保存中…' : '保存'}
                </button>
              </div>
            </form>
          ) : null}
        </article>
      )}
      {picker ? (
        <PhotoPicker
          familyId={familyId}
          babyId={babyId}
          selected={photoIds}
          change={setPhotoIds}
          close={closePicker}
        />
      ) : null}
      {confirmRemove ? (
        <ConfirmDialog
          title="移出清单？"
          message={
            item?.state === 'COMPLETED'
              ? '完成信息、关联照片和时间轴记录会一并移除。'
              : '此项目会从当前宝宝的清单中移除。'
          }
          onCancel={() => setConfirmRemove(false)}
          onConfirm={remove}
        />
      ) : null}
    </section>
  );
}
