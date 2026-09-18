import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';

// Extend Express's Request type so req.user is known everywhere downstream.
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Verifies the Authorization: Bearer <token> header.
 * On success, attaches the decoded payload to req.user.
 * On failure, responds 401 and stops the request here.
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'authentication required' });
  }

  const token = header.slice('Bearer '.length);

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'invalid or expired token' });
  }
}

type Role = JwtPayload['role'];

/**
 * Must run after authenticate(). Rejects with 403 if the authenticated
 * user's role isn't in the allowed list.
 * Usage: router.post('/tasks', authenticate, authorize('teacher'), ...)
 *        router.post('/tasks', authenticate, authorize(['teacher'], 'only teachers'), ...)
 */
export function authorize(
  roles: Role | Role[],
  message = 'not allowed to perform this action'
) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: message });
    }
    next();
  };
}

/** The authenticated user's id as a bigint. Only call after authenticate(). */
export function currentUserId(req: Request): bigint {
  if (!req.user) {
    throw new Error('currentUserId() called before authenticate()');
  }
  return BigInt(req.user.userId);
}
