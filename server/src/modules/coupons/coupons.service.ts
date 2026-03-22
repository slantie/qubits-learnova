import crypto from 'crypto';
import prisma from '../../lib/prisma';
import { AppError } from '../../config/AppError';

function generateCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

export async function listCoupons() {
  return prisma.coupon.findMany({
    orderBy: { createdAt: 'desc' },
    include: { course: { select: { id: true, title: true } } },
  });
}

export async function createCoupon(data: {
  courseId?: number | null;
  discountAmount: number;
  expiresAt: string;
  usageLimit?: number | null;
  createdBy: number;
}) {
  let code = generateCode();
  // Ensure uniqueness (retry on collision, very unlikely)
  let attempts = 0;
  while (attempts < 5) {
    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (!existing) break;
    code = generateCode();
    attempts++;
  }

  return prisma.coupon.create({
    data: {
      code,
      courseId: data.courseId ?? null,
      discountAmount: data.discountAmount,
      expiresAt: new Date(data.expiresAt),
      usageLimit: data.usageLimit ?? null,
      createdBy: data.createdBy,
    },
  });
}

export async function toggleCoupon(couponId: number) {
  const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
  if (!coupon) throw new AppError(404, 'Coupon not found', 'COUPON_NOT_FOUND');
  return prisma.coupon.update({ where: { id: couponId }, data: { isActive: !coupon.isActive } });
}
