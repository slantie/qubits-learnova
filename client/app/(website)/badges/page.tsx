'use client';

import { useEffect, useState } from 'react';
import { BadgeStatusItem } from '@/types';
import { fetchBadges } from '@/lib/api/badges';
import { BadgesGrid } from '@/components/badges/BadgesGrid';
import { Medal } from '@phosphor-icons/react';
import { Skeleton } from '@/components/ui/skeleton';

export default function BadgesPage() {
  const [badges, setBadges] = useState<BadgeStatusItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBadges()
      .then(data => setBadges(data.badges))
      .catch(() => setBadges([]))
      .finally(() => setIsLoading(false));
  }, []);

  const earnedCount = badges.filter(b => b.earned).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-8">
      {/* Header */}
      <div className="text-center flex flex-col items-center gap-3">
        <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Medal className="size-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl ">Your Badges</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? 'Loading...' : `${earnedCount} of ${badges.length} badges earned`}
          </p>
        </div>
      </div>

      {/* Badges grid */}
      {isLoading ? (
        <div className="space-y-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-4 w-32" />
              <div className="flex flex-wrap gap-5">
                {[1, 2, 3, 4].map(j => (
                  <Skeleton key={j} className="size-20 rounded-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <BadgesGrid badges={badges} />
      )}
    </div>
  );
}
