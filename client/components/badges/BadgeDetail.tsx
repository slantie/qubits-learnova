'use client';

import { BadgeStatusItem } from '@/types';
import { BadgeIcon } from './BadgeIcon';
import { cn } from '@/lib/utils';
import { CheckCircle, Lock } from '@phosphor-icons/react';

interface BadgeDetailProps {
  badge: BadgeStatusItem;
}

export function BadgeDetail({ badge }: BadgeDetailProps) {
  const isEarned = badge.earned;
  const hasProgress = badge.progress !== undefined;
  const progressPercent = hasProgress
    ? Math.min(100, Math.round((badge.progress.current / badge.progress.required) * 100))
    : 0;

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-4 rounded-xl border p-5 transition-all',
        isEarned
          ? 'border-primary/30 bg-primary/5'
          : 'border-border bg-card hover:border-primary/20 hover:bg-muted/30'
      )}
    >
      {/* Badge icon with earned indicator */}
      <div className="relative">
        <BadgeIcon badgeKey={badge.key} size="lg" locked={!isEarned} />
        {isEarned && (
          <div className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-emerald-500 text-white">
            <CheckCircle className="size-4" weight="fill" />
          </div>
        )}
        {!isEarned && (
          <div className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-muted">
            <Lock className="size-3 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Badge info */}
      <div className="text-center">
        <h3 className="text-sm font-bold">{badge.name}</h3>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          {badge.description}
        </p>

        {/* Trigger condition */}
        <div className="mt-2.5 flex items-center justify-center gap-1.5 rounded-md bg-muted/40 px-2 py-1.5">
          <span className="text-[10px] font-medium text-muted-foreground">
            {badge.trigger}
          </span>
        </div>

        {/* Progress bar (for unearned countable badges) */}
        {hasProgress && !isEarned && (
          <div className="mt-3 w-full space-y-1.5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs font-medium text-foreground">
              {badge.progress.current} <span className="text-muted-foreground">/ {badge.progress.required}</span>
            </p>
            <p className="text-[10px] text-muted-foreground">
              {progressPercent}% Complete
            </p>
          </div>
        )}

        {/* Earned date */}
        {isEarned && badge.earnedAt && (
          <div className="mt-2 text-[10px] font-medium text-emerald-600">
            Earned {new Date(badge.earnedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
        )}
      </div>
    </div>
  );
}
