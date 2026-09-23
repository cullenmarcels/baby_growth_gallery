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
import {
  BabyCreatePage,
  BabyEntryRedirect,
  BabyHomePage,
  BabyManagePage,
  BabyWaitingPage,
} from './BabyApp';
import { PhotoManagePage, PhotoUploadPage } from './PhotoApp';
import { BabyAvatarPickerPage, GalleryPage, PhotoDetailPage, TimelinePage } from './PhotoBrowse';
import { MilestoneDetailPage, MilestoneNewPage, MilestonePage } from './MilestoneApp';

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
      { path: '/app/photos/upload', element: <PhotoUploadPage /> },
      {
        path: '/app',
        element: <FamilyShell />,
        children: [
          { index: true, element: <AppHomeRedirect /> },
          { path: 'baby-entry', element: <BabyEntryRedirect /> },
          { path: 'home', element: <BabyHomePage /> },
          { path: 'babies/new', element: <BabyCreatePage /> },
          { path: 'babies/manage', element: <BabyManagePage /> },
          { path: 'babies/avatar', element: <BabyAvatarPickerPage /> },
          { path: 'babies/waiting', element: <BabyWaitingPage /> },
          { path: 'photos/manage', element: <PhotoManagePage /> },
          { path: 'photos/:photoId', element: <PhotoDetailPage /> },
          { path: 'onboarding', element: <OnboardingPage /> },
          { path: 'families/:familyId', element: <FamilyPage /> },
          { path: 'timeline', element: <TimelinePage /> },
          { path: 'gallery', element: <GalleryPage /> },
          { path: 'milestones', element: <MilestonePage /> },
          { path: 'milestones/new', element: <MilestoneNewPage /> },
          { path: 'milestones/:milestoneId', element: <MilestoneDetailPage /> },
          { path: 'growth', element: <ComingSoonPage title="成长数据" icon="growth" /> },
        ],
      },
    ],
  },
  { path: '/system/status', element: import.meta.env.DEV ? <StatusPage /> : <NotFoundPage /> },
  { path: '*', element: <NotFoundPage /> },
]);
