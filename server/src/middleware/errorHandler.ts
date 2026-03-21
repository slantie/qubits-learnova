import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../config/AppError';

function log(level: 'warn' | 'error', req: Request, err: unknown, statusCode: number) {
  const base = {
    ts: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    status: statusCode,
  };

  if (err instanceof Error) {
    const entry = { ...base, name: err.name, message: err.message };
    if (level === 'error') {
      console.error(JSON.stringify({ ...entry, stack: err.stack }));
    } else {
      console.warn(JSON.stringify(entry));
    }
  } else {
    console.error(JSON.stringify({ ...base, err }));
  }
}

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Zod validation error — 400, client mistake, warn only
  if (err instanceof ZodError) {
    log('warn', req, err, 400);
    res.status(400).json({
      message: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: err.flatten(),
    });
    return;
  }

  // Known application error — use its status; warn for 4xx, error for 5xx
  if (err instanceof AppError) {
    log(err.statusCode < 500 ? 'warn' : 'error', req, err, err.statusCode);
    res.status(err.statusCode).json({
      message: err.message,
      code: err.code ?? 'APP_ERROR',
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
    return;
  }

  // Unexpected error — always log as error with full stack
  log('error', req, err, 500);
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ message, code: 'INTERNAL_SERVER_ERROR' });
};
