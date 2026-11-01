import { NavLink, Outlet } from 'react-router';
import { LogOut } from 'lucide-react';
import { useCurrentUser, useAuth } from '../../auth/AuthContext';
import { cn } from '../../lib/cn';
import { Badge } from '../ui/Badge';
import { Logo } from './Logo';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  );

export function AppLayout() {
  const user = useCurrentUser();
  const { logout } = useAuth();

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded bg-white px-3 py-2 text-sm font-medium focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Logo to="/tasks" />
          <nav aria-label="Main" className="flex flex-1 items-center gap-1">
            <NavLink to="/tasks" className={navLinkClass}>
              Tasks
            </NavLink>
            {user.role === 'student' && (
              <NavLink to="/my-submissions" className={navLinkClass}>
                My submissions
              </NavLink>
            )}
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-900">{user.username}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <Badge tone={user.role === 'teacher' ? 'indigo' : 'sky'}>
              {user.role === 'teacher' ? 'Teacher' : 'Student'}
            </Badge>
            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <LogOut aria-hidden="true" className="size-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
