'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    ArrowLeft, Trophy, CheckCircle, XCircle,
    ArrowCounterClockwise, Clock, CircleNotch, ClipboardText,
    Warning, ArrowRight, X, Star,
} from '@phosphor-icons/react';

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
    scorePct: number;        // 0–1 float from backend
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

type Screen = 'loading' | 'error' | 'intro' | 'question' | 'submitting' | 'result';

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
    const r = 52;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;
    const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';

    return (
        <svg width={128} height={128} className="-rotate-90">
            <circle cx={64} cy={64} r={r} strokeWidth={10} stroke="var(--border)" fill="none" />
            <circle
                cx={64} cy={64} r={r} strokeWidth={10} fill="none"
                stroke={color}
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeLinecap="round"
                className="[transition:stroke-dasharray_0.7s_ease]"
            />
            <text
                x={64} y={70}
                textAnchor="middle"
                fontSize={22}
                fontWeight={700}
                fill="currentColor"
                className="fill-foreground origin-[64px_64px] rotate-90"
            >
                {pct}%
            </text>
        </svg>
    );
}

// ─── Points Popup ─────────────────────────────────────────────────────────────

function PointsPopup({ points, onClose }: { points: number; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="relative bg-card border rounded-2xl p-8 flex flex-col items-center gap-4 max-w-sm w-full shadow-2xl animate-in zoom-in-90 duration-300">
                <button
                    type="button"
                    onClick={onClose}
                    title="Close"
                    className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground"
                >
                    <X className="size-4" />
                </button>

                {/* Trophy burst */}
                <div className="relative flex items-center justify-center">
                    <div className="absolute size-24 rounded-full bg-primary/10 animate-ping opacity-30" />
                    <div className="size-20 rounded-full bg-primary/15 flex items-center justify-center">
                        <Trophy className="size-10 text-primary" weight="fill" />
                    </div>
                </div>

                <div className="text-center flex flex-col gap-1">
                    <p className="text-3xl font-bold text-primary">+{points}</p>
                    <p className="text-base font-medium">points earned!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Keep completing lessons to climb the leaderboard.
                    </p>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {[...Array(5)].map((_, i) => (
                        <Star key={i} className="size-3.5 text-amber-400" weight={i < 3 ? 'fill' : 'regular'} />
                    ))}
                </div>

                <Button onClick={onClose} className="w-full mt-1">
                    Continue
                </Button>
            </div>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LearnerQuizPage() {
    const params = useParams();
    const courseId = params.courseId as string;
    const quizId = params.quizId as string;

    const [screen, setScreen] = useState<Screen>('loading');
    const [quiz, setQuiz] = useState<QuizData | null>(null);
    const [pastAttempts, setPastAttempts] = useState<PastAttempt[]>([]);
    const [error, setError] = useState<string | null>(null);

    // One-question-at-a-time state
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState<Map<number, Set<number>>>(new Map());
    const [selectionError, setSelectionError] = useState(false);

    const [result, setResult] = useState<AttemptResult | null>(null);
    const [showPointsPopup, setShowPointsPopup] = useState(false);

    // ── Load ──────────────────────────────────────────────────────────────────

    const loadData = useCallback(async () => {
        setScreen('loading');
        try {
            const [quizData, attemptsData] = await Promise.all([
                api.get(`/courses/${courseId}/quizzes/${quizId}`),
                api.get(`/courses/${courseId}/quizzes/${quizId}/attempts`),
            ]);
            setQuiz(quizData);
            setPastAttempts(attemptsData?.attempts ?? []);
            setScreen('intro');
        } catch {
            setError('Failed to load quiz.');
            setScreen('error');
        }
    }, [courseId, quizId]);

    useEffect(() => { loadData(); }, [loadData]);

    if (!quiz && screen === 'loading') {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-background">
                <CircleNotch className="size-8 animate-spin text-primary" />
            </div>
        );
    }

    if (screen === 'error' || !quiz) {
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-background text-center p-6">
                <Warning className="size-10 text-muted-foreground" />
                <p className="text-lg font-medium">{error ?? 'Quiz not found'}</p>
                <Link href={`/courses/${courseId}`}>
                    <Button variant="outline">Back to course</Button>
                </Link>
            </div>
        );
    }

    const totalQ = quiz.questions.length;
    const nextAttemptNumber = pastAttempts.length + 1;
    const nextPoints = tierPoints(quiz.rewards, nextAttemptNumber);
    const currentQ = quiz.questions[currentIdx];
    const isLastQuestion = currentIdx === totalQ - 1;
    const currentSelection = answers.get(currentQ?.id ?? -1) ?? new Set<number>();

    // ── Handlers ──────────────────────────────────────────────────────────────

    const startQuiz = () => {
        setAnswers(new Map());
        setCurrentIdx(0);
        setSelectionError(false);
        setScreen('question');
    };

    const toggleOption = (optIdx: number) => {
        if (!currentQ) return;
        setSelectionError(false);
        setAnswers(prev => {
            const next = new Map(prev);
            const current = new Set(next.get(currentQ.id) ?? []);
            if (current.has(optIdx)) current.delete(optIdx);
            else current.add(optIdx);
            next.set(currentQ.id, current);
            return next;
        });
    };

    const handleProceed = async () => {
        if (currentSelection.size === 0) {
            setSelectionError(true);
            return;
        }

        if (!isLastQuestion) {
            setCurrentIdx(i => i + 1);
            return;
        }

        // Last question — submit
        setScreen('submitting');
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
            setScreen('result');
            if (res.pointsEarned > 0) {
                setShowPointsPopup(true);
            }
        } catch (err: any) {
            setSelectionError(false);
            setScreen('question');
            // surface error briefly — go back to last question
            setCurrentIdx(totalQ - 1);
        }
    };

    const handleRetry = () => {
        setAnswers(new Map());
        setResult(null);
        setSelectionError(false);
        setCurrentIdx(0);
        setScreen('intro');
    };

    // ── INTRO SCREEN ─────────────────────────────────────────────────────────

    if (screen === 'intro') {
        return (
            <div className="fixed inset-0 flex flex-col bg-background overflow-y-auto">
                {/* Top bar */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <Link
                        href={`/courses/${courseId}`}
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="size-3.5" />
                        Back to course
                    </Link>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
                    <div className="w-full max-w-md flex flex-col gap-8">
                        {/* Icon */}
                        <div className="flex items-center justify-center">
                            <div className="size-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                                <ClipboardText className="size-10 text-primary" weight="duotone" />
                            </div>
                        </div>

                        {/* Title + meta */}
                        <div className="text-center flex flex-col gap-2">
                            <h1 className="text-2xl font-semibold">{quiz.title}</h1>
                            <p className="text-sm text-muted-foreground">
                                Answer all questions to earn points
                            </p>
                        </div>

                        {/* Info cards */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl border bg-card p-4 flex flex-col gap-1">
                                <ClipboardText className="size-5 text-muted-foreground mb-1" />
                                <p className="text-2xl font-bold">{totalQ}</p>
                                <p className="text-xs text-muted-foreground">Question{totalQ !== 1 ? 's' : ''}</p>
                            </div>
                            <div className="rounded-xl border bg-card p-4 flex flex-col gap-1">
                                <ArrowCounterClockwise className="size-5 text-muted-foreground mb-1" />
                                <p className="text-2xl font-bold">
                                    {pastAttempts.length === 0 ? '∞' : pastAttempts.length}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {pastAttempts.length === 0 ? 'Multiple attempts' : `Past attempt${pastAttempts.length !== 1 ? 's' : ''}`}
                                </p>
                            </div>
                            {quiz.rewards && (
                                <div className="col-span-2 rounded-xl border bg-primary/5 border-primary/20 p-4 flex items-center gap-3">
                                    <Trophy className="size-5 text-primary shrink-0" weight="fill" />
                                    <div className="flex flex-col gap-0.5">
                                        <p className="text-sm font-medium text-primary">
                                            Up to {nextPoints} points for this attempt
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {quiz.rewards.attempt1Points} → {quiz.rewards.attempt2Points} → {quiz.rewards.attempt3Points} → {quiz.rewards.attempt4PlusPoints} (4th+)
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <Button size="lg" className="w-full" onClick={startQuiz}>
                            {pastAttempts.length === 0 ? 'Start Quiz' : 'Try Again'}
                            <ArrowRight className="size-4 ml-2" />
                        </Button>

                        {/* Past attempts */}
                        {pastAttempts.length > 0 && (
                            <div className="flex flex-col gap-2">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Attempt history</p>
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
                                                    <td className="px-4 py-2.5 font-medium">#{a.attemptNumber}</td>
                                                    <td className="px-4 py-2.5">
                                                        <span className="inline-flex items-center gap-1 text-primary font-normal">
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
                </div>
            </div>
        );
    }

    // ── SUBMITTING SCREEN ─────────────────────────────────────────────────────

    if (screen === 'submitting') {
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-background">
                <CircleNotch className="size-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Submitting your answers…</p>
            </div>
        );
    }

    // ── RESULT SCREEN ─────────────────────────────────────────────────────────

    if (screen === 'result' && result) {
        const scorePct100 = Math.round(result.scorePct * 100);
        const label =
            scorePct100 >= 80 ? 'Great job!' :
            scorePct100 >= 50 ? 'Good effort' :
            'Keep practising';

        return (
            <>
                {showPointsPopup && (
                    <PointsPopup
                        points={result.pointsEarned}
                        onClose={() => setShowPointsPopup(false)}
                    />
                )}

                <div className="fixed inset-0 flex flex-col bg-background overflow-y-auto">
                    {/* Top bar */}
                    <div className="flex items-center justify-between px-6 py-4 border-b">
                        <Link
                            href={`/courses/${courseId}`}
                            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="size-3.5" />
                            Back to course
                        </Link>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
                        <div className="w-full max-w-md flex flex-col gap-8">
                            {/* Score */}
                            <div className="flex flex-col items-center gap-4">
                                <ScoreRing pct={scorePct100} />
                                <div className="text-center flex flex-col gap-1">
                                    <p className="text-2xl font-semibold">{label}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {result.correctCount} of {result.totalQuestions} correct · Attempt #{result.attemptNumber}
                                    </p>
                                </div>
                                {result.pointsEarned > 0 && (
                                    <span className="inline-flex items-center gap-2 text-sm font-medium text-primary bg-primary/10 px-4 py-1.5 rounded-full">
                                        <Trophy className="size-4" weight="fill" />
                                        +{result.pointsEarned} points earned
                                    </span>
                                )}
                            </div>

                            {/* Per-question review */}
                            <div className="flex flex-col gap-3">
                                {quiz.questions.map((q, qIdx) => {
                                    const selectedSet = answers.get(q.id) ?? new Set<number>();
                                    const sel = Array.from(selectedSet).sort((a, b) => a - b);
                                    const correct = [...q.correctOptions].sort((a, b) => a - b);
                                    const isCorrect =
                                        sel.length === correct.length &&
                                        sel.every((v, i) => v === correct[i]);

                                    return (
                                        <div key={q.id} className="rounded-xl border bg-card p-4 flex flex-col gap-3">
                                            <div className="flex items-start gap-3">
                                                <span className="shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                                                    {qIdx + 1}
                                                </span>
                                                <p className="text-sm font-medium leading-relaxed pt-0.5 flex-1">{q.text}</p>
                                                {isCorrect
                                                    ? <CheckCircle className="size-5 text-primary shrink-0" weight="fill" />
                                                    : <XCircle className="size-5 text-destructive shrink-0" weight="fill" />
                                                }
                                            </div>
                                            <div className="flex flex-col gap-1.5 pl-9">
                                                {q.options.map((opt, optIdx) => {
                                                    const isSelected = selectedSet.has(optIdx);
                                                    const isCorrectOpt = q.correctOptions.includes(optIdx);
                                                    let cls = 'border-border';
                                                    if (isCorrectOpt) cls = 'border-primary/50 bg-primary/5';
                                                    else if (isSelected) cls = 'border-destructive/50 bg-destructive/5';
                                                    return (
                                                        <div key={optIdx} className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm', cls)}>
                                                            <div className={cn(
                                                                'size-3.5 rounded-sm border-2 shrink-0',
                                                                isCorrectOpt ? 'bg-primary border-primary' : isSelected ? 'bg-destructive border-destructive' : 'border-muted-foreground/40',
                                                            )} />
                                                            <span className="flex-1">{opt}</span>
                                                            {isCorrectOpt && (
                                                                <span className="text-xs text-primary font-medium">Correct</span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Rewards hint */}
                            {quiz.rewards && (
                                <div className="rounded-lg bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
                                    Points per attempt: {quiz.rewards.attempt1Points} → {quiz.rewards.attempt2Points} → {quiz.rewards.attempt3Points} → {quiz.rewards.attempt4PlusPoints} (4th+)
                                </div>
                            )}

                            <div className="flex gap-3">
                                <Button onClick={handleRetry} variant="outline" className="flex-1">
                                    <ArrowCounterClockwise className="size-4 mr-2" />
                                    Try Again
                                </Button>
                                <Link href={`/courses/${courseId}`} className="flex-1">
                                    <Button variant="outline" className="w-full">
                                        <ArrowLeft className="size-4 mr-2" />
                                        Back to course
                                    </Button>
                                </Link>
                            </div>

                            {/* Past attempts */}
                            {pastAttempts.length > 0 && (
                                <div className="flex flex-col gap-2">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Attempt history</p>
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
                                                        <td className="px-4 py-2.5 font-medium">#{a.attemptNumber}</td>
                                                        <td className="px-4 py-2.5">
                                                            <span className="inline-flex items-center gap-1 text-primary font-normal">
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
                    </div>
                </div>
            </>
        );
    }

    // ── QUESTION SCREEN ───────────────────────────────────────────────────────

    return (
        <div className="fixed inset-0 flex flex-col bg-background">
            {/* Top bar */}
            <div className="flex items-center gap-4 px-6 py-4 border-b shrink-0">
                <button
                    type="button"
                    onClick={() => setScreen('intro')}
                    title="Exit quiz"
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                >
                    <X className="size-4" />
                </button>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                        className="h-full rounded-full bg-primary transition-all duration-500 w-[calc(var(--pct)*1%)]"
                        style={{ '--pct': ((currentIdx + (currentSelection.size > 0 ? 1 : 0)) / totalQ) * 100 } as Record<string, number>}
                    />
                </div>
                <span className="text-sm text-muted-foreground shrink-0 tabular-nums">
                    {currentIdx + 1} / {totalQ}
                </span>
            </div>

            {/* Question body */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 overflow-y-auto">
                <div className="w-full max-w-xl flex flex-col gap-6">
                    {/* Question number + text */}
                    <div className="flex flex-col gap-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
                            Question {currentIdx + 1}
                        </p>
                        <p className="text-xl font-semibold leading-snug">{currentQ.text}</p>
                        <p className="text-xs text-muted-foreground">Select one or more options</p>
                    </div>

                    {/* Options */}
                    <div className="flex flex-col gap-2.5">
                        {currentQ.options.map((opt, optIdx) => {
                            const isSelected = currentSelection.has(optIdx);
                            return (
                                <button
                                    type="button"
                                    key={optIdx}
                                    onClick={() => toggleOption(optIdx)}
                                    className={cn(
                                        'flex items-center gap-4 px-5 py-4 rounded-xl border text-left transition-all duration-150',
                                        isSelected
                                            ? 'border-primary bg-primary/8 shadow-sm'
                                            : 'border-border hover:border-primary/40 hover:bg-muted/40',
                                    )}
                                >
                                    <div className={cn(
                                        'size-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors',
                                        isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40',
                                    )}>
                                        {isSelected && (
                                            <svg className="size-3 text-white" fill="none" viewBox="0 0 12 12">
                                                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                    </div>
                                    <span className="text-sm font-medium flex-1">{opt}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Selection error */}
                    {selectionError && (
                        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-4 py-2.5 rounded-lg border border-destructive/20">
                            <Warning className="size-4 shrink-0" />
                            Please select an option before proceeding.
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom bar */}
            <div className="shrink-0 border-t bg-background/95 backdrop-blur px-6 py-4 flex items-center justify-between gap-4">
                <button
                    type="button"
                    onClick={() => {
                        if (currentIdx > 0) setCurrentIdx(i => i - 1);
                        else setScreen('intro');
                    }}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="size-4" />
                    {currentIdx === 0 ? 'Exit' : 'Back'}
                </button>

                <Button
                    onClick={handleProceed}
                    size="lg"
                    className="min-w-36"
                >
                    {isLastQuestion ? (
                        <>
                            Complete Quiz
                            <CheckCircle className="size-4 ml-2" />
                        </>
                    ) : (
                        <>
                            Proceed
                            <ArrowRight className="size-4 ml-2" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
