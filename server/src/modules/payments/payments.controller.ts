import { Request, Response, NextFunction } from 'express';
import * as service from './payments.service';

export const getPricing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = Number(req.params.courseId);
    const pricing = await service.getCoursePricing(courseId);
    res.json(pricing);
  } catch (err) { next(err); }
};

export const validateCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, courseId } = req.body;
    const { effectivePrice } = await service.getCoursePricing(Number(courseId));
    const coupon = await service.validateCouponInternal(code, Number(courseId));
    const discountAmount = Number(coupon.discountAmount);
    const finalPrice = Math.max(0, effectivePrice - discountAmount);
    res.json({ valid: true, discountAmount, finalPrice });
  } catch (err) { next(err); }
};

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId, couponCode } = req.body;
    const result = await service.createOrder(req.user!.id, Number(courseId), couponCode);
    res.json(result);
  } catch (err) { next(err); }
};

export const verifyPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, courseId, couponCode } = req.body;
    const result = await service.verifyPayment(
      req.user!.id,
      Number(courseId),
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      couponCode,
    );
    res.json(result);
  } catch (err) { next(err); }
};
