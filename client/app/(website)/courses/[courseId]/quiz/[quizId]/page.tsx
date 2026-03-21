'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
    ArrowLeft, Trophy, CheckCircle2, XCircle,
    RotateCcw, Clock, Loader2, ClipboardList, AlertCircle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuizQuestion {
    id: number;
    text: string;
    options: string[];
    correctOptions: number[];
    order: number;
}

interface QuizRewards {
    attempt1Points: number;
    attempt2Points: number;
    attempt3Points: number;
    attempt4PlusPoints: number;
}

interface QuizData {
    id: number;
    title: string;
    questions: QuizQuestion[];
    rewards: QuizRewards | null;
}

interface AttemptResult {
    id: number;
    attemptNumber: number;
    pointsEarned: number;
    scorePercentage: number;
    correctCount: number;
    totalQuestions: number;
    completedAt: string;
}

interface PastAttempt {
    id: number;
    attemptNumber: number;
    pointsEarned: number;
    completedAt: string;
}

type PageState = 'loading' | 'taking' | 'submitting' | 'result' | 'error';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function tierPoints(rewards: QuizRewards | null, attemptNumber: number): number {
    if (!rewards) return 0;
    if (attemptNumber === 1) return rewards.attempt1Points;
    if (attemptNumber === 2) return rewards.attempt2Points;
    if (attemptNumber === 3) return rewards.attempt3Points;
    return rewards.attempt4PlusPoints;
}

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ pct }: { pct: number }) {
    const r = 40;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;
    const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';

    return (
        <svg width={104} height={104} className="-rotate-90">
            <circle cx={52} cy={52} r={r} strokeWidth={10} stroke="var(--border)" fill="none" />
            <circle
                cx={52} cy={52} r={r} strokeWidth={10} fill="none"
                stroke={color}
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.7s ease' }}
            />
            <text
                x={52} y={57}
                textAnchor="middle"
                fontSize={18}
                fontWeight={700}
                fill="currentColor"
                className="fill-foreground origin-[52px_52px] rotate-90"
            >
                {pct}%
            </text>
        </svg>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LearnerQuizPage() {
    const params = useParams();
    const courseId = params.courseId as string;
    const quizId = params.quizId as string;

    const [pageState, setPageState] = useState<PageState>('loading');
    const [quiz, setQuiz] = useState<QuizData | null>(null);
    const [pastAttempts, setPastAttempts] = useState<PastAttempt[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Map of questionId → selected option indices
    const [answers, setAnswers] = useState<Map<number, Set<number>>>(new Map());
    const [validationError, setValidationError] = useState<string | null>(null);

    const [result, setResult] = useState<AttemptResult | null>(null);

    // ── Load quiz + past attempts ──────────────────────────────────────────────

    const loadData = useCallback(async () => {
        setPageState('loading');
        try {
            const [quizData, attemptsData] = await Promise.all([
                api.get(`/courses/${courseId}/quizzes/${quizId}`),
                api.get(`/courses/${courseId}/quizzes/${quizId}/attempts`),
            ]);
            setQuiz(quizData);
            setPastAttempts(attemptsData?.attempts ?? []);
            setPageState('taking');
        } catch {
            setError('Failed to load quiz.');
            setPageState('error');
        }
    }, [courseId, quizId]);

    useEffect(() => { loadData(); }, [loadData]);

    // ── Toggle option selection ────────────────────────────────────────────────

    const toggleOption = (questionId: number, optIdx: number) => {
        setValidationError(null);
        setAnswers(prev => {
            const next = new Map(prev);
            const current = new Set(next.get(questionId) ?? []);
            if (current.has(optIdx)) current.delete(optIdx);
            else current.add(optIdx);
            next.set(questionId, current);
            return next;
        });
    };

    // ── Submit ─────────────────────────────────────────────────────────────────

    const handleSubmit = async () => {
        if (!quiz) return;

        // Validate every question has at least one answer
        const unanswered = quiz.questions.filter(q => {
            const sel = answers.get(q.id);
            return !sel || sel.size === 0;
        });

        if (unanswered.length > 0) {
            setValidationError(
                `Please answer all questions. ${unanswered.length} question${unanswered.length > 1 ? 's' : ''} remaining.`
            );
            // Scroll to first unanswered
            const el = document.getElementById(`q-${unanswered[0].id}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        setPageState('submitting');
        try {
            const payload = {
                answers: quiz.questions.map(q => ({
                    questionId: q.id,
                    selectedOptions: Array.from(answers.get(q.id) ?? []).sort((a, b) => a - b),
                })),
            };
            const res: AttemptResult = await api.post(
                `/courses/${courseId}/quizzes/${quizId}/attempt`,
                payload,
            );
            setResult(res);
            setPastAttempts(prev => [
                { id: res.id, attemptNumber: res.attemptNumber, pointsEarned: res.pointsEarned, completedAt: res.completedAt },
                ...prev,
            ]);
            setPageState('result');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err: any) {
            setValidationError(err?.data?.message ?? 'Failed to submit. Please try again.');
            setPageState('taking');
        }
    };

    // ── Retry ─────────────────────────────────────────────────────────────────

    const handleRetry = () => {
        setAnswers(new Map());
        setResult(null);
        setValidationError(null);
        setPageState('taking');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ── Render ────────────────────────────────────────────────────────────────

    if (pageState === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="size-7 animate-spin text-primary" />
            </div>
        );
    }

    if (pageState === 'error' || !quiz) {
        return (
            <div className="flex flex-col items-center gap-4 py-24 text-center">
                <AlertCircle className="size-10 text-muted-foreground" />
                <p className="text-lg font-medium">{error ?? 'Quiz not found'}</p>
                <Link href={`/courses/${courseId}`}>
                    <Button variant="outline" size="sm">Back to course</Button>
                </Link>
            </div>
        );
    }

    const attemptNumber = pastAttempts.length + (pageState === 'result' ? 0 : 1);
    const nextPoints = quiz.rewards ? tierPoints(quiz.rewards, pastAttempts.length + 1) : 0;

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <Link
                        href={`/courses/${courseId}`}
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-1"
                    >
                        <ArrowLeft className="size-3.5" />
                        Back to course
                    </Link>
                    <h1 className="text-2xl font-semibold">{quiz.title}</h1>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                        <Badge variant="neutral">
                            <ClipboardList className="size-3 mr-1" />
                            {quiz.questions.length} question{quiz.questions.length !== 1 ? 's' : ''}
                        </Badge>
                        {pastAttempts.length > 0 && (
                            <Badge variant="neutral">
                                <Clock className="size-3 mr-1" />
                                {pastAttempts.length} past attempt{pastAttempts.length !== 1 ? 's' : ''}
                            </Badge>
                        )}
                        {quiz.rewards && pageState === 'taking' && (
                            <Badge variant="success">
                                <Trophy className="size-3 mr-1" />
                                {nextPoints} pts for this attempt
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            {/* ── RESULT VIEW ────────────────────────────────────────────────── */}
            {pageState === 'result' && result && (
                <div className="rounded-2xl border bg-card p-6 flex flex-col gap-5">
                    {/* Score + stats */}
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        <div className="shrink-0">
                            <ScoreRing pct={result.scorePercentage} />
                        </div>
                        <div className="flex flex-col gap-3 flex-1">
                            <div>
                                <p className="text-xl font-semibold">
                                    {result.scorePercentage >= 80
                                        ? 'Great job!'
                                        : result.scorePercentage >= 50
                                        ? 'Good effort'
                                        : 'Keep practising'}
                                </p>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    {result.correctCount} of {result.totalQuestions} correct · Attempt #{result.attemptNumber}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                {result.pointsEarned > 0 && (
                                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                                        <Trophy className="size-3.5" />
                                        +{result.pointsEarned} points earned
                                    </span>
                                )}
                            </div>

                            <Progress
                                value={result.scorePercentage}
                                className="h-2"
                            />
                        </div>
                    </div>

                    {/* Rewards hint */}
                    {quiz.rewards && (
                        <div className="rounded-lg bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
                            Points per attempt: {quiz.rewards.attempt1Points} → {quiz.rewards.attempt2Points} → {quiz.rewards.attempt3Points} → {quiz.rewards.attempt4PlusPoints} (4th+)
                        </div>
                    )}

                    <Button onClick={handleRetry} variant="outline" className="self-start">
                        <RotateCcw className="size-4 mr-2" />
                        Try Again
                    </Button>
                </div>
            )}

            {/* ── QUESTIONS ──────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-6">
                {quiz.questions.map((q, qIdx) => {
                    const selectedSet = answers.get(q.id) ?? new Set<number>();
                    const isAnswered = selectedSet.size > 0;
                    const isResult = pageState === 'result' && !!result;

                    return (
                        <div
                            key={q.id}
                            id={`q-${q.id}`}
                            className={cn(
                                'rounded-xl border bg-card p-5 flex flex-col gap-4 transition-colors',
                                !isAnswered && pageState === 'taking' && validationError
                                    ? 'border-destructive/50 bg-destructive/5'
                                    : '',
                            )}
                        >
                            {/* Question header */}
                            <div className="flex items-start gap-3">
                                <span className="shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                                    {qIdx + 1}
                                </span>
                                <p className="text-sm font-medium leading-relaxed pt-0.5 flex-1">{q.text}</p>

                                {/* Correct / wrong indicator (result mode) */}
                                {isResult && (() => {
                                    const sel = Array.from(selectedSet).sort((a, b) => a - b);
                                    const correct = [...q.correctOptions].sort((a, b) => a - b);
                                    const isCorrect =
                                        sel.length === correct.length &&
                                        sel.every((v, i) => v === correct[i]);
                                    return isCorrect
                                        ? <CheckCircle2 className="size-5 text-green-500 shrink-0" />
                                        : <XCircle className="size-5 text-destructive shrink-0" />;
                                })()}
                            </div>

                            {/* Options */}
                            <div className="flex flex-col gap-2 pl-10">
                                {q.options.map((opt, optIdx) => {
                                    const isSelected = selectedSet.has(optIdx);
                                    const isCorrectOpt = q.correctOptions.includes(optIdx);

                                    // Result mode coloring
                                    let optClass = '';
                                    if (isResult) {
                                        if (isCorrectOpt) {
                                            optClass = 'border-green-400 bg-green-50/50 dark:bg-green-950/20';
                                        } else if (isSelected && !isCorrectOpt) {
                                            optClass = 'border-destructive/50 bg-destructive/5';
                                        }
                                    } else {
                                        optClass = isSelected
                                            ? 'border-primary bg-primary/5'
                                            : 'hover:border-muted-foreground/40 hover:bg-muted/30';
                                    }

                                    return (
                                        <label
                                            key={optIdx}
                                            className={cn(
                                                'flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors select-none',
                                                optClass,
                                                isResult && 'cursor-default',
                                            )}
                                            onClick={() => {
                                                if (pageState === 'taking') toggleOption(q.id, optIdx);
                                            }}
                                        >
                                            <div className={cn(
                                                'size-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors',
                                                isSelected && !isResult ? 'bg-primary border-primary' : 'border-muted-foreground/40',
                                                isResult && isCorrectOpt ? 'bg-green-500 border-green-500' : '',
                                                isResult && isSelected && !isCorrectOpt ? 'bg-destructive border-destructive' : '',
                                            )}>
                                                {(isSelected || (isResult && isCorrectOpt)) && (
                                                    <svg className="size-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                                                        <path d="M3.5 6L5.5 8L8.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                                    </svg>
                                                )}
                                            </div>
                                            <span className="text-sm flex-1">{opt}</span>
                                            {isResult && isCorrectOpt && (
                                                <span className="text-xs font-medium text-green-600 shrink-0">Correct</span>
                                            )}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── SUBMIT (taking mode only) ───────────────────────────────────── */}
            {pageState === 'taking' && (
                <div className="flex flex-col gap-3 sticky bottom-4">
                    {validationError && (
                        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-4 py-2.5 rounded-lg border border-destructive/20">
                            <AlertCircle className="size-4 shrink-0" />
                            {validationError}
                        </div>
                    )}
                    <div className="flex items-center gap-3 bg-background/95 backdrop-blur border rounded-xl px-4 py-3 shadow-lg">
                        <span className="text-sm text-muted-foreground flex-1">
                            {answers.size} / {quiz.questions.length} answered
                        </span>
                        <Progress
                            value={(answers.size / quiz.questions.length) * 100}
                            className="h-1.5 w-24"
                        />
                        <Button
                            onClick={handleSubmit}
                            disabled={answers.size < quiz.questions.length}
                            className="shrink-0"
                        >
                            Submit Quiz
                        </Button>
                    </div>
                </div>
            )}

            {/* ── SUBMITTING ─────────────────────────────────────────────────── */}
            {pageState === 'submitting' && (
                <div className="flex items-center justify-center gap-3 py-8 text-muted-foreground">
                    <Loader2 className="size-5 animate-spin" />
                    <span className="text-sm">Submitting your answers…</span>
                </div>
            )}

            {/* ── ATTEMPT HISTORY ────────────────────────────────────────────── */}
            {pastAttempts.length > 0 && (
                <div className="flex flex-col gap-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Attempt History
                    </h2>
                    <div className="rounded-xl border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40 border-b">
                                <tr>
                                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Attempt</th>
                                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Points</th>
                                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pastAttempts.map((a, i) => (
                                    <tr key={a.id} className={cn('border-b last:border-b-0', i % 2 === 0 ? 'bg-background' : 'bg-muted/20')}>
                                        <td className="px-4 py-2.5 font-medium">
                                            #{a.attemptNumber}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className="inline-flex items-center gap-1 text-primary font-semibold">
                                                <Trophy className="size-3.5" />
                                                {a.pointsEarned} pts
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-muted-foreground text-xs hidden sm:table-cell">
                                            {formatDate(a.completedAt)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
