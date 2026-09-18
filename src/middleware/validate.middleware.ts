import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

/**
 * Validates req.body against a zod schema. On failure, responds 400 with
 * the first validation issue. On success, replaces req.body with the
 * parsed (and type-coerced) value.
 * Usage: router.post('/register', validateBody(registerSchema), ...)
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      return res.status(400).json({ error: firstIssue?.message ?? 'invalid request body' });
    }
    req.body = result.data;
    next();
  };
}

/**
 * Rejects with 400 unless req.params.id is a positive integer. Runs before
 * uploadPdf on upload routes, so a bad id never leaves a file on disk.
 */
export function validateIdParam(req: Request, res: Response, next: NextFunction) {
  if (!/^\d+$/.test(req.params.id ?? '')) {
    return res.status(400).json({ error: 'invalid id' });
  }
  next();
}
