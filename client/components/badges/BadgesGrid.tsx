'use client';

import { BadgeStatusItem, BadgeCategory } from '@/types';
import { BadgeIcon } from './BadgeIcon';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface BadgesGridProps {
  badges: BadgeStatusItem[];
  compact?: boolean;  // when true: single row of sm badges, no category headers, max 8 visible
}

const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  TIER: 'Point Tiers',
  COURSE_MILESTONE: 'Course Milestones',
  QUIZ_EXCELLENCE: 'Quiz Excellence',
  SPEED: 'Speed',
  CERTIFICATION: 'Certification',
  DEDICATION: 'Dedication',
};

const CATEGORY_ORDER: BadgeCategory[] = [
  'TIER', 'COURSE_MILESTONE', 'QUIZ_EXCELLENCE', 'SPEED', 'CERTIFICATION', 'DEDICATION',
];

export function BadgesGrid({ badges, compact = false }: BadgesGridProps) {
  const router = useRouter();

  if (compact) {
    const earned = badges.filter(b => b.earned);
    const shown = earned.slice(0, 8);
    const extra = earned.length - shown.length;
    return (
      <div
        className="flex flex-wrap gap-2 cursor-pointer"
        onClick={() => router.push('/badges')}
        title="View all badges"
      >
        {shown.map(b => (
          <BadgeIcon key={b.key} badgeKey={b.key} size="sm" />
        ))}
        {extra > 0 && (
          <div className="size-12 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
            +{extra}
          </div>
        )}
        {earned.length === 0 && (
          <p className="text-xs text-muted-foreground">No badges earned yet</p>
        )}
      </div>
    );
  }

  // Full grid grouped by category
  return (
    <div className="space-y-8">
      {CATEGORY_ORDER.map(category => {
        const categoryBadges = badges.filter(b => b.category === category);
        if (categoryBadges.length === 0) return null;
        return (
          <div key={category}>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 pb-2 border-b border-border">
              {CATEGORY_LABELS[category]}
            </h3>
            <div className="flex flex-wrap gap-5">
              {categoryBadges.map(b => (
                <div key={b.key} className="flex flex-col items-center gap-2 w-24">
                  <BadgeIcon badgeKey={b.key} size="md" locked={!b.earned} showLabel />
                  {!b.earned && b.progress && (
                    <div className="w-full space-y-1">
                      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.min(100, Math.round((b.progress.current / b.progress.required) * 100))}%` }}
                        />
                      </div>
                      <p className="text-[9px] text-muted-foreground text-center leading-tight">
                        {b.progress.current}/{b.progress.required}
                      </p>
                    </div>
                  )}
                  {b.earned && b.earnedAt && (
                    <p className="text-[9px] text-muted-foreground text-center leading-tight">
                      {new Date(b.earnedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
