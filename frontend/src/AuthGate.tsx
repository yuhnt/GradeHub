// From 'react-router', not 'react-router/dom': the /dom entry only adds
// flushSync support (unused here) and loads a second copy of the router
// context under Vitest, which breaks every route hook in tests.
import { RouterProvider, type createBrowserRouter } from 'react-router';
import { useAuth } from './auth/AuthContext';
import { LoadingState } from './components/ui/Spinner';
import { ServerUnavailablePage } from './pages/StatusPages';

type Router = ReturnType<typeof createBrowserRouter>;

/** Holds the router back until we know who is signed in. */
export function AuthGate({ router }: { router: Router }) {
  const { status } = useAuth();
  if (status === 'loading') return <LoadingState className="min-h-dvh" label="Signing you in…" />;
  if (status === 'error') return <ServerUnavailablePage />;
  return <RouterProvider router={router} />;
}
