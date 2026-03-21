'use client';

import { useState } from 'react';
import { mockPayment } from '@/lib/api/learner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CircleNotch, CheckCircle, CreditCard, ShieldCheck } from '@phosphor-icons/react';

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

  const handlePay = async () => {
    setStep('processing');
    try {
      await mockPayment(courseId);
      setStep('success');
    } catch {
      setStep('form');
    }
  };

  const handleClose = () => {
    if (step === 'success') {
      onSuccess();
    }
    onOpenChange(false);
    // Reset after animation
    setTimeout(() => setStep('form'), 300);
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
              {/* Course info */}
              <div className="rounded-lg bg-muted/50 p-4 border">
                <p className="text-sm font-medium">{courseTitle}</p>
                <p className="text-2xl font-bold text-primary mt-1">₹{price}</p>
              </div>

              {/* Card form (cosmetic) */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Card Number</label>
                  <Input placeholder="4242 4242 4242 4242" className="font-mono" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Name on Card</label>
                  <Input placeholder="John Doe" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Expiry</label>
                    <Input placeholder="MM/YY" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">CVV</label>
                    <Input placeholder="123" type="password" />
                  </div>
                </div>
              </div>

              {/* Security note */}
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-emerald-500" />
                Your payment information is secure
              </p>

              {/* Pay button */}
              <Button className="w-full" size="lg" onClick={handlePay}>
                Pay ₹{price}
              </Button>
            </div>
          </>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <CircleNotch className="size-10 animate-spin text-primary" />
            <p className="text-sm font-medium">Processing payment...</p>
            <p className="text-xs text-muted-foreground">Please wait, do not close this window</p>
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
