'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ArrowLeft, Users, ChartBar, Trophy, Target, TrendUp } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface Attempt {
  id: number;
  attemptNumber: number;
  pointsEarned: number;
  scorePercentage: number;
  correctCount: number;
  totalQuestions: number;
  completedAt: string;
  user: { id: number; name: string; email: string };
}

interface QuestionStat {
  id: number;
  text: string;
  order: number;
  totalAnswered: number;
  totalCorrect: number;
  correctRate: number;
}

interface Analytics {
  totalAttempts: number;
  uniqueLearners: number;
  avgScore: number;
  perfectScores: number;
  totalPointsAwarded: number;
  rewards: {
    attempt1Points: number;
    attempt2Points: number;
    attempt3Points: number;
    attempt4PlusPoints: number;
  } | null;
  questionStats: QuestionStat[];
}

function ScoreBadge({ pct }: { pct: number }) {
  const color =
    pct >= 80 ? 'text-green-700 bg-green-50 border-green-200' :
    pct >= 50 ? 'text-amber-700 bg-amber-50 border-amber-200' :
                'text-red-700 bg-red-50 border-red-200';
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-normal shadow-xs', color)}>
      {pct}%
    </span>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="border rounded-xl p-4 bg-card flex flex-col gap-1">
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide mb-1">
        {icon}
        {label}
      </div>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

export default function QuizAttemptsPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const quizId = params.quizId as string;

  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'attempts' | 'questions'>('attempts');

  useEffect(() => {
    Promise.all([
      api.get(`/courses/${courseId}/quizzes/${quizId}/all-attempts`),
      api.get(`/courses/${courseId}/quizzes/${quizId}/analytics`),
    ])
      .then(([attemptsData, analyticsData]) => {
        setAttempts(attemptsData.attempts ?? []);
        setAnalytics(analyticsData);
      })
      .catch(() => setError('Failed to load attempt data.'))
      .finally(() => setLoading(false));
  }, [courseId, quizId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] text-destructive text-sm">
        {error ?? 'Failed to load data.'}
      </div>
    );
  }

  // Group by learner for per-learner summary
  const learnerMap = new Map<number, { user: Attempt['user']; attempts: Attempt[] }>();
  for (const a of attempts) {
    if (!learnerMap.has(a.user.id)) learnerMap.set(a.user.id, { user: a.user, attempts: [] });
    learnerMap.get(a.user.id)!.attempts.push(a);
  }
  const learners = [...learnerMap.values()].sort((a, b) => a.user.name.localeCompare(b.user.name));

  return (
    <div className="px-6 py-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/backoffice/courses/${courseId}/quiz/${quizId}`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Quiz Builder
        </Link>
      </div>

      <div>
        <h1 className="text-2xl ">Quiz Attempts</h1>
        <p className="text-sm text-muted-foreground mt-1">Learner performance and analytics</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          icon={<Users className="w-3.5 h-3.5" />}
          label="Learners"
          value={analytics.uniqueLearners}
        />
        <StatCard
          icon={<ChartBar className="w-3.5 h-3.5" />}
          label="Total Attempts"
          value={analytics.totalAttempts}
          sub={analytics.uniqueLearners > 0
            ? `${(analytics.totalAttempts / analytics.uniqueLearners).toFixed(1)} avg per learner`
            : undefined}
        />
        <StatCard
          icon={<Target className="w-3.5 h-3.5" />}
          label="Avg Score"
          value={`${analytics.avgScore}%`}
        />
        <StatCard
          icon={<TrendUp className="w-3.5 h-3.5" />}
          label="Perfect Scores"
          value={analytics.perfectScores}
          sub={analytics.totalAttempts > 0
            ? `${Math.round((analytics.perfectScores / analytics.totalAttempts) * 100)}% of attempts`
            : undefined}
        />
        <StatCard
          icon={<Trophy className="w-3.5 h-3.5" />}
          label="Points Awarded"
          value={analytics.totalPointsAwarded}
          sub={analytics.rewards
            ? `Tier: ${analytics.rewards.attempt1Points} / ${analytics.rewards.attempt2Points} / ${analytics.rewards.attempt3Points} / ${analytics.rewards.attempt4PlusPoints}`
            : 'No reward set'}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b gap-0">
        {(['attempts', 'questions'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize',
              activeTab === tab
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab === 'attempts' ? 'Learner Attempts' : 'Question Breakdown'}
          </button>
        ))}
      </div>

      {/* Learner Attempts tab */}
      {activeTab === 'attempts' && (
        attempts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
            <Users className="w-10 h-10 opacity-20" />
            <p className="text-sm">No attempts yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {learners.map(({ user, attempts: lAttempts }) => (
              <div key={user.id} className="border rounded-xl overflow-hidden bg-card">
                {/* Learner header */}
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                  <div>
                    <p className="text-sm font-normal">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">
                      {lAttempts.length} attempt{lAttempts.length !== 1 ? 's' : ''}
                    </span>
                    <p className="text-xs font-medium text-primary">
                      Best: <ScoreBadge pct={Math.max(...lAttempts.map(a => a.scorePercentage))} />
                    </p>
                  </div>
                </div>

                {/* Attempts table */}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b bg-muted/10">
                      <th className="text-left px-4 py-2 font-medium">Attempt</th>
                      <th className="text-left px-4 py-2 font-medium">Score</th>
                      <th className="text-left px-4 py-2 font-medium">Correct</th>
                      <th className="text-left px-4 py-2 font-medium">Points</th>
                      <th className="text-left px-4 py-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lAttempts
                      .sort((a, b) => a.attemptNumber - b.attemptNumber)
                      .map(attempt => (
                        <tr key={attempt.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-xs tabular-nums text-muted-foreground">
                            #{attempt.attemptNumber}
                          </td>
                          <td className="px-4 py-2.5">
                            <ScoreBadge pct={attempt.scorePercentage} />
                          </td>
                          <td className="px-4 py-2.5 text-xs tabular-nums">
                            {attempt.correctCount} / {attempt.totalQuestions}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                              <Trophy className="w-3 h-3" />
                              {attempt.pointsEarned}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
                            {new Date(attempt.completedAt).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric',
                            })}
                            {' '}
                            <span className="text-muted-foreground/60">
                              {new Date(attempt.completedAt).toLocaleTimeString('en-US', {
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )
      )}

      {/* Question Breakdown tab */}
      {activeTab === 'questions' && (
        analytics.questionStats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
            <Target className="w-10 h-10 opacity-20" />
            <p className="text-sm">No question data available.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {analytics.questionStats
              .sort((a, b) => a.order - b.order)
              .map((q, idx) => (
                <div key={q.id} className="border rounded-xl p-4 bg-card flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-xs font-mono text-muted-foreground shrink-0 pt-0.5">Q{idx + 1}</span>
                      <p className="text-sm font-medium leading-snug line-clamp-2">{q.text}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <ScoreBadge pct={q.correctRate} />
                      <p className="text-xs text-muted-foreground mt-1">
                        {q.totalCorrect} / {q.totalAnswered} correct
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        q.correctRate >= 80 ? 'bg-green-500' :
                        q.correctRate >= 50 ? 'bg-amber-400' : 'bg-red-400',
                      )}
                      style={{ width: `${q.correctRate}%` }}
                    />
                  </div>

                  {q.totalAnswered === 0 && (
                    <p className="text-xs text-muted-foreground italic">Not yet answered</p>
                  )}
                </div>
              ))}
          </div>
        )
      )}
    </div>
  );
}
