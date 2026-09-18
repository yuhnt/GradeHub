interface JwtClaims {
  userId?: string;
  role?: string;
  /** Expiry, in seconds since the epoch. */
  exp?: number;
}

/**
 * Reads the claims of a JWT without verifying it. Only used to know when
 * the session ends; the backend verifies the signature on every request.
 */
export function decodeJwt(token: string): JwtClaims | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const claims: unknown = JSON.parse(atob(padded));
    return typeof claims === 'object' && claims !== null ? (claims as JwtClaims) : null;
  } catch {
    return null;
  }
}

/** Milliseconds until the token expires; Infinity when it has no expiry. */
export function msUntilExpiry(token: string, now = Date.now()): number {
  const exp = decodeJwt(token)?.exp;
  return typeof exp === 'number' ? exp * 1000 - now : Infinity;
}

export function isTokenExpired(token: string, now = Date.now()): boolean {
  return decodeJwt(token) === null || msUntilExpiry(token, now) <= 0;
}
