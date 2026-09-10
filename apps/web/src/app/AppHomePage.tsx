import { Heart, LogOut, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { api } from './api';
import styles from './ProductPages.module.css';

export function AppHomePage(): React.JSX.Element {
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string>();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout(): Promise<void> {
    setLoggingOut(true);
    setError(undefined);
    try {
      await api.logout();
      auth.setAccount(null);
      await navigate('/login', { replace: true });
    } catch {
      setError('退出失败，请检查网络后重试。');
      setLoggingOut(false);
    }
  }

  return (
    <main className={styles.appPage}>
      <header className={styles.appHeader}>
        <div className={styles.brand}>
          <span>
            <Heart size={18} fill="currentColor" />
          </span>
          小福宝成长记
        </div>
        <button type="button" disabled={loggingOut} onClick={() => void logout()}>
          <LogOut size={17} />
          {loggingOut ? '正在退出…' : '退出登录'}
        </button>
      </header>
      <section className={styles.welcomeCard}>
        <span className={styles.securityIcon}>
          <ShieldCheck size={28} />
        </span>
        <p className={styles.eyebrow}>安全会话已建立</p>
        <h1>欢迎回来</h1>
        <p>
          当前账号：<strong>{auth.account?.phoneMasked}</strong>
        </p>
        <p className={styles.muted}>
          家庭空间将在下一阶段开放。届时你可以选择创建家庭或使用邀请口令加入，不会自动生成示例家庭。
        </p>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
      </section>
    </main>
  );
}
