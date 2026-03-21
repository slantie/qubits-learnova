'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { QuestionEditor } from '@/components/backoffice/quiz-builder/QuestionEditor';
import { RewardsPanel } from '@/components/backoffice/quiz-builder/RewardsPanel';
import { ArrowLeft, Plus, Trophy, FileQuestion, BarChart3 } from 'lucide-react';

interface Question {
  id: number;
  text: string;
  options: string[];
  correctOptions: number[];
  order: number;
}

interface Rewards {
  attempt1Points: number;
  attempt2Points: number;
  attempt3Points: number;
  attempt4PlusPoints: number;
}

interface Quiz {
  id: number;
  title: string;
  questions: Question[];
  rewards: Rewards | null;
}

export default function QuizBuilderPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const quizId = params.quizId as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [showRewards, setShowRewards] = useState(false);
  const [saving, setSaving] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data: Quiz = await api.get(`/courses/${courseId}/quizzes/${quizId}`);
        setQuiz(data);
        setTitleValue(data.title);
        setActiveIdx(0);
      } catch {
        setError('Failed to load quiz.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [courseId, quizId]);

  const handleTitleBlur = async () => {
    if (!quiz || titleValue === quiz.title) return;
    setSaving(true);
    try {
      const updated = await api.patch(`/courses/${courseId}/quizzes/${quizId}`, { title: titleValue });
      setQuiz((prev) => prev ? { ...prev, title: updated.title ?? titleValue } : prev);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!quiz) return;
    try {
      const newQ: Question = await api.post(`/courses/${courseId}/quizzes/${quizId}/questions`, {
        text: 'New question',
        options: ['Option A', 'Option B'],
        correctOptions: [],
      });
      setQuiz((prev) => prev ? { ...prev, questions: [...prev.questions, newQ] } : prev);
      setActiveIdx(quiz.questions.length); // will be last after append
    } catch {
      // silent
    }
  };

  const handleQuestionUpdate = (updatedQ: Question) => {
    setQuiz((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        questions: prev.questions.map((q) => (q.id === updatedQ.id ? updatedQ : q)),
      };
    });
  };

  const handleQuestionDelete = (deletedId: number) => {
    setQuiz((prev) => {
      if (!prev) return prev;
      const next = prev.questions.filter((q) => q.id !== deletedId);
      return { ...prev, questions: next };
    });
    setActiveIdx((prev) => Math.max(0, prev - 1));
  };

  const handleRewardsSave = (reward: Rewards) => {
    setQuiz((prev) => prev ? { ...prev, rewards: reward } : prev);
    setShowRewards(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] text-muted-foreground">
        Loading quiz…
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] text-destructive">
        {error ?? 'Quiz not found.'}
      </div>
    );
  }

  const activeQuestion = quiz.questions[activeIdx] ?? null;

  return (
    <>
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        {/* Left sidebar */}
        <aside className="w-56 flex flex-col border-r bg-muted/20 shrink-0">
          {/* Back link */}
          <div className="p-3 border-b">
            <Link
              href={`/backoffice/courses/${courseId}/edit?tab=quiz`}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Course
            </Link>
          </div>

          {/* Quiz title */}
          <div className="p-3 border-b">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
              Quiz Title
            </label>
            <input
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="Quiz title…"
              className="w-full text-sm font-medium bg-transparent border rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            />
            {saving && <span className="text-xs text-muted-foreground mt-1 block">Saving…</span>}
          </div>

          {/* Question list */}
          <div className="flex-1 overflow-y-auto py-2">
            {quiz.questions.length === 0 ? (
              <p className="text-xs text-muted-foreground px-3 py-2 italic">No questions yet</p>
            ) : (
              quiz.questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setActiveIdx(idx)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    idx === activeIdx
                      ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary'
                      : 'text-foreground hover:bg-muted/60'
                  }`}
                >
                  <span className="block truncate">Question {idx + 1}</span>
                  <span className="block text-xs text-muted-foreground truncate mt-0.5">
                    {q.text}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Bottom buttons */}
          <div className="p-3 border-t flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddQuestion}
              className="w-full justify-start gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Question
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRewards(true)}
              className="w-full justify-start gap-1.5"
            >
              <Trophy className="w-3.5 h-3.5" />
              Rewards
              {quiz.rewards && (
                <span className="ml-auto text-xs text-green-600 font-medium">Set</span>
              )}
            </Button>
            <Link
              href={`/backoffice/courses/${courseId}/quiz/${quizId}/attempts`}
              className="w-full inline-flex items-center gap-1.5 text-sm border rounded-md px-3 py-1.5 hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              View Attempts
            </Link>
          </div>
        </aside>

        {/* Right main area */}
        <main className="flex-1 overflow-y-auto">
          {quiz.questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
              <FileQuestion className="w-12 h-12 opacity-30" />
              <p className="text-lg font-medium">No questions yet</p>
              <p className="text-sm">Add your first question to get started.</p>
              <Button onClick={handleAddQuestion}>
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            </div>
          ) : activeQuestion ? (
            <div className="p-8">
              <QuestionEditor
                key={activeQuestion.id}
                question={activeQuestion}
                courseId={courseId}
                quizId={String(quizId)}
                onUpdate={handleQuestionUpdate}
                onDelete={() => handleQuestionDelete(activeQuestion.id)}
              />
            </div>
          ) : null}
        </main>
      </div>

      {/* Rewards panel */}
      {showRewards && (
        <RewardsPanel
          reward={quiz.rewards}
          courseId={courseId}
          quizId={quizId}
          onSave={handleRewardsSave}
          onClose={() => setShowRewards(false)}
        />
      )}
    </>
  );
}
