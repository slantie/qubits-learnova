import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt';
import { JwtPayload } from 'jsonwebtoken';
import { Role } from '../generated/prisma';

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Missing or invalid authorization header', code: 'UNAUTHORIZED' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token) as JwtPayload & { id: number; email: string; role: Role };
    req.user = { id: payload.id, email: payload.email, role: payload.role };
    next();
  } catch {
    res.status(401).json({ message: 'Token is invalid or expired', code: 'INVALID_TOKEN' });
  }
};
