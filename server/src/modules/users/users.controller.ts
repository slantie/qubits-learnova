import { Request, Response, NextFunction } from 'express';
import prisma from '../../lib/prisma';
import { Role } from '../../generated/prisma';
import { comparePassword, hashPassword } from '../../lib/hash';
import { AppError } from '../../config/AppError';
import { uploadToCloudinary } from '../../lib/cloudinary';
import { sendMail } from '../../lib/mailer';

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

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      throw new AppError(400, 'currentPassword and newPassword are required', 'MISSING_FIELDS');
    }
    if (newPassword.length < 8) {
      throw new AppError(400, 'New password must be at least 8 characters', 'PASSWORD_TOO_SHORT');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { passwordHash: true },
    });
    if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');

    const match = await comparePassword(currentPassword, user.passwordHash);
    if (!match) throw new AppError(400, 'Current password is incorrect', 'WRONG_PASSWORD');

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash } });

    res.json({ message: 'Password updated successfully' });
  } catch (err) { next(err); }
};

export const getMyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, avatarUrl: true, bio: true, profilePublic: true, createdAt: true },
    });
    if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    res.json({ user });
  } catch (err) { next(err); }
};

export const updateMyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, bio, profilePublic } = req.body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        throw new AppError(400, 'Name cannot be empty', 'INVALID_NAME');
      }
      data.name = name.trim();
    }
    if (bio !== undefined) data.bio = typeof bio === 'string' ? bio.trim() || null : null;
    if (profilePublic !== undefined) data.profilePublic = Boolean(profilePublic);

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, name: true, email: true, role: true, avatarUrl: true, bio: true, profilePublic: true },
    });
    res.json({ user });
  } catch (err) { next(err); }
};

export const contactUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) throw new AppError(400, 'subject and message are required', 'MISSING_FIELDS');

    const target = await prisma.user.findUnique({
      where: { id: Number(req.params.id) },
      select: { email: true, name: true },
    });
    if (!target) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');

    await sendMail({ to: target.email, subject, html: message });
    res.json({ message: 'Message sent successfully' });
  } catch (err) { next(err); }
};

export const uploadMyAvatar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError(400, 'No file uploaded', 'NO_FILE');
    const { url } = await uploadToCloudinary(req.file.buffer, 'avatars', { resourceType: 'image' });
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl: url },
      select: { id: true, avatarUrl: true },
    });
    res.json({ avatarUrl: user.avatarUrl });
  } catch (err) { next(err); }
};
