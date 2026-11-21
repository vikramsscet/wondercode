import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

// Parent-only area. Child-facing routes must never be nested under this without a child guard.
export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="text-center text-ink-600">Loading…</p>;
  if (!user) return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
