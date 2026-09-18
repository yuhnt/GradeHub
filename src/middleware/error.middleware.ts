import { Request, Response, NextFunction } from 'express';

/**
 * Throw this from anywhere in a controller/service to produce a clean,
 * predictable JSON error response instead of a generic 500.
 * Example: throw new ApiError(404, 'task not found');
 */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Wraps an async route handler so thrown errors (including rejected
 * promises) are forwarded to the error middleware below, instead of
 * crashing the process or hanging the request.
 * Usage: router.post('/x', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// Must be registered LAST, after all routes, in app.ts.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message });
  }

  // Malformed JSON body, raised by express.json() before any route runs.
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'malformed JSON body' });
  }

  console.error(err);
  return res.status(500).json({ error: 'internal server error' });
}
