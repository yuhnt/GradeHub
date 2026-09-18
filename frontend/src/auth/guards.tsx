import { Navigate, Outlet, useLocation } from 'react-router';
import type { Role } from '../api/types';
import { ForbiddenState } from '../pages/StatusPages';
import { useAuth } from './AuthContext';

/** Signed-in users only; others go to /login and come back afterwards. */
export function RequireAuth() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

/** One role only. The backend enforces this too; this just explains it. */
export function RequireRole({ role }: { role: Role }) {
  const { user } = useAuth();
  if (user?.role !== role) {
    return (
      <ForbiddenState
        description={role === 'teacher' ? 'This page is for teachers.' : 'This page is for students.'}
      />
    );
  }
  return <Outlet />;
}

/** Where the user was headed before RequireAuth sent them to sign in. */
function returnPath(state: unknown): string {
  const from = (state as { from?: { pathname?: string; search?: string } } | null)?.from;
  return from?.pathname ? `${from.pathname}${from.search ?? ''}` : '/tasks';
}

/**
 * Sign-in and registration. Once signed in, this is the one place that
 * redirects, so it can't race a page's own navigate() call.
 */
export function PublicOnly() {
  const { user } = useAuth();
  const location = useLocation();
  if (user) return <Navigate to={returnPath(location.state)} replace />;
  return <Outlet />;
}
