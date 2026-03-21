import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt';
import { JwtPayload } from 'jsonwebtoken';
import { Role } from '../generated/prisma';

/**
 * Like `authenticate`, but does NOT 401 when no token is present.
 * Sets `req.user` if a valid token exists; leaves it undefined otherwise.
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    // No token — continue as guest
    (req as any).user = undefined;
    return next();
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token) as JwtPayload & { id: number; email: string; role: Role };
    req.user = { id: payload.id, email: payload.email, role: payload.role };
  } catch {
    // Invalid token — treat as guest
    (req as any).user = undefined;
  }
  next();
};
