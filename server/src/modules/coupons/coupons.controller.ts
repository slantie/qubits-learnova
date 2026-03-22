import { Request, Response, NextFunction } from 'express';
import * as service from './coupons.service';

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupons = await service.listCoupons();
    res.json({ coupons });
  } catch (err) { next(err); }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId, discountAmount, expiresAt, usageLimit } = req.body;
    const coupon = await service.createCoupon({
      courseId: courseId ?? null,
      discountAmount: Number(discountAmount),
      expiresAt,
      usageLimit: usageLimit ?? null,
      createdBy: req.user!.id,
    });
    res.status(201).json(coupon);
  } catch (err) { next(err); }
};

export const toggle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupon = await service.toggleCoupon(Number(req.params.id));
    res.json(coupon);
  } catch (err) { next(err); }
};
