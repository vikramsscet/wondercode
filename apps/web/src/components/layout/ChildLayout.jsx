import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import ErrorBoundary from '../common/ErrorBoundary.jsx';
import { Button } from '../ui/index.js';
import Avatar from '../../features/child-profile/Avatar.jsx';
import { useChildProfiles } from '../../features/child-profile/ChildProfilesContext.jsx';

// Layout for the child learning area. Deliberately has no parent links, account menu or sign-out:
// parent-only functionality stays out of child-facing screens.
export default function ChildLayout() {
  const { active } = useChildProfiles();
  const navigate = useNavigate();
  const wide = useLocation().pathname.startsWith('/workspace'); // the workspace needs more room
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <Link to="/dashboard" className="text-2xl font-extrabold tracking-tight text-brand-700">
            Wonder<span className="text-sun-500">Code</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2" data-testid="active-child">
              <Avatar avatarKey={active.avatarKey} size="sm" />
              <span className="font-bold">{active.displayName}</span>
            </span>
            <Button variant="outline" size="sm" onClick={() => navigate('/profiles')}>
              Switch profile
            </Button>
          </div>
        </div>
      </header>
      <main
        className={`mx-auto w-full ${wide ? 'max-w-7xl' : 'max-w-5xl'} flex-1 px-4 py-8 sm:px-6 sm:py-10`}
      >
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
