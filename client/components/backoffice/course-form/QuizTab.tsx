'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, ClipboardList } from 'lucide-react';
import { DotsLoader } from '@/components/ui/dots-loader';
import { toast } from 'sonner';

interface QuizRewards {
    attempt1Points: number;
    attempt2Points: number;
    attempt3Points: number;
    attempt4PlusPoints: number;
}

interface Quiz {
    id: number;
    title: string;
    questionCount?: number;
    rewards?: QuizRewards | null;
}

interface QuizTabProps {
    courseId: string;
}

export function QuizTab({ courseId }: QuizTabProps) {
    const router = useRouter();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [creating, setCreating] = useState(false);

    const fetchQuizzes = async () => {
        setLoading(true);
        try {
            const data = await api.get(`/courses/${courseId}/quizzes`);
            setQuizzes(data.quizzes ?? data ?? []);
        } catch {
            toast.error('Failed to load quizzes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuizzes();
    }, [courseId]);

    const handleCreate = async () => {
        if (!newTitle.trim()) {
            toast.error('Quiz title is required');
            return;
        }
        setCreating(true);
        try {
            const data = await api.post(`/courses/${courseId}/quizzes`, { title: newTitle });
            const quizId = data.id ?? data.quiz?.id;
            toast.success('Quiz created');
            router.push(`/backoffice/courses/${courseId}/quiz/${quizId}`);
        } catch {
            toast.error('Failed to create quiz');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (quizId: number) => {
        if (!confirm('Delete this quiz? This action cannot be undone.')) return;
        try {
            await api.delete(`/courses/${courseId}/quizzes/${quizId}`);
            setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
            toast.success('Quiz deleted');
        } catch {
            toast.error('Failed to delete quiz');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <DotsLoader size="sm" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {quizzes.length === 0 && !showCreate ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-xl border-2 border-dashed border-muted-foreground/30 text-muted-foreground">
                    <ClipboardList className="size-10 opacity-40" />
                    <p className="text-sm">No quizzes yet. Create your first quiz.</p>
                </div>
            ) : (
                <ul className="flex flex-col gap-2">
                    {quizzes.map((quiz) => (
                        <li
                            key={quiz.id}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-card hover:border-primary/40 transition-colors"
                        >
                            <ClipboardList className="size-4 text-muted-foreground shrink-0" />
                            <span className="flex-1 text-sm font-medium truncate">{quiz.title}</span>
                            {quiz.questionCount != null && (
                                <Badge variant="neutral" className="shrink-0">
                                    {quiz.questionCount} {quiz.questionCount === 1 ? 'question' : 'questions'}
                                </Badge>
                            )}
                            {quiz.rewards && (
                                <span className="text-xs text-muted-foreground shrink-0 font-mono">
                                    {quiz.rewards.attempt1Points} / {quiz.rewards.attempt2Points} / {quiz.rewards.attempt3Points} / {quiz.rewards.attempt4PlusPoints} pts
                                </span>
                            )}
                            <div className="flex items-center gap-1 shrink-0">
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => router.push(`/backoffice/courses/${courseId}/quiz/${quiz.id}`)}
                                    title="Edit quiz"
                                >
                                    <Pencil className="size-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    className="text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDelete(quiz.id)}
                                    title="Delete quiz"
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {showCreate ? (
                <div className="flex items-center gap-2 border rounded-lg px-4 py-3 bg-muted/20">
                    <Input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Quiz title"
                        className="flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreate();
                            if (e.key === 'Escape') {
                                setShowCreate(false);
                                setNewTitle('');
                            }
                        }}
                        disabled={creating}
                    />
                    <Button
                        size="sm"
                        onClick={handleCreate}
                        disabled={creating || !newTitle.trim()}
                    >
                        {creating ? 'Creating...' : 'Create'}
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                            setShowCreate(false);
                            setNewTitle('');
                        }}
                        disabled={creating}
                    >
                        Cancel
                    </Button>
                </div>
            ) : (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreate(true)}
                    className="self-start"
                >
                    <Plus className="size-4 mr-1.5" />
                    Add Quiz
                </Button>
            )}
        </div>
    );
}
