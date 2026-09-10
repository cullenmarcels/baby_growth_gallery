import { createBrowserRouter } from 'react-router-dom';
import { AppHomePage } from './AppHomePage';
import { AuthLayout } from './AuthLayout';
import { ForgotPasswordPage, LoginPage, RegisterPage } from './AuthPages';
import { LegalPage } from './LegalPage';
import { NotFoundPage } from './NotFoundPage';
import { GuestRoute, ProtectedRoute, RootRedirect } from './route-guards';
import { StatusPage } from './StatusPage';

export const router = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },
  {
    element: <GuestRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
          { path: '/forgot-password', element: <ForgotPasswordPage /> },
        ],
      },
    ],
  },
  { path: '/legal/terms', element: <LegalPage kind="terms" /> },
  { path: '/legal/privacy', element: <LegalPage kind="privacy" /> },
  { element: <ProtectedRoute />, children: [{ path: '/app', element: <AppHomePage /> }] },
  { path: '/system/status', element: import.meta.env.DEV ? <StatusPage /> : <NotFoundPage /> },
  { path: '*', element: <NotFoundPage /> },
]);
