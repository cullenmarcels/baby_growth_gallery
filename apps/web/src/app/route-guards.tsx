import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import styles from './AuthPages.module.css';
import { safeReturnPath } from './safe-return-path';

export function RootRedirect(): React.JSX.Element {
  const auth = useAuth();
  if (auth.isLoading) return <SessionLoading />;
  return <Navigate replace to={auth.account ? '/app' : '/login'} />;
}

export function ProtectedRoute(): React.JSX.Element {
  const auth = useAuth();
  const location = useLocation();
  if (auth.isLoading) return <SessionLoading />;
  if (!auth.account) {
    return (
      <Navigate
        replace
        to="/login"
        state={{ returnPath: safeReturnPath(`${location.pathname}${location.search}`) }}
      />
    );
  }
  return <Outlet />;
}

export function GuestRoute(): React.JSX.Element {
  const auth = useAuth();
  if (auth.isLoading) return <SessionLoading />;
  return auth.account ? <Navigate replace to="/app" /> : <Outlet />;
}

export function SessionLoading(): React.JSX.Element {
  return (
    <main className={styles.loadingPage} aria-live="polite" aria-busy="true">
      <span className={styles.loadingMark} aria-hidden="true" />
      <p>正在恢复安全会话…</p>
    </main>
  );
}
