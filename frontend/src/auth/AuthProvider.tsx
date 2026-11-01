import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { setUnauthorizedHandler } from '../api/client';
import { authApi } from '../api/endpoints';
import type { User } from '../api/types';
import { isApiError } from '../lib/errors';
import { AuthContext, type AuthContextValue } from './AuthContext';
import { isTokenExpired, msUntilExpiry } from './jwt';
import { TOKEN_KEY, tokenStorage } from './tokenStorage';

type State =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'error' }
  | { status: 'authenticated'; user: User };

// setTimeout overflows above ~24.8 days and would fire immediately.
const MAX_TIMEOUT_MS = 2_147_483_647;

function initialState(): State {
  const token = tokenStorage.get();
  if (!token) return { status: 'anonymous' };
  if (isTokenExpired(token)) {
    tokenStorage.clear();
    return { status: 'anonymous' };
  }
  return { status: 'loading' };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<State>(initialState);

  const logout = useCallback(
    ({ expired = false }: { expired?: boolean } = {}) => {
      const hadSession = tokenStorage.get() !== null;
      tokenStorage.clear();
      // Nothing cached for this user may leak to the next one on this device.
      queryClient.clear();
      setState({ status: 'anonymous' });
      if (expired && hadSession) {
        toast.warning('Your session has expired. Please sign in again.', { id: 'session-expired' });
      }
    },
    [queryClient],
  );

  // Any API call rejected with 401 while signed in ends the session.
  useEffect(() => {
    setUnauthorizedHandler(() => logout({ expired: true }));
    return () => setUnauthorizedHandler(undefined);
  }, [logout]);

  // A stored token: load the profile it belongs to.
  useEffect(() => {
    if (state.status !== 'loading') return;
    let cancelled = false;
    authApi.me().then(
      (user) => {
        if (!cancelled) setState({ status: 'authenticated', user });
      },
      (error: unknown) => {
        if (cancelled) return;
        // A 401 has already signed the user out through the handler above.
        setState(isApiError(error, 401) ? { status: 'anonymous' } : { status: 'error' });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [state.status]);

  // Sign out when the token expires, even if the tab sits idle.
  useEffect(() => {
    if (state.status !== 'authenticated') return;
    const token = tokenStorage.get();
    if (!token) return;
    const ms = msUntilExpiry(token);
    if (!Number.isFinite(ms)) return;
    const id = setTimeout(() => logout({ expired: true }), Math.min(Math.max(ms, 0), MAX_TIMEOUT_MS));
    return () => clearTimeout(id);
  }, [state, logout]);

  // Keep tabs in sync: signing out (or in as someone else) applies everywhere.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== TOKEN_KEY) return;
      queryClient.clear();
      setState(event.newValue ? { status: 'loading' } : { status: 'anonymous' });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [queryClient]);

  const login = useCallback(
    async (username: string, password: string) => {
      const { token } = await authApi.login({ username, password });
      tokenStorage.set(token);
      try {
        const user = await authApi.me();
        queryClient.clear();
        setState({ status: 'authenticated', user });
        return user;
      } catch (error) {
        tokenStorage.clear();
        throw error;
      }
    },
    [queryClient],
  );

  const retry = useCallback(() => setState({ status: 'loading' }), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: state.status,
      user: state.status === 'authenticated' ? state.user : null,
      login,
      logout,
      retry,
    }),
    [state, login, logout, retry],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
