import { createBrowserRouter } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { ForgotPasswordPage, LoginPage, RegisterPage } from './AuthPages';
import { LegalPage } from './LegalPage';
import { NotFoundPage } from './NotFoundPage';
import { GuestRoute, ProtectedRoute, RootRedirect } from './route-guards';
import { StatusPage } from './StatusPage';
import {
  AppHomeRedirect,
  ComingSoonPage,
  FamilyPage,
  FamilyShell,
  OnboardingPage,
} from './FamilyApp';

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
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/app',
        element: <FamilyShell />,
        children: [
          { index: true, element: <AppHomeRedirect /> },
          { path: 'onboarding', element: <OnboardingPage /> },
          { path: 'families/:familyId', element: <FamilyPage /> },
          { path: 'timeline', element: <ComingSoonPage title="时间轴" icon="timeline" /> },
          { path: 'gallery', element: <ComingSoonPage title="图集" icon="gallery" /> },
          { path: 'milestones', element: <ComingSoonPage title="里程碑" icon="milestone" /> },
          { path: 'growth', element: <ComingSoonPage title="成长数据" icon="growth" /> },
        ],
      },
    ],
  },
  { path: '/system/status', element: import.meta.env.DEV ? <StatusPage /> : <NotFoundPage /> },
  { path: '*', element: <NotFoundPage /> },
]);
