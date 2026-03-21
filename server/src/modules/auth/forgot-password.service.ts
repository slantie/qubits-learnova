import crypto from 'crypto';
import prisma from '../../lib/prisma';
import { hashPassword } from '../../lib/hash';
import { sendMail } from '../../lib/mailer';
import { AppError } from '../../config/AppError';
import type { ForgotPasswordInput, ResetPasswordInput } from './forgot-password.schema';

// OTP lives for 10 minutes
const OTP_TTL_MS = 10 * 60 * 1000;

/** Generate a random 6-digit OTP, hash it, store in DB, send email */
export const requestOtp = async ({ email }: ForgotPasswordInput) => {
    const user = await prisma.user.findUnique({ where: { email } });
    // Don't reveal whether the email exists — always respond 200
    if (!user) return;

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const otpExpiry = new Date(Date.now() + OTP_TTL_MS);

    await prisma.user.update({
        where: { email },
        data: { otpHash, otpExpiry },
    });

    const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #007067; margin-bottom: 8px;">Reset your password</h2>
      <p style="color: #64748b; margin-bottom: 24px;">Use the code below to reset your Learnova password. It expires in <strong>10 minutes</strong>.</p>
      <div style="font-size: 36px; font-weight: 600; letter-spacing: 0.15em; text-align: center; padding: 20px; background: #f1f5f9; border-radius: 6px; color: #0f172a; margin-bottom: 24px;">
        ${otp}
      </div>
      <p style="color: #94a3b8; font-size: 13px;">If you didn't request a password reset, you can safely ignore this email.</p>
    </div>
  `;

    await sendMail({
        to: email,
        subject: 'Your Learnova password reset code',
        html,
        text: `Your Learnova password reset OTP is: ${otp}. It expires in 10 minutes.`,
    });
};

/** Verify OTP only (for front-end step 2 validation) */
export const verifyOtp = async (email: string, otp: string) => {
    const user = await prisma.user.findUnique({
        where: { email },
        select: { otpHash: true, otpExpiry: true },
    });

    if (!user?.otpHash || !user?.otpExpiry) {
        throw new AppError(400, 'No OTP requested for this email', 'OTP_NOT_FOUND');
    }

    if (new Date() > user.otpExpiry) {
        throw new AppError(400, 'OTP has expired. Please request a new one.', 'OTP_EXPIRED');
    }

    const hash = crypto.createHash('sha256').update(otp).digest('hex');
    if (hash !== user.otpHash) {
        throw new AppError(400, 'Invalid OTP', 'OTP_INVALID');
    }
};

/** Verify OTP + set new password, then clear OTP fields */
export const resetPassword = async ({ email, otp, newPassword }: ResetPasswordInput) => {
    await verifyOtp(email, otp);

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
        where: { email },
        data: { passwordHash, otpHash: null, otpExpiry: null },
    });
};
