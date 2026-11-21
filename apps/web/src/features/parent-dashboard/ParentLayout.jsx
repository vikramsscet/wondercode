import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '../../utils/cn.js';

const tabs = [
  { to: '/parent', label: 'Overview', end: true },
  { to: '/parent/children', label: 'Children' },
  { to: '/parent/projects', label: 'Projects' },
  { to: '/parent/progress', label: 'Progress' },
  { to: '/parent/usage', label: 'Usage' },
  { to: '/parent/privacy', label: 'Privacy' },
];

const tabClass = ({ isActive }) =>
  cn(
    'whitespace-nowrap rounded-full px-4 py-2 font-bold',
    isActive ? 'bg-brand-600 text-white' : 'text-brand-800 hover:bg-brand-100',
  );

// Shell for the parent dashboard (parent-only; lives under ProtectedRoute, never inside the child area).
export default function ParentLayout() {
  return (
    <div>
      <h1 className="text-3xl font-extrabold text-brand-800">Parent dashboard</h1>
      <nav
        aria-label="Parent dashboard"
        className="-mx-4 mt-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"
      >
        <ul className="flex min-w-max gap-2">
          {tabs.map((tab) => (
            <li key={tab.to}>
              <NavLink to={tab.to} end={tab.end} className={tabClass}>
                {tab.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-8">
        <Outlet />
      </div>
    </div>
  );
}
