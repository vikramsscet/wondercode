import AppLayout from '../components/layout/AppLayout.jsx';
import DesignSystemPage from '../pages/DesignSystemPage.jsx';
import LandingPage from '../features/onboarding/LandingPage.jsx';
import GuestHomePage from '../pages/GuestHomePage.jsx';
import GuestRoute from '../features/guest/GuestRoute.jsx';
import ParentLayout from '../features/parent-dashboard/ParentLayout.jsx';
import ParentChildrenPage from '../pages/ParentChildrenPage.jsx';
import ParentOverviewPage from '../pages/ParentOverviewPage.jsx';
import {
  ParentPrivacyPage,
  ParentProgressPage,
  ParentProjectsPage,
  ParentUsagePage,
} from '../pages/ParentShellPages.jsx';
import ProtectedRoute from '../features/auth/ProtectedRoute.jsx';
import AuthForm from '../features/auth/AuthForm.jsx';
import ChildLayout from '../components/layout/ChildLayout.jsx';
import ChildRoute from '../features/child-profile/ChildRoute.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import ProfilePickerPage from '../pages/ProfilePickerPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';

// The style guide is only available in development builds.
const devRoutes = import.meta.env.DEV ? [{ path: '/design', element: <DesignSystemPage /> }] : [];

export const routes = [
  {
    // Child learning area: its own layout without any parent controls.
    element: <ChildRoute />,
    children: [
      { element: <ChildLayout />, children: [{ path: '/dashboard', element: <DashboardPage /> }] },
    ],
  },
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      ...devRoutes,
      { path: '/sign-in', element: <AuthForm mode="sign-in" /> },
      { path: '/sign-up', element: <AuthForm mode="sign-up" /> },
      { element: <GuestRoute />, children: [{ path: '/try', element: <GuestHomePage /> }] },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: '/parent',
            element: <ParentLayout />,
            children: [
              { index: true, element: <ParentOverviewPage /> },
              { path: 'children', element: <ParentChildrenPage /> },
              { path: 'projects', element: <ParentProjectsPage /> },
              { path: 'progress', element: <ParentProgressPage /> },
              { path: 'usage', element: <ParentUsagePage /> },
              { path: 'privacy', element: <ParentPrivacyPage /> },
            ],
          },
          { path: '/profiles', element: <ProfilePickerPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
