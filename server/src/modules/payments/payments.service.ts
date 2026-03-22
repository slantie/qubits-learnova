import Razorpay from 'razorpay';
import crypto from 'crypto';
import prisma from '../../lib/prisma';
import { AppError } from '../../config/AppError';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// ─── Pricing ──────────────────────────────────────────────────────────────────

export async function getCoursePricing(courseId: number) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { price: true, earlyBirdPrice: true, earlyBirdLimit: true, earlyBirdEnrolledCount: true },
  });
  if (!course) throw new AppError(404, 'Course not found', 'COURSE_NOT_FOUND');

  const basePrice = course.price ? Number(course.price) : 0;
  const earlyBirdActive =
    course.earlyBirdPrice !== null &&
    course.earlyBirdLimit !== null &&
    course.earlyBirdEnrolledCount < course.earlyBirdLimit;

  const effectivePrice = earlyBirdActive ? Number(course.earlyBirdPrice) : basePrice;
  const spotsLeft = earlyBirdActive ? (course.earlyBirdLimit! - course.earlyBirdEnrolledCount) : null;

  return { basePrice, effectivePrice, earlyBirdActive, spotsLeft };
}

// ─── Coupon validation (internal helper) ──────────────────────────────────────

export async function validateCouponInternal(code: string, courseId: number) {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
  if (!coupon || !coupon.isActive) throw new AppError(400, 'Invalid or inactive coupon', 'INVALID_COUPON');
  if (coupon.expiresAt < new Date()) throw new AppError(400, 'Coupon has expired', 'COUPON_EXPIRED');
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw new AppError(400, 'Coupon usage limit reached', 'COUPON_EXHAUSTED');
  }
  if (coupon.courseId !== null && coupon.courseId !== courseId) {
    throw new AppError(400, 'Coupon is not valid for this course', 'COUPON_INVALID_COURSE');
  }
  return coupon;
}

// ─── Create Razorpay order ────────────────────────────────────────────────────

export async function createOrder(userId: number, courseId: number, couponCode?: string) {
  const { effectivePrice } = await getCoursePricing(courseId);

  let discountAmount = 0;
  if (couponCode) {
    const coupon = await validateCouponInternal(couponCode, courseId);
    discountAmount = Number(coupon.discountAmount);
  }

  const finalPrice = Math.max(0, effectivePrice - discountAmount);
  const amountPaise = Math.round(finalPrice * 100);

  // Create Razorpay order (minimum 1 paise)
  const order = await razorpay.orders.create({
    amount: Math.max(amountPaise, 100),
    currency: 'INR',
    receipt: `course_${courseId}_user_${userId}_${Date.now()}`,
  });

  // Save pending payment record
  await prisma.payment.create({
    data: {
      userId,
      courseId,
      razorpayOrderId: order.id,
      amount: amountPaise,
      couponCode: couponCode?.toUpperCase() ?? null,
      status: 'pending',
    },
  });

  return {
    orderId: order.id,
    amount: amountPaise,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID,
  };
}

// ─── Verify payment & enroll ──────────────────────────────────────────────────

export async function verifyPayment(
  userId: number,
  courseId: number,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
  couponCode?: string,
) {
  // 1. Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    // Record failed payment
    await prisma.payment.updateMany({
      where: { razorpayOrderId },
      data: { status: 'failed', razorpayPaymentId },
    });
    throw new AppError(400, 'Payment verification failed', 'SIGNATURE_MISMATCH');
  }

  // 2. Fetch payment record
  const payment = await prisma.payment.findUnique({ where: { razorpayOrderId } });
  if (!payment || payment.userId !== userId || payment.courseId !== courseId) {
    throw new AppError(400, 'Payment record not found or mismatch', 'PAYMENT_NOT_FOUND');
  }

  // 3. Atomic transaction: enroll + update counters
  await prisma.$transaction(async tx => {
    // Update payment record
    await tx.payment.update({
      where: { razorpayOrderId },
      data: { status: 'success', razorpayPaymentId },
    });

    // Enroll
    await tx.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: { userId, courseId },
      update: {},
    });

    // Increment early bird counter if applicable
    const course = await tx.course.findUnique({
      where: { id: courseId },
      select: { earlyBirdLimit: true, earlyBirdEnrolledCount: true },
    });
    if (course?.earlyBirdLimit !== null && course!.earlyBirdEnrolledCount < course!.earlyBirdLimit!) {
      await tx.course.update({
        where: { id: courseId },
        data: { earlyBirdEnrolledCount: { increment: 1 } },
      });
    }

    // Increment coupon used count
    if (couponCode) {
      await tx.coupon.update({
        where: { code: couponCode.toUpperCase() },
        data: { usedCount: { increment: 1 } },
      });
    }
  });

  return { success: true, enrollmentCreated: true };
}
