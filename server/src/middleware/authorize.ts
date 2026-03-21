import { Request, Response, NextFunction } from 'express';
import { Role } from '../generated/prisma';

export const authorize =
  (...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Insufficient permissions', code: 'FORBIDDEN' });
      return;
    }
    next();
  };
