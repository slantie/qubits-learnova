'use client';

import { useEffect, useState } from 'react';
import { Trophy, Star, Medal, Crown, Lightning, BookOpen } from '@phosphor-icons/react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OverallEntry {
    rank: number;
    userId: number;
    name: string;
    email: string;
    totalPoints: number;
    completedCourses: number;
}

interface QuizEntry {
    rank: number;
    userId: number;
    name: string;
    email: string;
    scorePercent: number;
    pointsEarned: number;
    attemptNumber: number;
}

interface Quiz {
    id: number;
    title: string;
    attemptCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
    return (name ?? '?').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || '?';
}

function RankIcon({ rank }: { rank: number }) {
    if (rank === 1) return <Crown weight="fill" className="size-4 text-amber-400" />;
    if (rank === 2) return <Medal weight="fill" className="size-4 text-slate-400" />;
    if (rank === 3) return <Medal weight="fill" className="size-4 text-orange-400" />;
    return <span className="text-xs font-medium text-muted-foreground tabular-nums">{rank}</span>;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
    return (
        <div className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
            <span className="size-5 rounded bg-muted shrink-0" />
            <span className="size-8 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-1.5">
                <span className="block h-3 w-28 rounded bg-muted" />
                <span className="block h-2.5 w-16 rounded bg-muted" />
            </div>
            <span className="h-3 w-12 rounded bg-muted" />
        </div>
    );
}

// ─── Podium ───────────────────────────────────────────────────────────────────

function Podium({ top3, userId, metricLabel }: {
    top3: (OverallEntry | QuizEntry)[];
    userId?: number;
    metricLabel: (e: OverallEntry | QuizEntry) => string;
}) {
    const order = [top3[1], top3[0], top3[2]].filter(Boolean);
    const podiumHeights = ['h-16', 'h-24', 'h-12'];
    const podiumColors = [
        'bg-slate-100 dark:bg-slate-800/50',
        'bg-amber-50 dark:bg-amber-900/20',
        'bg-orange-50 dark:bg-orange-900/20',
    ];
    const rankOrder = [2, 1, 3];

    return (
        <div className="grid grid-cols-3 gap-4 items-end px-8">
            {order.map((entry, idx) => {
                const isMe = entry.userId === userId;
                const rank = rankOrder[idx];
                return (
                    <div key={entry.userId} className="flex flex-col items-center gap-1.5">
                        {/* Avatar */}
                        <div className={cn(
                            'size-10 rounded-full flex items-center justify-center text-xs font-bold ring-2 shrink-0',
                            isMe
                                ? 'bg-primary text-primary-foreground ring-primary/30'
                                : rank === 1
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 ring-amber-200 dark:ring-amber-800'
                                : 'bg-muted text-foreground ring-border',
                        )}>
                            {initials(entry.name)}
                        </div>

                        {/* Name */}
                        <p className="text-[11px] font-medium text-center leading-tight truncate max-w-full px-0.5">
                            {entry.name?.split(' ')[0] ?? 'Unknown'}
                        </p>

                        {/* Podium block */}
                        <div className={cn(
                            'w-full rounded-t-lg flex flex-col items-center justify-center gap-1 py-2',
                            podiumHeights[idx],
                            podiumColors[idx],
                        )}>
                            <RankIcon rank={rank} />
                            <span className="text-[10px] font-medium text-muted-foreground">
                                {metricLabel(entry)}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function LeaderboardRow({ entry, userId, secondary, right }: {
    entry: OverallEntry | QuizEntry;
    userId?: number;
    secondary: string;
    right: React.ReactNode;
}) {
    const isMe = entry.userId === userId;
    return (
        <div className={cn(
            'flex items-center gap-3 px-4 py-3 transition-colors',
            isMe ? 'bg-primary/[0.04]' : 'hover:bg-muted/30',
        )}>
            <div className="w-5 flex items-center justify-center shrink-0">
                <RankIcon rank={entry.rank} />
            </div>
            <div className={cn(
                'size-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
                isMe ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
            )}>
                {initials(entry.name)}
            </div>
            <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium truncate leading-tight', isMe && 'text-primary')}>
                    {entry.name || 'Anonymous'}
                    {isMe && <span className="ml-1.5 text-[11px] text-muted-foreground font-normal">(you)</span>}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{secondary}</p>
            </div>
            <div className="shrink-0">{right}</div>
        </div>
    );
}

// ─── Score bar (for quiz mode) ────────────────────────────────────────────────

function ScoreBar({ pct }: { pct: number }) {
    return (
        <div className="flex items-center gap-2">
            <div className="w-32 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                />
            </div>
            <span className="text-xs font-medium tabular-nums w-9 text-right">{pct}%</span>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
    const { user } = useAuth();

    const [tab, setTab] = useState<'overall' | number>('overall');
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [overall, setOverall] = useState<OverallEntry[]>([]);
    const [quizData, setQuizData] = useState<Record<number, QuizEntry[]>>({});
    const [loading, setLoading] = useState(true);
    const [quizLoading, setQuizLoading] = useState(false);

    // Load quizzes list + overall on mount
    useEffect(() => {
        Promise.all([
            api.get('/leaderboard').then((d: any) => {
                const list = Array.isArray(d) ? d : (d.leaderboard ?? d.entries ?? []);
                setOverall(list.map((e: any, i: number) => ({ ...e, rank: e.rank ?? i + 1 })));
            }),
            api.get('/leaderboard/quizzes').then((d: any) => {
                setQuizzes(d.quizzes ?? []);
            }),
        ])
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    // Load quiz leaderboard when tab switches
    useEffect(() => {
        if (tab === 'overall') return;
        if (quizData[tab]) return; // cached
        setQuizLoading(true);
        api.get(`/leaderboard/quiz/${tab}`)
            .then((d: any) => {
                const list = Array.isArray(d) ? d : (d.leaderboard ?? []);
                setQuizData(prev => ({
                    ...prev,
                    [tab]: list.map((e: any, i: number) => ({ ...e, rank: e.rank ?? i + 1 })),
                }));
            })
            .catch(() => {})
            .finally(() => setQuizLoading(false));
    }, [tab]);

    const isOverall = tab === 'overall';
    const entries: (OverallEntry | QuizEntry)[] = isOverall ? overall : (quizData[tab as number] ?? []);
    const top3 = entries.slice(0, 3);
    const isListLoading = loading || (!isOverall && quizLoading);

    const selectedQuiz = quizzes.find(q => q.id === tab);

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex flex-col items-center gap-2 text-center">
                <div className="size-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Trophy weight="fill" className="size-6 text-amber-500" />
                </div>
                <h1 className="text-xl font-medium">Leaderboard</h1>
                <p className="text-sm text-muted-foreground">
                    {isOverall
                        ? 'Top learners ranked by total points earned'
                        : `Rankings for: ${selectedQuiz?.title ?? '…'}`}
                </p>
            </div>

            {/* ── Tabs ────────────────────────────────────────────────────── */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                <button
                    onClick={() => setTab('overall')}
                    className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0',
                        isOverall
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:text-foreground',
                    )}
                >
                    <Star weight={isOverall ? 'fill' : 'regular'} className="size-3.5" />
                    Overall
                </button>

                {quizzes.map(q => (
                    <button
                        key={q.id}
                        onClick={() => setTab(q.id)}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 max-w-[160px]',
                            tab === q.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:text-foreground',
                        )}
                        title={q.title}
                    >
                        <Lightning weight={tab === q.id ? 'fill' : 'regular'} className="size-3.5 shrink-0" />
                        <span className="truncate">{q.title}</span>
                    </button>
                ))}
            </div>

            {/* ── Podium ──────────────────────────────────────────────────── */}
            {!isListLoading && top3.length >= 2 && (
                <Podium
                    top3={top3}
                    userId={user?.id}
                    metricLabel={e =>
                        isOverall
                            ? `${(e as OverallEntry).totalPoints} pts`
                            : `${(e as QuizEntry).scorePercent}%`
                    }
                />
            )}

            {/* ── List ────────────────────────────────────────────────────── */}
            <div className="border rounded-xl bg-card overflow-hidden divide-y divide-border">
                {isListLoading ? (
                    Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                ) : entries.length === 0 ? (
                    <div className="py-14 flex flex-col items-center gap-3 text-center">
                        <Trophy className="size-9 text-muted-foreground/20" strokeWidth={1.2} />
                        <p className="text-sm font-medium">No rankings yet</p>
                        <p className="text-xs text-muted-foreground max-w-xs">
                            {isOverall
                                ? 'Complete quizzes to earn points and appear here.'
                                : 'No one has attempted this quiz yet.'}
                        </p>
                    </div>
                ) : isOverall ? (
                    // ── Overall rows ────────────────────────────────────────
                    (entries as OverallEntry[]).map(entry => (
                        <LeaderboardRow
                            key={entry.userId}
                            entry={entry}
                            userId={user?.id}
                            secondary={`${entry.completedCourses ?? 0} course${entry.completedCourses !== 1 ? 's' : ''} completed`}
                            right={
                                <div className="flex items-center gap-1">
                                    <Star weight="fill" className="size-3.5 text-amber-400" />
                                    <span className="text-sm font-medium tabular-nums">{entry.totalPoints}</span>
                                </div>
                            }
                        />
                    ))
                ) : (
                    // ── Quiz rows ────────────────────────────────────────────
                    (entries as QuizEntry[]).map(entry => (
                        <LeaderboardRow
                            key={entry.userId}
                            entry={entry}
                            userId={user?.id}
                            secondary={`${entry.pointsEarned} pts · attempt #${entry.attemptNumber}`}
                            right={<ScoreBar pct={entry.scorePercent} />}
                        />
                    ))
                )}
            </div>

            {/* ── Footer note ─────────────────────────────────────────────── */}
            {!isListLoading && entries.length > 0 && (
                <p className="text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
                    <BookOpen className="size-3.5" />
                    {isOverall
                        ? `Showing top ${entries.length} learners`
                        : `${entries.length} learner${entries.length !== 1 ? 's' : ''} attempted · best score shown`}
                </p>
            )}
        </div>
    );
}
