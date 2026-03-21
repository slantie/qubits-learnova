'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile, BadgeStatusItem } from '@/types';
import { fetchProfile } from '@/lib/api/learner';
import { fetchBadges } from '@/lib/api/badges';
import { useAuth } from '@/hooks/useAuth';
import { BadgeIcon } from '@/components/badges/BadgeIcon';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, BookOpen, CheckCircle2, CalendarDays, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

function StatCard({
  icon,
  value,
  label,
  className,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-3 p-4 rounded-xl border bg-card', className)}>
      <div className="shrink-0">{icon}</div>
      <div>
        <p className="text-xl font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [badgeList, setBadgeList] = useState<BadgeStatusItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user === null) {
      router.replace('/auth/login');
      return;
    }
    fetchProfile()
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setIsLoading(false));
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    fetchBadges()
      .then(data => setBadgeList(data.badges))
      .catch(() => setBadgeList([]));
  }, [user]);

  const initials = profile?.user.name
    ? profile.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const memberSince = profile?.user.createdAt
    ? new Date(profile.user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  const earnedCount = badgeList.filter(b => b.earned).length;

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="h-28 bg-muted" />
          <div className="px-6 pb-6 -mt-10 space-y-3">
            <Skeleton className="size-20 rounded-full" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      {/* Hero card */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        {/* Gradient banner */}
        <div className="h-28 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />
        {/* Profile info */}
        <div className="px-6 pb-6 -mt-10">
          <div className="size-20 rounded-full bg-primary/15 ring-4 ring-card flex items-center justify-center text-primary font-bold text-2xl mb-3">
            {initials}
          </div>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-bold">{profile.user.name ?? 'Learner'}</h1>
              <p className="text-sm text-muted-foreground">{profile.user.email}</p>
            </div>
            {profile.currentBadge && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                {profile.currentBadge}
              </span>
            )}
          </div>
          {memberSince && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" />
              Member since {memberSince}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          icon={<Trophy className="size-5 text-amber-500" />}
          value={profile.totalPoints}
          label="Total Points"
          className="col-span-2 sm:col-span-1"
        />
        <StatCard
          icon={<BookOpen className="size-5 text-primary" />}
          value={profile.enrollmentCount}
          label="Courses Enrolled"
        />
        <StatCard
          icon={<CheckCircle2 className="size-5 text-emerald-500" />}
          value={profile.completedCount}
          label="Completed"
        />
      </div>

      {/* Badges */}
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="size-5 text-primary" />
            <h2 className="font-semibold">Badges</h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {earnedCount} of {badgeList.length} earned
          </span>
        </div>
        {badgeList.filter(b => b.earned).length > 0 ? (
          <div className="flex flex-wrap gap-4">
            {badgeList.filter(b => b.earned).map(b => (
              <BadgeIcon key={b.key} badgeKey={b.key} size="md" showLabel />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">
            No badges earned yet. Complete courses to earn your first badge!
          </p>
        )}
      </div>
    </div>
  );
}
