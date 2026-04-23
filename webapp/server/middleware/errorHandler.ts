import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../lib/errors.js';

// Express 5 requires error middleware to have exactly 4 params
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    const body: Record<string, unknown> = { error: err.message, code: err.code };
    if (err instanceof ValidationError && err.details) {
      body.details = err.details;
    }
    res.status(err.statusCode).json(body);
    return;
  }

  console.error('[server] Unhandled error:', err.message, err.stack);
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
}
