import prisma from '../../lib/prisma';
import { hashPassword, comparePassword } from '../../lib/hash';
import { signToken } from '../../lib/jwt';
import { AppError } from '../../config/AppError';
import type { SignupInput, LoginInput } from './auth.schema';

export const signup = async (data: SignupInput) => {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError(409, 'Email already in use', 'EMAIL_TAKEN');

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: { email: data.email, name: data.name, passwordHash, role: 'LEARNER' },
    select: { id: true, name: true, email: true, role: true },
  });

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  return { user, token };
};

export const login = async (data: LoginInput) => {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');

  const valid = await comparePassword(data.password, user.passwordHash);
  if (!valid) throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  const { passwordHash: _, ...safeUser } = user;
  return { user: safeUser, token };
};

export const getMe = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, role: true,
      totalPoints: true, currentBadge: true, createdAt: true,
    },
  });
  if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
  return user;
};
