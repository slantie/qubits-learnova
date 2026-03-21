import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { signupSchema, loginSchema } from './auth.schema';
import { forgotPasswordSchema, verifyOtpSchema, resetPasswordSchema } from './forgot-password.schema';
import * as authController from './auth.controller';
import * as fpController from './forgot-password.controller';

const router = Router();

router.post('/signup', validate(signupSchema), authController.signup);
router.post('/login', validate(loginSchema), authController.login);
router.get('/me', authenticate, authController.me);
router.post('/logout', authenticate, authController.logout);

// Forgot password flow (no auth required)
router.post('/forgot-password', validate(forgotPasswordSchema), fpController.forgotPassword);
router.post('/verify-otp', validate(verifyOtpSchema), fpController.verifyOtp);
router.post('/reset-password', validate(resetPasswordSchema), fpController.resetPassword);

export default router;
