'use client';

import { useEffect, useState } from 'react';
import { Trophy, Star, Medal, Crown } from '@phosphor-icons/react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
    rank: number;
    userId: number;
    name: string;
    email: string;
    totalPoints: number;
    completedCourses: number;
}

function RankBadge({ rank }: { rank: number }) {
    if (rank === 1) return <Crown className="size-5 text-amber-400" />;
    if (rank === 2) return <Medal className="size-5 text-slate-400" />;
    if (rank === 3) return <Medal className="size-5 text-amber-600" />;
    return <span className="text-sm font-normal text-muted-foreground tabular-nums w-5 text-center">{rank}</span>;
}

function SkeletonRow() {
    return (
        <div className="flex items-center gap-4 px-5 py-4 animate-pulse">
            <span className="size-5 rounded bg-muted" />
            <span className="size-9 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
                <span className="block h-3.5 w-32 rounded bg-muted" />
                <span className="block h-3 w-20 rounded bg-muted" />
            </div>
            <span className="h-4 w-14 rounded bg-muted" />
        </div>
    );
}

export default function LeaderboardPage() {
    const { user } = useAuth();
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        api.get('/leaderboard')
            .then((data: any) => {
                const list: LeaderboardEntry[] = Array.isArray(data)
                    ? data
                    : (data.leaderboard ?? data.entries ?? []);
                setEntries(list.map((e, i) => ({ ...e, rank: e.rank ?? i + 1 })));
            })
            .catch(() => setEntries([]))
            .finally(() => setIsLoading(false));
    }, []);

    const top3 = entries.slice(0, 3);
    const rest = entries.slice(3);

    return (
        <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-8">
            {/* Header */}
            <div className="text-center flex flex-col items-center gap-3">
                <div className="size-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Trophy className="size-7 text-amber-500" />
                </div>
                <div>
                    <h1 className="text-2xl ">Leaderboard</h1>
                    <p className="text-sm text-muted-foreground mt-1">Top learners ranked by points earned</p>
                </div>
            </div>

            {/* Podium — top 3 */}
            {!isLoading && top3.length > 0 && (
                <div className="grid grid-cols-3 gap-3 items-end">
                    {[top3[1], top3[0], top3[2]].filter(Boolean).map((entry, idx) => {
                        const order = [2, 1, 3][idx];
                        const heights = ['h-20', 'h-28', 'h-16'];
                        const isMe = entry.userId === user?.id;
                        return (
                            <div key={entry.userId} className="flex flex-col items-center gap-2">
                                <div className={cn(
                                    'size-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                                    isMe ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                                )}>
                                    {entry.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || '?'}
                                </div>
                                <p className="text-xs font-medium text-center truncate max-w-full px-1">
                                    {entry.name?.split(' ')[0]}
                                </p>
                                <div className={cn(
                                    'w-full rounded-t-xl flex flex-col items-center justify-center gap-1 pt-3',
                                    heights[idx],
                                    order === 1 ? 'bg-amber-100 dark:bg-amber-900/30' :
                                    order === 2 ? 'bg-slate-100 dark:bg-slate-800/40' :
                                    'bg-orange-100 dark:bg-orange-900/20',
                                )}>
                                    <RankBadge rank={order} />
                                    <span className="text-xs font-normal text-amber-600 flex items-center gap-0.5">
                                        <Star className="size-3 fill-amber-400 text-amber-400" />
                                        {entry.totalPoints}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Full list */}
            <div className="border rounded-2xl bg-card overflow-hidden divide-y divide-border">
                {isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                ) : entries.length === 0 ? (
                    <div className="py-16 flex flex-col items-center gap-3 text-center">
                        <Trophy className="size-10 text-muted-foreground/30" strokeWidth={1.5} />
                        <p className="text-sm font-medium">No rankings yet</p>
                        <p className="text-xs text-muted-foreground max-w-xs">
                            Complete courses and quizzes to earn points and appear here.
                        </p>
                    </div>
                ) : (
                    entries.map((entry) => {
                        const isMe = entry.userId === user?.id;
                        const initials = entry.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || '?';
                        return (
                            <div
                                key={entry.userId}
                                className={cn(
                                    'flex items-center gap-4 px-5 py-3.5 transition-colors',
                                    isMe ? 'bg-primary/5' : 'hover:bg-muted/30',
                                )}
                            >
                                <div className="w-5 flex items-center justify-center shrink-0">
                                    <RankBadge rank={entry.rank} />
                                </div>
                                <div className={cn(
                                    'size-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                                    isMe ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                                )}>
                                    {initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={cn('text-sm font-medium truncate', isMe && 'text-primary')}>
                                        {entry.name || 'Anonymous'}
                                        {isMe && <span className="ml-2 text-xs text-muted-foreground font-normal">(you)</span>}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {entry.completedCourses ?? 0} course{entry.completedCourses !== 1 ? 's' : ''} completed
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <Star className="size-3.5 fill-amber-400 text-amber-400" />
                                    <span className="text-sm font-normal tabular-nums">{entry.totalPoints}</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
