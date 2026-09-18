import { createContext, useContext } from 'react';
import type { User } from '../api/types';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'error';

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  /** Signs in and loads the profile. Rejects with an ApiError on failure. */
  login: (username: string, password: string) => Promise<User>;
  /** Discards the token (decision 3: logout is client-side). */
  logout: (options?: { expired?: boolean }) => void;
  /** Retries loading the profile after a network failure on startup. */
  retry: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}

/** The signed-in user. Only for components rendered behind RequireAuth. */
export function useCurrentUser(): User {
  const { user } = useAuth();
  if (!user) throw new Error('useCurrentUser needs a signed-in user');
  return user;
}
