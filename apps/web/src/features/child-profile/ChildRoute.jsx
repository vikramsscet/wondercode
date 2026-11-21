import { Navigate, Outlet } from 'react-router-dom';
import { LoadingState } from '../../components/ui/index.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { useChildProfiles } from './ChildProfilesContext.jsx';

// Child learning area: needs a signed-in parent AND an active child that belongs to them.
export default function ChildRoute() {
  const { user, loading: authLoading } = useAuth();
  const { active, loading } = useChildProfiles();
  if (authLoading || (user && loading)) return <LoadingState />;
  if (!user) return <Navigate to="/sign-in" replace />;
  if (!active) return <Navigate to="/profiles" replace />;
  return <Outlet />;
}
