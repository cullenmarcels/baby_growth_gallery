import type { AccountSummary } from '@baby-growth-gallery/api-client';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import styles from './AuthPages.module.css';
import { safeReturnPath } from './safe-return-path';

// The router and login form share the same post-authentication rules.
// eslint-disable-next-line react-refresh/only-export-components
export function accountDestination(account: AccountSummary): string {
  if (account.mustChangePassword || account.mustAcceptTerms) return '/change-password';
  return account.siteRole === 'SUPER_ADMIN' ? '/admin' : '/app';
}

export function RootRedirect(): React.JSX.Element {
  const auth = useAuth();
  if (auth.isLoading) return <SessionLoading />;
  return <Navigate replace to={auth.account ? accountDestination(auth.account) : '/login'} />;
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
  if (
    (auth.account.mustChangePassword || auth.account.mustAcceptTerms) &&
    location.pathname !== '/change-password'
  ) {
    return <Navigate replace to="/change-password" />;
  }
  return <Outlet />;
}

export function SuperAdminRoute(): React.JSX.Element {
  const { account } = useAuth();
  if (account?.siteRole !== 'SUPER_ADMIN') {
    return <main role="alert">只有超管可以访问此页面。</main>;
  }
  return <Outlet />;
}

export function GuestRoute(): React.JSX.Element {
  const auth = useAuth();
  if (auth.isLoading) return <SessionLoading />;
  return auth.account ? <Navigate replace to={accountDestination(auth.account)} /> : <Outlet />;
}

export function SessionLoading(): React.JSX.Element {
  return (
    <main className={styles.loadingPage} aria-live="polite" aria-busy="true">
      <span className={styles.loadingMark} aria-hidden="true" />
      <p>正在恢复安全会话…</p>
    </main>
  );
}
