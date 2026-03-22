import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import * as ctrl from './payments.controller';

const router = Router();

router.get('/courses/:courseId/pricing', ctrl.getPricing);
router.post('/coupons/validate', authenticate, ctrl.validateCoupon);
router.post('/create-order', authenticate, ctrl.createOrder);
router.post('/verify', authenticate, ctrl.verifyPayment);

export default router;
