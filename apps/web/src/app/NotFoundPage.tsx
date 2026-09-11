import { Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './ProductPages.module.css';

export function NotFoundPage(): React.JSX.Element {
  return (
    <main className={styles.notFound}>
      <p>404</p>
      <h1>这里还没有成长故事</h1>
      <span>你访问的页面不存在，或已经被移动。</span>
      <Link to="/">
        <Home size={17} />
        返回首页
      </Link>
    </main>
  );
}
