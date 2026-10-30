import { ApiClientError } from '@baby-growth-gallery/api-client';
import type { BabySummary, GrowthRecord, GrowthSeries } from '@baby-growth-gallery/api-client';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Ruler } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { api } from './api';
import { babyKeys } from './baby-query';
import { ConfirmDialog } from './FamilyApp';
import { growthKeys } from './growth-query';
import { userFacingError } from './user-facing-error';
import styles from './GrowthApp.module.css';

type Metric = 'LENGTH' | 'WEIGHT' | 'HEAD' | 'BMI';
const labels: Record<Metric, string> = {
  LENGTH: '身高／身长',
  WEIGHT: '体重',
  HEAD: '头围',
  BMI: 'BMI',
};
const units: Record<Metric, string> = { LENGTH: 'cm', WEIGHT: 'kg', HEAD: 'cm', BMI: 'kg/m²' };
const reasons: Record<string, string> = {
  DATE_CONFLICT: '测量日期早于当前生日，请核对日期。',
  SEX_MISSING: '填写宝宝性别后可查看 WHO 参考。',
  AGE_UNSUPPORTED: '该测量年龄暂无此项 WHO 参考。',
  MEASUREMENT_MISSING: '未记录所需测量值。',
  MEASUREMENT_UNSUPPORTED: '此测量值无法计算参考，请核对记录。',
};
const today = () => new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
const format = (value: number | null, metric: Metric) =>
  value === null
    ? '未记录'
    : `${value.toFixed(metric === 'WEIGHT' || metric === 'BMI' ? 2 : 1)} ${units[metric]}`;
const refText = (r: GrowthRecord['measurements'][number]['reference']) => {
  if (r.reason) return reasons[r.reason] ?? '该记录暂无参考。';
  if (r.zScore === null || r.percentile === null) return '暂无参考';
  const percentile =
    r.percentile < 0.1 ? '<0.1' : r.percentile > 99.9 ? '>99.9' : r.percentile.toFixed(1);
  return `${r.standard === 'WHO_2006' ? 'WHO 2006' : r.standard === 'WHO_CHILD_2007' ? 'WHO 儿童头围标准' : 'WHO 2007'} · z ${r.zScore.toFixed(2)} · 百分位 ${percentile}%`;
};

function State({ message, retry }: { message: string; retry?: (() => void) | undefined }) {
  return (
    <div className={styles.state} role={retry ? 'alert' : 'status'}>
      <Ruler aria-hidden="true" />
      <p>{message}</p>
      {retry ? <button onClick={retry}>重试</button> : null}
    </div>
  );
}

function GrowthScope({ edit = false }: { edit?: boolean }) {
  const auth = useAuth();
  const client = useQueryClient();
  const { recordId } = useParams();
  const familyId = auth.account?.activeFamilyId ?? '';
  const babyId = auth.account?.activeBabyId ?? '';
  useEffect(
    () => () => {
      if (familyId && babyId) client.removeQueries({ queryKey: ['growth', familyId, babyId] });
    },
    [client, familyId, babyId],
  );
  const baby = useQuery({
    queryKey: babyKeys.detail(familyId, babyId),
    queryFn: () => api.getBaby(familyId, babyId),
    enabled: !!familyId && !!babyId,
  });
  useEffect(() => {
    if (baby.isError && familyId && babyId) {
      client.removeQueries({ queryKey: ['growth', familyId, babyId] });
    }
  }, [baby.isError, client, familyId, babyId]);
  if (!familyId || !babyId) return <Navigate replace to="/app" />;
  if (baby.isError) return <State message="无法访问当前宝宝，请重新选择宝宝。" />;
  if (!baby.data) return <State message="正在打开成长记录…" />;
  const scope = { familyId, babyId, baby: baby.data };
  return edit ? (
    <GrowthEditor
      key={`${familyId}:${babyId}:${recordId ?? 'new'}`}
      {...scope}
      {...(recordId ? { recordId } : {})}
    />
  ) : (
    <GrowthContent key={`${familyId}:${babyId}`} {...scope} />
  );
}
export function GrowthPage() {
  return <GrowthScope />;
}
export function GrowthFormPage() {
  return <GrowthScope edit />;
}
type Scope = { familyId: string; babyId: string; baby: BabySummary };

function GrowthContent({ familyId, babyId, baby }: Scope) {
  const client = useQueryClient();
  const [state, setState] = useState<'ACTIVE' | 'TRASHED'>('ACTIVE');
  const [metric, setMetric] = useState<Metric>('LENGTH');
  const [allDates, setAllDates] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [accessBlocked, setAccessBlocked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const working = useRef(false);
  const [confirm, setConfirm] = useState<{ item: GrowthRecord; action: 'trash' | 'purge' } | null>(
    null,
  );
  const key = growthKeys.scope(familyId, babyId, baby.birthDate, baby.sex);
  async function guardedFetch<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (err) {
      if (err instanceof ApiClientError && [401, 403, 404].includes(err.status)) {
        setAccessBlocked(userFacingError(err, '当前无法访问成长记录。'));
        void client.cancelQueries({ queryKey: ['growth', familyId, babyId] });
        client.removeQueries({ queryKey: ['growth', familyId, babyId] });
      }
      throw err;
    }
  }
  const overview = useQuery({
    queryKey: [...key, 'overview'],
    queryFn: () => guardedFetch(() => api.getGrowthOverview(familyId, babyId)),
    enabled: accessBlocked === null,
  });
  const list = useInfiniteQuery({
    queryKey: [...key, 'list', state],
    initialPageParam: '',
    queryFn: ({ pageParam }) =>
      guardedFetch(() =>
        api.listGrowthRecords(familyId, babyId, {
          state,
          ...(pageParam ? { cursor: pageParam } : {}),
        }),
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: accessBlocked === null,
  });
  const end = today();
  const startDate = new Date(`${end}T00:00:00Z`);
  startDate.setUTCMonth(startDate.getUTCMonth() - 6);
  const start = startDate.toISOString().slice(0, 10);
  const series = useInfiniteQuery({
    queryKey: [...key, 'series', metric, allDates, end],
    initialPageParam: '',
    queryFn: ({ pageParam }) =>
      guardedFetch(() =>
        api.getGrowthSeries(familyId, babyId, {
          metric,
          toOn: end,
          ...(!allDates ? { fromOn: start } : {}),
          ...(pageParam ? { cursor: pageParam } : {}),
        }),
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: state === 'ACTIVE' && accessBlocked === null,
  });
  const accessError = [list.error, overview.error, series.error].find(
    (err) => err instanceof ApiClientError && [401, 403, 404].includes(err.status),
  );
  const scopeError = userFacingError(accessError ?? list.error, '记录加载失败，请重试。');
  async function act(item: GrowthRecord, action: 'trash' | 'restore' | 'purge') {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (action === 'purge') await api.purgeGrowthRecord(familyId, babyId, item.id, item.version);
      else if (action === 'trash')
        await api.trashGrowthRecord(familyId, babyId, item.id, { expectedVersion: item.version });
      else
        await api.restoreGrowthRecord(familyId, babyId, item.id, { expectedVersion: item.version });
      setNotice(
        action === 'trash'
          ? '记录已放入回收站。'
          : action === 'restore'
            ? '记录已恢复。'
            : '记录已永久删除。',
      );
    } catch (err) {
      setError(userFacingError(err));
    } finally {
      setConfirm(null);
      await client.invalidateQueries({ queryKey: ['growth', familyId, babyId] });
      working.current = false;
      setBusy(false);
    }
  }
  return (
    <section className={styles.page} aria-busy={busy}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>{baby.nickname}的成长档案</p>
          <h1>成长数据</h1>
          <p>记录每次测量，查看真实成长趋势。</p>
        </div>
        <Link className={styles.primary} to="/app/growth/new">
          <Plus size={18} />
          添加记录
        </Link>
      </header>
      <p className={styles.disclaimer}>仅供家庭记录，不构成医疗诊断</p>
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
      <p aria-live="polite">{notice}</p>
      {accessBlocked || accessError || (list.isError && !list.data) ? (
        <State
          message={accessBlocked ?? scopeError}
          retry={() => {
            if (accessBlocked) setAccessBlocked(null);
            else
              void Promise.all([
                list.refetch(),
                overview.refetch(),
                ...(state === 'ACTIVE' ? [series.refetch()] : []),
              ]);
          }}
        />
      ) : (
        <>
          <div className={styles.overview}>
            {(['LENGTH', 'WEIGHT', 'HEAD', 'BMI'] as Metric[]).map((m) => {
              const item = overview.data?.latest.find((entry) => entry.metric === m);
              return (
                <article className={styles.summary} key={m}>
                  <h2>{labels[m]}</h2>
                  <strong>{item ? format(item.value, m) : '未记录'}</strong>
                  {item ? (
                    <>
                      <time dateTime={item.measuredOn}>{item.measuredOn}</time>
                      <small>{refText(item.reference)}</small>
                    </>
                  ) : (
                    <small>{overview.isPending ? '正在读取…' : '添加测量后显示'}</small>
                  )}
                </article>
              );
            })}
          </div>
          {overview.isError ? (
            <State
              message="概览加载失败。"
              retry={() => {
                void overview.refetch();
              }}
            />
          ) : null}
          <nav className={styles.controls} aria-label="记录状态">
            {(['ACTIVE', 'TRASHED'] as const).map((s) => (
              <button
                key={s}
                aria-pressed={state === s}
                onClick={() => {
                  setState(s);
                  setError('');
                }}
              >
                {s === 'ACTIVE' ? '测量记录' : '回收站'}
              </button>
            ))}
          </nav>
          {state === 'ACTIVE' ? (
            <section className={styles.panel} aria-label="成长曲线">
              <div className={styles.controls}>
                <label>
                  指标
                  <select
                    value={metric}
                    onChange={(event) => setMetric(event.target.value as Metric)}
                  >
                    {Object.entries(labels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  日期范围
                  <select
                    value={allDates ? 'all' : 'recent'}
                    onChange={(event) => setAllDates(event.target.value === 'all')}
                  >
                    <option value="recent">最近六个月</option>
                    <option value="all">全部记录</option>
                  </select>
                </label>
              </div>
              {series.isPending ? (
                <State message="正在加载曲线…" />
              ) : series.isError ? (
                <State
                  message="曲线加载失败，已加载记录仍保留。"
                  retry={() => {
                    void series.refetch();
                  }}
                />
              ) : null}
              {series.data ? (
                <GrowthChart pages={series.data.pages} metric={metric} birthDate={baby.birthDate} />
              ) : null}
              {series.hasNextPage ? (
                <button
                  disabled={series.isFetchingNextPage}
                  onClick={() => {
                    void series.fetchNextPage();
                  }}
                >
                  加载更多
                </button>
              ) : null}
              {series.hasNextPage ? <p>曲线尚有更多测量点，请继续加载。</p> : null}
            </section>
          ) : (
            <p>记录回收后保留 30 天；管理员可以提前彻底删除。管理员回收的记录需由管理员恢复。</p>
          )}
          {list.isPending ? <State message="正在加载记录…" /> : null}
          {list.isError ? (
            <State
              message={scopeError}
              retry={() => {
                void list.fetchNextPage();
              }}
            />
          ) : null}
          {list.data?.pages.flatMap((page) => page.items).length === 0 ? (
            <State
              message={state === 'ACTIVE' ? '还没有测量记录，添加第一条吧。' : '回收站为空。'}
            />
          ) : null}
          <div className={styles.records}>
            {list.data?.pages
              .flatMap((page) => page.items)
              .map((item) => (
                <article key={item.id} className={styles.record}>
                  <header>
                    <div>
                      <h2>
                        <time dateTime={item.measuredOn}>{item.measuredOn}</time>
                      </h2>
                      <small>
                        记录者：{item.createdBy.displayName} ·{' '}
                        {new Date(item.createdAt).toLocaleString('zh-CN')}
                      </small>
                    </div>
                    <div className={styles.controls}>
                      {item.canManage ? (
                        <>
                          <Link to={`/app/growth/${item.id}/edit`}>编辑</Link>
                          <button
                            disabled={busy}
                            onClick={() => setConfirm({ item, action: 'trash' })}
                          >
                            回收
                          </button>
                        </>
                      ) : null}
                      {item.canRestore &&
                      item.purgeAfter &&
                      Date.parse(item.purgeAfter) > now &&
                      !item.dateConflict ? (
                        <button
                          disabled={busy}
                          onClick={() => {
                            void act(item, 'restore');
                          }}
                        >
                          恢复
                        </button>
                      ) : null}
                      {item.canRestore &&
                      item.purgeAfter &&
                      Date.parse(item.purgeAfter) > now &&
                      item.dateConflict ? (
                        <Link to={`/app/growth/${item.id}/edit`}>核对日期</Link>
                      ) : null}
                      {item.canPurge ? (
                        <button
                          disabled={busy}
                          className={styles.danger}
                          onClick={() => setConfirm({ item, action: 'purge' })}
                        >
                          彻底删除
                        </button>
                      ) : null}
                    </div>
                  </header>
                  {item.dateConflict ? (
                    <p className={styles.error}>
                      测量日期早于当前生日，请核对日期；原始数据已保留。
                    </p>
                  ) : null}
                  <dl className={styles.values}>
                    {item.measurements.map((m) => (
                      <div key={m.metric}>
                        <dt>{labels[m.metric]}</dt>
                        <dd>{format(m.value, m.metric)}</dd>
                        {m.value !== null ? <small>{refText(m.reference)}</small> : null}
                      </div>
                    ))}
                  </dl>
                  {item.lengthCm !== null ? (
                    <small>
                      测量方式：{item.measurementPosition === 'RECUMBENT' ? '卧位身长' : '站立身高'}
                    </small>
                  ) : null}
                  {item.note ? <p className={styles.note}>{item.note}</p> : null}
                  {item.status === 'TRASHED' ? (
                    <p>
                      {item.purgeAfter && Date.parse(item.purgeAfter) <= now
                        ? '恢复期限已过，等待永久清理。'
                        : `恢复期限：${new Date(item.purgeAfter!).toLocaleString('zh-CN')}`}
                      {!item.canRestore && item.purgeAfter && Date.parse(item.purgeAfter) > now
                        ? ' 需由家庭管理员恢复。'
                        : ''}
                    </p>
                  ) : null}
                </article>
              ))}
          </div>
          {list.hasNextPage ? (
            <button
              disabled={list.isFetchingNextPage}
              onClick={() => {
                void list.fetchNextPage();
              }}
            >
              加载更多
            </button>
          ) : null}
        </>
      )}
      {confirm ? (
        <ConfirmDialog
          title={confirm.action === 'trash' ? '放入回收站？' : '彻底删除记录？'}
          message={
            confirm.action === 'trash'
              ? '记录将在回收站保留 30 天，到期永久清理。'
              : '这条记录将永久删除，无法恢复。'
          }
          onCancel={() => {
            if (!working.current) setConfirm(null);
          }}
          onConfirm={() => act(confirm.item, confirm.action)}
        />
      ) : null}
    </section>
  );
}

export function GrowthChart({
  pages,
  metric,
  birthDate,
}: {
  pages: GrowthSeries[];
  metric: Metric;
  birthDate?: string;
}) {
  const records = [
    ...new Map(pages.flatMap((p) => p.items).map((item) => [item.id, item])).values(),
  ].sort(
    (a, b) =>
      a.measuredOn.localeCompare(b.measuredOn) ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.id.localeCompare(b.id),
  );
  const points = records.flatMap((item) => {
    const value = item.measurements.find((m) => m.metric === metric)?.value;
    return value == null ? [] : [{ date: item.measuredOn, value, id: item.id }];
  });
  if (!points.length) return <State message="该时段尚无此项测量数据。" />;
  const curve = pages[0]?.referenceCurve ?? [];
  const dates = [
    ...points.map((p) => Date.parse(p.date)),
    ...curve.map((p) => Date.parse(p.measuredOn)),
  ];
  const values = [...points.map((p) => p.value), ...curve.flatMap((p) => [p.lower, p.upper])];
  const minX = Math.min(...dates),
    maxX = Math.max(...dates);
  const minY = Math.max(0, Math.min(...values) * 0.9),
    maxY = Math.max(...values) * 1.1;
  const x = (date: string) => 100 + ((Date.parse(date) - minX) / (maxX - minX || 1)) * 554;
  const y = (value: number) => 244 - ((value - minY) / (maxY - minY || 1)) * 210;
  const lines: Array<typeof curve> = [];
  for (const point of curve) {
    const last = lines.at(-1);
    const previous = last?.at(-1);
    const switchAt = birthDate ? Date.parse(birthDate) + 731 * 86_400_000 : null;
    const crossesLengthChange =
      switchAt !== null &&
      (metric === 'LENGTH' || metric === 'BMI') &&
      previous &&
      Date.parse(previous.measuredOn) < switchAt &&
      Date.parse(point.measuredOn) >= switchAt;
    if (!last || previous?.standard !== point.standard || crossesLengthChange) lines.push([point]);
    else last.push(point);
  }
  return (
    <>
      <h2>{labels[metric]}趋势</h2>
      <svg
        className={styles.chart}
        viewBox="0 0 700 290"
        role="img"
        aria-label={`${labels[metric]}曲线，单位 ${units[metric]}，详细数值见下方文本记录`}
      >
        <line className={styles.axis} x1="100" x2="654" y1="244" y2="244" />
        <line className={styles.axis} x1="100" x2="100" y1="24" y2="244" />
        {[minY, (minY + maxY) / 2, maxY].map((v, i) => (
          <text key={i} x="92" y={y(v) + 4} textAnchor="end">
            {v.toFixed(1)}
          </text>
        ))}
        <text x="100" y="279">
          {new Date(minX).toISOString().slice(0, 10)}
        </text>
        <text x="654" y="279" textAnchor="end">
          {new Date(maxX).toISOString().slice(0, 10)}
        </text>
        {lines.map((line, i) => (
          <g key={i}>
            {(['lower', 'median', 'upper'] as const).map((field) => (
              <polyline
                key={field}
                className={styles.reference}
                points={line.map((p) => `${x(p.measuredOn)},${y(p[field])}`).join(' ')}
              />
            ))}
          </g>
        ))}
        {points.length > 1 ? (
          <polyline
            className={styles.measured}
            points={points.map((p) => `${x(p.date)},${y(p.value)}`).join(' ')}
          />
        ) : null}
        {points.map((p) => (
          <circle key={p.id} className={styles.dot} cx={x(p.date)} cy={y(p.value)} r="4">
            <title>
              {p.date}：{format(p.value, metric)}
            </title>
          </circle>
        ))}
      </svg>
      <p>WHO 参考按适用年龄和测量方式换算；曲线中的测量点保留原始值。</p>
      <p className={styles.legend}>
        实线／圆点：原始测量 · 虚线：WHO 中位数及 ±2 SD · 单位：{units[metric]}
      </p>
      {!curve.length ? <p>当前条件暂无该指标的 WHO 参考曲线。</p> : null}
      <details>
        <summary>曲线文本记录</summary>
        <ul>
          {points.map((p) => (
            <li key={p.id}>
              {p.date}：{format(p.value, metric)}
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}

function GrowthEditor({ familyId, babyId, baby, recordId }: Scope & { recordId?: string }) {
  const record = useQuery({
    queryKey: [...growthKeys.scope(familyId, babyId, baby.birthDate, baby.sex), 'detail', recordId],
    queryFn: () => api.getGrowthRecord(familyId, babyId, recordId!),
    enabled: !!recordId,
  });
  if (recordId && record.isError)
    return (
      <State
        message={userFacingError(record.error, '记录加载失败。')}
        retry={() => {
          void record.refetch();
        }}
      />
    );
  if (recordId && !record.data) return <State message="正在读取测量记录…" />;
  if (
    record.data &&
    !record.data.canManage &&
    !(record.data.canRestore && record.data.dateConflict)
  )
    return <State message="当前无权编辑或修正这条记录。" />;
  return (
    <GrowthForm
      key={recordId ?? 'new'}
      familyId={familyId}
      babyId={babyId}
      baby={baby}
      {...(record.data ? { record: record.data } : {})}
    />
  );
}

function GrowthForm({ familyId, babyId, baby, record }: Scope & { record?: GrowthRecord }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const recovering = record?.status === 'TRASHED';
  const [expectedVersion] = useState(record?.version);
  const [measuredOn, setMeasuredOn] = useState(record?.measuredOn ?? today());
  const [length, setLength] = useState(record?.lengthCm?.toString() ?? '');
  const [weight, setWeight] = useState(record?.weightKg?.toString() ?? '');
  const [head, setHead] = useState(record?.headCm?.toString() ?? '');
  const [position, setPosition] = useState(record?.measurementPosition ?? '');
  const [note, setNote] = useState(record?.note ?? '');
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const [error, setError] = useState('');
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (working.current) return;
    if (!length && !weight && !head) {
      setError('请至少填写一项测量数据。');
      return;
    }
    if (length && !position) {
      setError('请填写身高或身长的测量方式。');
      return;
    }
    const body = {
      measuredOn,
      lengthCm: length ? Number(length) : null,
      weightKg: weight ? Number(weight) : null,
      headCm: head ? Number(head) : null,
      measurementPosition: length ? (position as 'RECUMBENT' | 'STANDING') : null,
      note: note.trim() || null,
    };
    working.current = true;
    setBusy(true);
    setError('');
    try {
      if (recovering && record)
        await api.restoreGrowthRecord(familyId, babyId, record.id, {
          expectedVersion: expectedVersion ?? record.version,
          measuredOn,
        });
      else if (record)
        await api.updateGrowthRecord(familyId, babyId, record.id, {
          ...body,
          expectedVersion: expectedVersion ?? record.version,
        });
      else await api.createGrowthRecord(familyId, babyId, body);
      await client.invalidateQueries({ queryKey: ['growth', familyId, babyId] });
      await navigate('/app/growth');
    } catch (err) {
      setError(userFacingError(err));
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  return (
    <section className={`${styles.page} ${styles.formPage}`}>
      <Link className={styles.back} to="/app/growth">
        <ArrowLeft size={17} />
        返回数据
      </Link>
      <h1>{recovering ? '核对日期并恢复' : record ? '编辑测量记录' : '添加测量记录'}</h1>
      <p className={styles.disclaimer}>仅供家庭记录，不构成医疗诊断</p>
      <form
        className={styles.form}
        onSubmit={(event) => {
          void submit(event);
        }}
        aria-busy={busy}
        noValidate
      >
        {error ? (
          <p ref={errorRef} tabIndex={-1} role="alert" className={styles.error}>
            {error}
          </p>
        ) : null}
        <label>
          测量日期
          <input
            required
            type="date"
            min={baby.birthDate}
            max={today()}
            value={measuredOn}
            onChange={(e) => setMeasuredOn(e.target.value)}
          />
        </label>
        {recovering ? <p>原始测量值保持不变，请修正测量日期后恢复。</p> : null}
        <fieldset disabled={busy || recovering}>
          <legend>测量数据（至少一项）</legend>
          <label>
            身高／身长（cm）
            <input
              type="number"
              min="0.1"
              max="999999.9"
              step="0.1"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              inputMode="decimal"
            />
          </label>
          <label>
            测量方式
            <select
              required={!!length}
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            >
              <option value="">请选择</option>
              <option value="RECUMBENT">卧位身长</option>
              <option value="STANDING">站立身高</option>
            </select>
          </label>
          <label>
            体重（kg）
            <input
              type="number"
              min="0.01"
              max="999999.99"
              step="0.01"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              inputMode="decimal"
            />
          </label>
          <label>
            头围（cm）
            <input
              type="number"
              min="0.1"
              max="999999.9"
              step="0.1"
              value={head}
              onChange={(e) => setHead(e.target.value)}
              inputMode="decimal"
            />
          </label>
          <label>
            备注
            <textarea maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </fieldset>
        <div className={styles.controls}>
          <Link to="/app/growth">取消</Link>
          <button className={styles.primary} disabled={busy} type="submit">
            {busy ? '保存中' : recovering ? '修正并恢复' : '保存'}
          </button>
        </div>
      </form>
    </section>
  );
}
