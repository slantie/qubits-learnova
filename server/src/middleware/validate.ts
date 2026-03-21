import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validate =
  (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(result.error);
      return;
    }
    // req.query is a read-only getter in Express 5 — mutate properties, don't replace
    if (source === 'query') {
      Object.assign(req.query, result.data);
    } else {
      req[source] = result.data;
    }
    next();
  };
