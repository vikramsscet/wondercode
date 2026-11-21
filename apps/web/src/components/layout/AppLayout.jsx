import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import ErrorBoundary from '../common/ErrorBoundary.jsx';
import { Button, buttonClasses } from '../ui/index.js';

export default function AppLayout() {
  const { user, signOut } = useAuth();
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-10 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <Link to="/" className="text-2xl font-extrabold tracking-tight text-brand-700">
            Wonder<span className="text-sun-500">Code</span>
          </Link>
          <nav aria-label="Main" className="flex flex-wrap items-center gap-2">
            {user ? (
              <>
                <Link to="/profiles" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
                  Profiles
                </Link>
                <Link to="/parent" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
                  Parent area
                </Link>
                <Button variant="outline" size="sm" onClick={signOut}>
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Link to="/sign-in" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
                  Parent sign in
                </Link>
                <Link to="/sign-up" className={buttonClasses({ variant: 'primary', size: 'sm' })}>
                  Create account
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
