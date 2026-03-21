'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { PublicProfile } from '@/types';
import { fetchPublicProfile } from '@/lib/api/learner';
import { BadgeIcon } from '@/components/badges/BadgeIcon';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, BookOpen, CheckCircle, CalendarDots } from '@phosphor-icons/react';
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

export default function PublicProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const id = parseInt(userId, 10);
    if (isNaN(id)) { setNotFound(true); setIsLoading(false); return; }
    fetchPublicProfile(id)
      .then(setProfile)
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [userId]);

  const initials = profile?.user.name
    ? profile.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const memberSince = profile?.user.createdAt
    ? new Date(profile.user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

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
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-3">
        <p className="text-4xl">🙁</p>
        <h1 className="text-xl ">User not found</h1>
        <p className="text-sm text-muted-foreground">This profile doesn't exist or has been removed.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      {/* Hero card */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="h-28 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />
        <div className="px-6 pb-6 -mt-10">
          <div className="size-20 rounded-full bg-primary/15 ring-4 ring-card flex items-center justify-center text-primary font-bold text-2xl mb-3">
            {initials}
          </div>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h1 className="text-xl ">{profile.user.name ?? 'Learner'}</h1>
            {profile.currentBadge && (
              <span className="text-xs font-normal px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                {profile.currentBadge}
              </span>
            )}
          </div>
          {memberSince && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
              <CalendarDots className="size-3.5" />
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
          icon={<CheckCircle className="size-5 text-emerald-500" />}
          value={profile.completedCount}
          label="Completed"
        />
      </div>

      {/* Earned badges */}
      {profile.badges.length > 0 ? (
        <div className="rounded-2xl border bg-card p-6 space-y-4">
          <h2 className="">Badges Earned</h2>
          <div className="flex flex-wrap gap-3">
            {profile.badges.map(b => (
              <BadgeIcon key={b.badgeKey} badgeKey={b.badgeKey} size="md" showLabel />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">No badges earned yet.</p>
        </div>
      )}
    </div>
  );
}
