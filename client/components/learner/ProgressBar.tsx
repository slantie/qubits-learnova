'use client';

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  label?: string;
  className?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md';
}

export function ProgressBar({
  value,
  label,
  className,
  showPercentage = true,
  size = 'md',
}: ProgressBarProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          {showPercentage && (
            <span className="text-xs font-normal text-foreground">{value}%</span>
          )}
        </div>
      )}
      <Progress
        value={value}
        className={cn(
          size === 'sm' ? 'h-1.5' : 'h-2.5',
          '[&>[data-slot=indicator]]:bg-primary [&>[data-slot=indicator]]:transition-all [&>[data-slot=indicator]]:duration-500'
        )}
      />
      {!label && showPercentage && (
        <span className="text-xs font-normal text-foreground text-right">{value}%</span>
      )}
    </div>
  );
}
