import { Baby, Heart, Sparkles } from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';
import styles from './AuthPages.module.css';

export function AuthLayout(): React.JSX.Element {
  return (
    <main className={styles.authPage}>
      <aside className={styles.storyPanel} aria-label="品牌介绍">
        <Link className={styles.brand} to="/">
          <span className={styles.brandIcon} aria-hidden="true">
            <Heart size={22} fill="currentColor" />
          </span>
          <span>小福宝成长记</span>
        </Link>
        <div className={styles.storyCopy}>
          <span className={styles.storyBadge}>珍藏每一天</span>
          <h1>陪伴成长，留住一家人的温柔瞬间</h1>
          <p>安全保存共同的回忆，让每一次变化都值得回望。</p>
        </div>
        <div className={styles.illustration} aria-hidden="true">
          <Sparkles className={styles.sparkleOne} />
          <Baby className={styles.babyIcon} />
          <Sparkles className={styles.sparkleTwo} />
        </div>
      </aside>
      <section className={styles.formPanel}>
        <div className={styles.mobileBrand}>
          <span className={styles.brandIcon} aria-hidden="true">
            <Heart size={19} fill="currentColor" />
          </span>
          <span>小福宝成长记</span>
        </div>
        <Outlet />
      </section>
    </main>
  );
}
