import { z } from 'zod';

export const forgotPasswordSchema = z.object({
    email: z.string().email(),
});

export const verifyOtpSchema = z.object({
    email: z.string().email(),
    otp: z.string().length(6),
});

export const resetPasswordSchema = z.object({
    email: z.string().email(),
    otp: z.string().length(6),
    newPassword: z.string().min(8),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
