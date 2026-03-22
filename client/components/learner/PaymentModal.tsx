'use client';

import { useState, useEffect } from 'react';
import { getCoursePricing, validateCoupon, createOrder, verifyPayment } from '@/lib/api/learner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CircleNotch, CheckCircle, CreditCard, ShieldCheck, Tag, X } from '@phosphor-icons/react';
import { toast } from 'sonner';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentModalProps {
  courseId: number;
  courseTitle: string;
  price: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PaymentModal({
  courseId,
  courseTitle,
  price,
  open,
  onOpenChange,
  onSuccess,
}: PaymentModalProps) {
  const [step, setStep] = useState<'form' | 'processing' | 'success'>('form');
  const [pricing, setPricing] = useState<{
    basePrice: number;
    effectivePrice: number;
    earlyBirdActive: boolean;
    spotsLeft: number | null;
  } | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponState, setCouponState] = useState<{
    applied: boolean;
    discountAmount: number;
    finalPrice: number;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  useEffect(() => {
    if (open) {
      getCoursePricing(courseId).then(setPricing).catch(() => {});
    }
  }, [open, courseId]);

  // Load Razorpay script
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const displayPrice = couponState?.finalPrice ?? pricing?.effectivePrice ?? Number(price);
  const originalPrice = pricing?.effectivePrice ?? Number(price);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const result = await validateCoupon(couponCode.trim(), courseId);
      setCouponState({
        applied: true,
        discountAmount: result.discountAmount,
        finalPrice: result.finalPrice,
      });
      toast.success(`Coupon applied! You save ₹${result.discountAmount}`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Invalid coupon');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponState(null);
    setCouponCode('');
  };

  const handlePay = async () => {
    setStep('processing');
    try {
      const order = await createOrder(courseId, couponState ? couponCode : undefined);

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Learnova',
        description: courseTitle,
        order_id: order.orderId,
        method: {
          upi: 1,
          card: 1,
          netbanking: 1,
          wallet: 1,
          emi: 0,
        },
        handler: async (response: any) => {
          try {
            await verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              courseId,
              couponCode: couponState ? couponCode : undefined,
            });
            setStep('success');
          } catch {
            setStep('form');
            toast.error('Payment verification failed. Please contact support.');
          }
        },
        modal: {
          ondismiss: () => setStep('form'),
        },
        theme: { color: '#6366f1' },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      setStep('form');
      toast.error('Could not initiate payment. Please try again.');
    }
  };

  const handleClose = () => {
    if (step === 'success') {
      onSuccess();
    }
    onOpenChange(false);
    setTimeout(() => {
      setStep('form');
      setCouponCode('');
      setCouponState(null);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="size-5 text-primary" />
                Complete your purchase
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 pt-2">
              {/* Course info + price */}
              <div className="rounded-lg bg-muted/50 p-4 border">
                <p className="text-sm font-medium">{courseTitle}</p>

                {pricing?.earlyBirdActive && (
                  <p className="text-[11px] text-emerald-600 font-medium mt-1">
                    🎯 Early bird pricing — {pricing.spotsLeft} spot{pricing.spotsLeft !== 1 ? 's' : ''} left
                  </p>
                )}

                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-2xl font-bold text-primary">₹{displayPrice.toLocaleString('en-IN')}</p>
                  {couponState && (
                    <p className="text-sm text-muted-foreground line-through">₹{originalPrice.toLocaleString('en-IN')}</p>
                  )}
                  {couponState && (
                    <p className="text-xs text-emerald-600 font-medium">-₹{couponState.discountAmount}</p>
                  )}
                </div>
              </div>

              {/* Coupon */}
              {!couponState ? (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Coupon code"
                      className="pl-9 font-mono uppercase"
                      onKeyDown={e => { if (e.key === 'Enter') handleApplyCoupon(); }}
                    />
                  </div>
                  <Button variant="outline" onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()}>
                    {couponLoading ? <CircleNotch className="size-4 animate-spin" /> : 'Apply'}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-2">
                    <Tag className="size-4 text-emerald-600" />
                    <span className="text-sm font-mono font-medium text-emerald-700 dark:text-emerald-400">{couponCode}</span>
                    <span className="text-xs text-emerald-600">-₹{couponState.discountAmount}</span>
                  </div>
                  <button onClick={handleRemoveCoupon} className="text-muted-foreground hover:text-foreground">
                    <X className="size-4" />
                  </button>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-emerald-500" />
                Secured by Razorpay · Your payment details are encrypted
              </p>

              <Button className="w-full" size="lg" onClick={handlePay}>
                Pay ₹{displayPrice.toLocaleString('en-IN')}
              </Button>
            </div>
          </>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <CircleNotch className="size-10 animate-spin text-primary" />
            <p className="text-sm font-medium">Opening payment gateway…</p>
            <p className="text-xs text-muted-foreground">Please complete payment in the Razorpay window</p>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
            <div className="size-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="size-9 text-emerald-500" />
            </div>
            <div>
              <p className="text-lg font-normal">Payment Successful!</p>
              <p className="text-sm text-muted-foreground mt-1">
                You have been enrolled in <span className="font-medium text-foreground">{courseTitle}</span>
              </p>
            </div>
            <Button onClick={handleClose} className="mt-2">
              Start Learning →
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
