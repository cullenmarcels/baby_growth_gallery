import { getReadiness } from '@baby-growth-gallery/api-client';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, HeartPulse, RefreshCw, TriangleAlert } from 'lucide-react';
import styles from './StatusPage.module.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL is required');
}

export function StatusPage(): React.JSX.Element {
  const readiness = useQuery({
    queryKey: ['api-readiness'],
    queryFn: ({ signal }) => getReadiness(API_BASE_URL, signal),
  });

  const state = readiness.isPending ? 'loading' : readiness.isError ? 'error' : 'success';
  const dependencies = readiness.data?.dependencies;
  const copy = {
    loading: {
      title: '正在连接服务',
      detail: '正在确认 API 与本地数据设施的连接状态。',
      Icon: RefreshCw,
    },
    success: {
      title: '前后端连接正常',
      detail: '工程基础已就绪，可以开始后续功能开发。',
      Icon: CheckCircle2,
    },
    error: {
      title: '服务暂不可用',
      detail: '请确认 API、PostgreSQL、Redis 与对象存储均已启动。',
      Icon: TriangleAlert,
    },
  }[state];

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-live="polite" data-state={state}>
        <div className={styles.brand}>
          <span className={styles.brandIcon} aria-hidden="true">
            <HeartPulse size={24} strokeWidth={2} />
          </span>
          <span>小福宝成长记</span>
        </div>

        <p className={styles.eyebrow}>工程连接检查</p>
        <copy.Icon className={styles.stateIcon} size={48} aria-hidden="true" />
        <h1>{copy.title}</h1>
        <p className={styles.detail}>{copy.detail}</p>

        {state === 'success' && dependencies ? (
          <dl className={styles.dependencies} aria-label="基础设施状态">
            <div>
              <dt>PostgreSQL</dt>
              <dd>{dependencies.postgres}</dd>
            </div>
            <div>
              <dt>Redis</dt>
              <dd>{dependencies.redis}</dd>
            </div>
            <div>
              <dt>对象存储</dt>
              <dd>{dependencies.objectStorage}</dd>
            </div>
          </dl>
        ) : null}

        {state === 'error' ? (
          <button className={styles.retry} type="button" onClick={() => void readiness.refetch()}>
            <RefreshCw size={17} aria-hidden="true" />
            重新连接
          </button>
        ) : null}

        <p className={styles.notice}>此页面仅用于验证工程状态，不是正式产品首页。</p>
      </section>
    </main>
  );
}
