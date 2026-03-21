'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Envelope, ShieldCheck, Key, CheckCircle } from '@phosphor-icons/react';

type Step = 'email' | 'otp' | 'password' | 'done';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email });
            setStep('otp');
        } catch (err: any) {
            setError(err.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (otp.length !== 6) {
            setError('Please enter the 6-digit code');
            return;
        }
        setLoading(true);
        try {
            await api.post('/auth/verify-otp', { email, otp });
            setStep('password');
        } catch (err: any) {
            setError(err.message || 'Invalid or expired code');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        setLoading(true);
        try {
            await api.post('/auth/reset-password', { email, otp, newPassword });
            setStep('done');
        } catch (err: any) {
            setError(err.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-background p-8 rounded-xl shadow-sm border max-w-sm w-full">
            {/* Step: Email */}
            {step === 'email' && (
                <>
                    <div className="flex flex-col items-center mb-6 gap-3">
                        <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Envelope className="size-5 text-primary" />
                        </div>
                        <h1 className="text-2xl font-medium text-center">Forgot password?</h1>
                        <p className="text-sm text-muted-foreground text-center">
                            Enter your email and we'll send you a reset code.
                        </p>
                    </div>
                    {error && <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4 text-sm">{error}</div>}
                    <form onSubmit={handleRequestOtp} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="you@example.com"
                                autoFocus
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Sending code...' : 'Send reset code'}
                        </Button>
                    </form>
                    <div className="mt-4 text-center">
                        <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                            <ArrowLeft className="size-3" /> Back to login
                        </Link>
                    </div>
                </>
            )}

            {/* Step: OTP */}
            {step === 'otp' && (
                <>
                    <div className="flex flex-col items-center mb-6 gap-3">
                        <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <ShieldCheck className="size-5 text-primary" />
                        </div>
                        <h1 className="text-2xl font-medium text-center">Check your email</h1>
                        <p className="text-sm text-muted-foreground text-center">
                            We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>.
                            It expires in 10 minutes.
                        </p>
                    </div>
                    {error && <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4 text-sm">{error}</div>}
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">6-digit code</label>
                            <Input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                required
                                placeholder="123456"
                                className="text-center text-xl tracking-[0.3em] font-semibold"
                                autoFocus
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Verifying...' : 'Verify code'}
                        </Button>
                    </form>
                    <div className="mt-4 text-center space-y-2">
                        <button
                            type="button"
                            onClick={() => { setStep('email'); setOtp(''); setError(''); }}
                            className="text-sm text-primary hover:underline"
                        >
                            Resend code
                        </button>
                        <div>
                            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                                <ArrowLeft className="size-3" /> Back to login
                            </Link>
                        </div>
                    </div>
                </>
            )}

            {/* Step: New Password */}
            {step === 'password' && (
                <>
                    <div className="flex flex-col items-center mb-6 gap-3">
                        <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Key className="size-5 text-primary" />
                        </div>
                        <h1 className="text-2xl font-medium text-center">Set new password</h1>
                        <p className="text-sm text-muted-foreground text-center">
                            Choose a strong password of at least 8 characters.
                        </p>
                    </div>
                    {error && <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4 text-sm">{error}</div>}
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">New password</label>
                            <Input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Confirm password</label>
                            <Input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Resetting...' : 'Reset password'}
                        </Button>
                    </form>
                </>
            )}

            {/* Step: Done */}
            {step === 'done' && (
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                    <div className="size-16 rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle className="size-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h1 className="text-2xl font-medium">Password reset!</h1>
                    <p className="text-sm text-muted-foreground">
                        Your password has been updated. You can now log in with your new password.
                    </p>
                    <Button className="w-full mt-2" onClick={() => router.push('/login')}>
                        Go to login
                    </Button>
                </div>
            )}
        </div>
    );
}
