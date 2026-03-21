import { Request, Response, NextFunction } from 'express';
import prisma from '../../lib/prisma';
import { Role } from '../../generated/prisma';

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roleParam = req.query.role as string | undefined;
    const roles: Role[] = roleParam
      ? (roleParam.split(',').filter(r => ['ADMIN', 'INSTRUCTOR', 'LEARNER'].includes(r)) as Role[])
      : [];

    const users = await prisma.user.findMany({
      where: roles.length > 0 ? { role: { in: roles } } : undefined,
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });

    res.json({ users });
  } catch (err) { next(err); }
};
