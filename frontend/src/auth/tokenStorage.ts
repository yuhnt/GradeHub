// The JWT lives in localStorage so a session survives reloads and new tabs.
// Trade-off: any script running on the page can read it, so the app must
// never render untrusted HTML (React escapes text by default). Moving to an
// httpOnly cookie needs backend changes; see docs/frontend-requirements.md.

export const TOKEN_KEY = 'tgh.token';

export const tokenStorage = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  set(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Storage disabled (private mode, policy): the session lasts for this page only.
    }
  },

  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Nothing stored, nothing to clear.
    }
  },
};
