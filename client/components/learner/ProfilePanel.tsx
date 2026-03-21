'use client';

import { useEffect, useState } from 'react';
import { UserProfile } from '@/types';
import { fetchProfile } from '@/lib/api/learner';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, BookOpen, CheckCircle2 } from 'lucide-react';
import { BadgesGrid } from '@/components/badges/BadgesGrid';
import { EarnedBadge } from '@/types';

export function ProfilePanel() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchProfile()
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    );
  }

  if (!profile) return null;

  const initials = profile.user.name
    ? profile.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6">
        <div className="flex items-center gap-3">
          <div className="size-14 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-lg ring-2 ring-primary/20">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-base truncate">{profile.user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{profile.user.email}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-5 space-y-4">
        {/* Points */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/8 border border-amber-500/15">
          <Trophy className="size-5 text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold">{profile.totalPoints} Points</p>
            {profile.currentBadge && (
              <p className="text-xs text-muted-foreground">Badge: {profile.currentBadge}</p>
            )}
          </div>
        </div>

        {/* Course stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <BookOpen className="size-4 text-primary shrink-0" />
            <div>
              <p className="text-sm font-semibold">{profile.enrollmentCount}</p>
              <p className="text-[11px] text-muted-foreground">Enrolled</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold">{profile.completedCount}</p>
              <p className="text-[11px] text-muted-foreground">Completed</p>
            </div>
          </div>
        </div>

        {/* Badges */}
        {profile.badges && profile.badges.length > 0 && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-xs font-medium text-primary mb-2">Badges Earned</p>
            <BadgesGrid
              badges={profile.badges.map((b: EarnedBadge) => ({
                key: b.badgeKey,
                name: b.badgeKey,
                category: 'TIER' as const,
                description: '',
                trigger: '',
                earned: true,
                earnedAt: b.earnedAt,
              }))}
              compact
            />
          </div>
        )}
      </div>
    </div>
  );
}
