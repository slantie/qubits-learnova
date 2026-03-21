import { Request, Response, NextFunction } from 'express';
import * as svc from './forgot-password.service';

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await svc.requestOtp(req.body);
        // Always 200 to avoid user enumeration
        res.json({ message: 'If that email is registered, a code has been sent.' });
    } catch (err) {
        next(err);
    }
};

export const verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, otp } = req.body;
        await svc.verifyOtp(email, otp);
        res.json({ valid: true });
    } catch (err) {
        next(err);
    }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await svc.resetPassword(req.body);
        res.json({ message: 'Password reset successfully. You can now log in.' });
    } catch (err) {
        next(err);
    }
};
