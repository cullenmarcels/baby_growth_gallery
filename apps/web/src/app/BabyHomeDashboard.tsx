import {
  ApiClientError,
  type GrowthOverview,
  type PublishedPhotoSummary,
} from '@baby-growth-gallery/api-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CalendarDays, Image as ImageIcon, Ruler, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { BabySummary } from '@baby-growth-gallery/api-client';
import { api } from './api';
import { babyKeys } from './baby-query';
import { growthKeys } from './growth-query';
import { photoKeys } from './photo-query';
import { remindersInWindow, shanghaiToday } from './baby-home-utils';
import { userFacingError } from './user-facing-error';
import styles from './BabyHomeDashboard.module.css';

type Metric = 'LENGTH' | 'WEIGHT' | 'HEAD' | 'BMI';

const metricInfo: Record<Metric, { label: string; unit: string; digits: number }> = {
  LENGTH: { label: '身高／身长', unit: 'cm', digits: 1 },
  WEIGHT: { label: '体重', unit: 'kg', digits: 2 },
  HEAD: { label: '头围', unit: 'cm', digits: 1 },
  BMI: { label: 'BMI', unit: 'kg/m²', digits: 2 },
};

function dateLabel(value: string): string {
  const [year, month, day] = value.split('-');
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function HomeSection({
  title,
  icon,
  to,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  to: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className={styles.section} aria-labelledby={`home-${title}`}>
      <header className={styles.sectionHeader}>
        <h2 id={`home-${title}`}>
          {icon}
          {title}
        </h2>
        <Link className={styles.sectionLink} to={to} aria-label={`查看全部${title}`}>
          查看全部 <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </header>
      {children}
    </section>
  );
}

function LoadingState({ label }: { label: string }): React.JSX.Element {
  return (
    <div className={styles.state} role="status" aria-live="polite" aria-busy="true">
      <span className={styles.spinner} aria-hidden="true" />
      <span>正在读取{label}…</span>
    </div>
  );
}

function EmptyState({
  text,
  to,
  linkText,
}: {
  text: string;
  to: string;
  linkText: string;
}): React.JSX.Element {
  return (
    <div className={styles.state}>
      <p>{text}</p>
      <Link className={styles.actionLink} to={to}>
        {linkText}
      </Link>
    </div>
  );
}

function ErrorState({ message, retry }: { message: string; retry: () => void }): React.JSX.Element {
  return (
    <div className={styles.error} role="alert">
      <p>{message}</p>
      <button className={styles.actionLink} type="button" onClick={retry}>
        重试
      </button>
    </div>
  );
}

function HomePhotoThumbnail({
  familyId,
  babyId,
  photo,
  onAccessError,
}: {
  familyId: string;
  babyId: string;
  photo: PublishedPhotoSummary;
  onAccessError: (error: unknown) => void;
}): React.JSX.Element {
  const [failedUrl, setFailedUrl] = useState<string>();
  const preview = useQuery({
    queryKey: photoKeys.preview(familyId, babyId, photo.id, 'THUMBNAIL'),
    queryFn: () => api.getPhotoPreview(familyId, babyId, photo.id, 'THUMBNAIL'),
    staleTime: 4 * 60_000,
    refetchInterval: 4 * 60_000,
  });
  useEffect(() => {
    if (preview.error) onAccessError(preview.error);
  }, [onAccessError, preview.error]);
  const url = preview.data?.url;
  return url && url !== failedUrl ? (
    <img
      className={styles.thumbnailImage}
      src={url}
      alt={photo.title || '家庭照片'}
      onError={() => {
        setFailedUrl(url);
        void preview.refetch();
      }}
    />
  ) : preview.isError ? (
    <span className={styles.thumbnailFallback} role="img" aria-label="照片预览暂不可用">
      <ImageIcon size={22} aria-hidden="true" />
      预览暂不可用
    </span>
  ) : (
    <span className={styles.thumbnailFallback} role="status">
      正在加载预览…
    </span>
  );
}

function photoAccessDenied(error: unknown): boolean {
  return error instanceof ApiClientError && [401, 403].includes(error.status);
}

function isAccessFailure(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError && [401, 403, 404].includes(error.status);
}

function GrowthSummary({ data }: { data: GrowthOverview }): React.JSX.Element {
  const byMetric = new Map(data.latest.map((item) => [item.metric, item]));
  const metrics: Metric[] = ['LENGTH', 'WEIGHT', 'HEAD', 'BMI'];
  const populated = metrics.filter((metric) => byMetric.has(metric));
  if (!populated.length) {
    return <EmptyState text="还没有成长测量记录。" to="/app/growth/new" linkText="添加测量" />;
  }
  return (
    <div className={styles.growthGrid}>
      {populated.map((metric) => {
        const item = byMetric.get(metric)!;
        const info = metricInfo[metric];
        const percentile = item.reference.percentile;
        return (
          <div className={styles.growthValue} key={metric}>
            <span className={styles.growthLabel}>{info.label}</span>
            <strong>
              {item.value?.toFixed(info.digits) ?? '—'}
              {item.value === null ? '' : ` ${info.unit}`}
            </strong>
            <time dateTime={item.measuredOn}>{dateLabel(item.measuredOn)}</time>
            {percentile === null ? null : (
              <span className={styles.percentile}>
                WHO 百分位{' '}
                {percentile < 0.1 ? '<0.1' : percentile > 99.9 ? '>99.9' : percentile.toFixed(1)}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function BabyHomeDashboard({
  familyId,
  baby,
}: {
  familyId: string;
  baby: BabySummary;
}): React.JSX.Element {
  const client = useQueryClient();
  const babyId = baby.id;
  const today = shanghaiToday();
  const homePhotoKey = ['photos', familyId, babyId, 'home-published'] as const;
  const homeMilestoneKey = ['milestones', familyId, babyId, 'home-overview', today] as const;
  const growthKey = [
    ...growthKeys.scope(familyId, babyId, baby.birthDate, baby.sex),
    'overview',
  ] as const;
  const accessGateKey = useMemo(
    () => ['home-dashboard', familyId, babyId, 'access-blocked'] as const,
    [babyId, familyId],
  );
  const accessGate = useQuery({
    queryKey: accessGateKey,
    queryFn: () => Promise.resolve(false),
    initialData: false,
    enabled: false,
  });
  const photos = useQuery({
    queryKey: homePhotoKey,
    queryFn: () => api.listPublishedPhotos(familyId, babyId, { limit: 3 }),
    enabled: !accessGate.data,
  });
  const milestones = useQuery({
    queryKey: homeMilestoneKey,
    queryFn: () => api.getMilestoneOverview(familyId, babyId, { fromOn: today, limit: 3 }),
    enabled: !accessGate.data,
  });
  const growth = useQuery({
    queryKey: growthKey,
    queryFn: () => api.getGrowthOverview(familyId, babyId),
    enabled: !accessGate.data,
  });
  const accessFailure = [photos.error, milestones.error, growth.error].find(isAccessFailure);
  const accessBlocked = accessGate.data || Boolean(accessFailure);

  useEffect(() => {
    if (!accessFailure || accessGate.data) return;
    client.setQueryData(accessGateKey, true);
    void client.cancelQueries({ queryKey: ['photos', familyId, babyId] });
    client.removeQueries({ queryKey: ['photos', familyId, babyId] });
    client.removeQueries({ queryKey: ['milestones', familyId, babyId] });
    client.removeQueries({ queryKey: ['growth', familyId, babyId] });
    if (accessFailure.status === 401) {
      void client.invalidateQueries({ queryKey: ['auth-session'] });
    } else {
      void client.invalidateQueries({ queryKey: babyKeys.detail(familyId, babyId) });
    }
  }, [accessFailure, accessGate.data, accessGateKey, babyId, client, familyId]);

  function handlePreviewAccessError(error: unknown): void {
    if (!photoAccessDenied(error) || accessGate.data) return;
    client.setQueryData(accessGateKey, true);
    void client.cancelQueries({ queryKey: ['photos', familyId, babyId] });
    client.removeQueries({ queryKey: ['photos', familyId, babyId] });
    client.removeQueries({ queryKey: ['milestones', familyId, babyId] });
    client.removeQueries({ queryKey: ['growth', familyId, babyId] });
    if (error instanceof ApiClientError && error.status === 401) {
      void client.invalidateQueries({ queryKey: ['auth-session'] });
    } else {
      void client.invalidateQueries({ queryKey: babyKeys.detail(familyId, babyId) });
    }
  }

  if (accessBlocked) {
    return (
      <section className={styles.accessError} role="alert">
        <p>当前宝宝或家庭访问状态已变化，摘要数据已清除。</p>
        <Link className={styles.actionLink} to="/app">
          重新检查
        </Link>
      </section>
    );
  }

  const visibleReminders = milestones.data
    ? remindersInWindow(milestones.data.reminders, today)
    : [];

  return (
    <div className={styles.dashboard}>
      <HomeSection
        title="最新照片"
        icon={<ImageIcon size={19} aria-hidden="true" />}
        to="/app/gallery"
      >
        {photos.isPending ? (
          <LoadingState label="照片" />
        ) : photos.isError ? (
          <ErrorState
            message={userFacingError(photos.error, '照片摘要加载失败，请重试。')}
            retry={() => void photos.refetch()}
          />
        ) : photos.data.items.length === 0 ? (
          <EmptyState text="还没有已发布的家庭照片。" to="/app/photos/manage" linkText="管理照片" />
        ) : (
          <div className={styles.photoGrid}>
            {photos.data.items.slice(0, 3).map((photo) => (
              <Link
                className={styles.photo}
                to={`/app/photos/${photo.id}?from=gallery`}
                key={photo.id}
                aria-label={`查看照片：${photo.title || dateLabel(photo.capturedOn)}`}
              >
                <span className={styles.photoImage}>
                  <HomePhotoThumbnail
                    familyId={familyId}
                    babyId={babyId}
                    photo={photo}
                    onAccessError={handlePreviewAccessError}
                  />
                </span>
                <span className={styles.photoTitle}>{photo.title || '成长照片'}</span>
                <time dateTime={photo.capturedOn}>{dateLabel(photo.capturedOn)}</time>
              </Link>
            ))}
          </div>
        )}
      </HomeSection>

      <HomeSection
        title="里程碑进度"
        icon={<Sparkles size={19} aria-hidden="true" />}
        to="/app/milestones"
      >
        {milestones.isPending ? (
          <LoadingState label="里程碑进度" />
        ) : milestones.isError ? (
          <ErrorState
            message={userFacingError(milestones.error, '里程碑进度加载失败，请重试。')}
            retry={() => void milestones.refetch()}
          />
        ) : (
          <div className={styles.progress}>
            <div>
              <strong>{milestones.data.progress.completed}</strong>
              <span> / {milestones.data.progress.total} 项已完成</span>
            </div>
            <progress
              value={milestones.data.progress.total ? milestones.data.progress.completed : 0}
              max={milestones.data.progress.total || 1}
              aria-label={`已完成 ${milestones.data.progress.completed} 项，共 ${milestones.data.progress.total} 项`}
            />
            {milestones.data.progress.total === 0 ? <p>加入或添加里程碑，记录成长时刻。</p> : null}
          </div>
        )}
      </HomeSection>

      <HomeSection
        title="近期提醒"
        icon={<CalendarDays size={19} aria-hidden="true" />}
        to="/app/milestones"
      >
        {milestones.isPending ? (
          <LoadingState label="近期提醒" />
        ) : milestones.isError ? (
          <ErrorState
            message={userFacingError(milestones.error, '近期提醒加载失败，请重试。')}
            retry={() => void milestones.refetch()}
          />
        ) : visibleReminders.length === 0 ? (
          <EmptyState text="未来 30 天没有提醒。" to="/app/milestones" linkText="查看里程碑" />
        ) : (
          <ul className={styles.reminderList}>
            {visibleReminders.map((item) => (
              <li key={item.id}>
                <Link to={`/app/milestones/${item.id}`}>
                  <span>{item.title}</span>
                  <time dateTime={item.reminderOn ?? undefined}>
                    {item.reminderOn ? dateLabel(item.reminderOn) : ''}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </HomeSection>

      <HomeSection
        title="最新成长数据"
        icon={<Ruler size={19} aria-hidden="true" />}
        to="/app/growth"
      >
        {growth.isPending ? (
          <LoadingState label="成长数据" />
        ) : growth.isError ? (
          <ErrorState
            message={userFacingError(growth.error, '成长数据摘要加载失败，请重试。')}
            retry={() => void growth.refetch()}
          />
        ) : (
          <GrowthSummary data={growth.data} />
        )}
      </HomeSection>
    </div>
  );
}
