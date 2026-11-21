import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import ErrorBoundary from '../components/common/ErrorBoundary.jsx';
import { AuthProvider } from '../features/auth/AuthContext.jsx';
import { ChildProfilesProvider } from '../features/child-profile/ChildProfilesContext.jsx';
import { GuestProvider } from '../features/guest/GuestContext.jsx';
import { routes } from './routes.jsx';

const router = createBrowserRouter(routes);

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ChildProfilesProvider>
          <GuestProvider>
            <RouterProvider router={router} />
          </GuestProvider>
        </ChildProfilesProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
