import { Link, Outlet } from 'react-router-dom';
import ErrorBoundary from '../common/ErrorBoundary.jsx';

export default function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-xl font-extrabold text-indigo-600">
            WonderCode
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
