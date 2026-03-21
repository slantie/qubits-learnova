'use client';

import { useState, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Trash, Plus, Check } from '@phosphor-icons/react';

interface Question {
  id: number;
  text: string;
  options: string[];
  correctOptions: number[];
  order: number;
}

interface QuestionEditorProps {
  question: Question;
  courseId: string;
  quizId: string;
  onUpdate: (q: Question) => void;
  onDelete: () => void;
}

export function QuestionEditor({ question, courseId, quizId, onUpdate, onDelete }: QuestionEditorProps) {
  const [text, setText] = useState(question.text);
  const [options, setOptions] = useState<string[]>(question.options);
  const [correctOptions, setCorrectOptions] = useState<number[]>(question.correctOptions);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [noCorrectWarning, setNoCorrectWarning] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state when question prop changes (different question selected)
  const questionId = question.id;
  const prevIdRef = useRef(questionId);
  if (prevIdRef.current !== questionId) {
    prevIdRef.current = questionId;
    setText(question.text);
    setOptions(question.options);
    setCorrectOptions(question.correctOptions);
    setSaved(false);
  }

  const showSaved = () => {
    setSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
  };

  const saveToApi = useCallback(
    async (updatedText: string, updatedOptions: string[], updatedCorrectOptions: number[]) => {
      if (updatedCorrectOptions.length === 0) {
        setNoCorrectWarning(true);
        return;
      }
      setNoCorrectWarning(false);
      try {
        const updated = await api.patch(
          `/courses/${courseId}/quizzes/${quizId}/questions/${questionId}`,
          { text: updatedText, options: updatedOptions, correctOptions: updatedCorrectOptions }
        );
        onUpdate(updated);
        showSaved();
      } catch {
        // silent
      }
    },
    [courseId, quizId, questionId, onUpdate]
  );

  const handleTextBlur = () => {
    saveToApi(text, options, correctOptions);
  };

  const handleOptionChange = (idx: number, value: string) => {
    const next = [...options];
    next[idx] = value;
    setOptions(next);
  };

  const handleOptionBlur = () => {
    saveToApi(text, options, correctOptions);
  };

  const handleCorrectToggle = (idx: number) => {
    const next = correctOptions.includes(idx)
      ? correctOptions.filter((i) => i !== idx)
      : [...correctOptions, idx];
    setCorrectOptions(next);
    saveToApi(text, options, next);
  };

  const handleAddOption = () => {
    const next = [...options, ''];
    setOptions(next);
    // Will be saved on next blur
  };

  const handleDeleteOption = (idx: number) => {
    const next = options.filter((_, i) => i !== idx);
    // Remap correctOptions: remove deleted index, shift down indices above it
    const nextCorrect = correctOptions
      .filter((i) => i !== idx)
      .map((i) => (i > idx ? i - 1 : i));
    setOptions(next);
    setCorrectOptions(nextCorrect);
    saveToApi(text, next, nextCorrect);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this question?')) return;
    setDeleting(true);
    try {
      await api.delete(`/courses/${courseId}/quizzes/${quizId}/questions/${questionId}`);
      onDelete();
    } catch {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg text-foreground">Question</h2>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="flex items-center gap-1 text-xs text-primary font-medium">
              <Check className="w-3.5 h-3.5" />
              Saved
            </span>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 border border-destructive/30 hover:border-destructive/60 rounded-md px-2 py-1.5 transition-colors disabled:opacity-50"
          >
            <Trash className="w-3.5 h-3.5" />
            {deleting ? 'Deleting…' : 'Delete question'}
          </button>
        </div>
      </div>

      {/* Question text */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Question text</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleTextBlur}
          rows={3}
          placeholder="Enter your question…"
          className="border rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
        />
      </div>

      {/* Options */}
      <div className="flex flex-col gap-3">
        <label className="text-sm font-medium text-foreground">Answer options</label>

        {options.map((opt, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {/* Correct answer checkbox */}
            <label className="flex items-center gap-1.5 cursor-pointer shrink-0" title="Mark as correct">
              <input
                type="checkbox"
                checked={correctOptions.includes(idx)}
                onChange={() => handleCorrectToggle(idx)}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
              <span className="text-xs text-muted-foreground sr-only">Correct</span>
            </label>

            {/* Option text */}
            <input
              type="text"
              value={opt}
              onChange={(e) => handleOptionChange(idx, e.target.value)}
              onBlur={handleOptionBlur}
              placeholder={`Option ${idx + 1}`}
              className={`flex-1 border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground transition-colors ${
                correctOptions.includes(idx)
                  ? 'border-primary/60 bg-primary/5'
                  : ''
              }`}
            />

            {/* Correct label */}
            {correctOptions.includes(idx) && (
              <span className="text-xs text-primary font-medium shrink-0">Correct</span>
            )}

            {/* Delete option */}
            {options.length > 2 && (
              <button
                onClick={() => handleDeleteOption(idx)}
                className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                title="Remove option"
              >
                <Trash className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={handleAddOption}
          className="w-fit mt-1"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Option
        </Button>

        {noCorrectWarning && (
          <p className="text-xs text-destructive mt-1">
            Mark at least one option as correct before saving.
          </p>
        )}
      </div>
    </div>
  );
}
