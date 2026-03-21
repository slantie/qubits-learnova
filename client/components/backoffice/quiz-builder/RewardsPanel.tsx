'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface RewardsPanelProps {
  reward: {
    attempt1Points: number;
    attempt2Points: number;
    attempt3Points: number;
    attempt4PlusPoints: number;
  } | null;
  courseId: string;
  quizId: string;
  onSave: (reward: any) => void;
  onClose: () => void;
}

export function RewardsPanel({ reward, courseId, quizId, onSave, onClose }: RewardsPanelProps) {
  const [attempt1Points, setAttempt1Points] = useState(reward?.attempt1Points ?? 10);
  const [attempt2Points, setAttempt2Points] = useState(reward?.attempt2Points ?? 7);
  const [attempt3Points, setAttempt3Points] = useState(reward?.attempt3Points ?? 4);
  const [attempt4PlusPoints, setAttempt4PlusPoints] = useState(reward?.attempt4PlusPoints ?? 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.put(`/courses/${courseId}/quizzes/${quizId}/reward`, {
        attempt1Points,
        attempt2Points,
        attempt3Points,
        attempt4PlusPoints,
      });
      onSave(updated);
    } catch (err) {
      setError('Failed to save rewards. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const rows: { label: string; value: number; onChange: (v: number) => void }[] = [
    { label: '1st Attempt (highest)', value: attempt1Points, onChange: setAttempt1Points },
    { label: '2nd Attempt', value: attempt2Points, onChange: setAttempt2Points },
    { label: '3rd Attempt', value: attempt3Points, onChange: setAttempt3Points },
    { label: '4th Attempt+ (lowest)', value: attempt4PlusPoints, onChange: setAttempt4PlusPoints },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Quiz Rewards</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors rounded-md p-1 hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-5">
          Points decrease with each attempt to reward first-try success.
        </p>

        <div className="space-y-3 mb-6">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-foreground flex-1">{row.label}</span>
              <input
                type="number"
                min={0}
                value={row.value}
                onChange={(e) => row.onChange(Number(e.target.value))}
                className="w-20 border rounded-md px-2 py-1.5 text-sm text-right bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ))}
        </div>

        {error && (
          <p className="text-sm text-destructive mb-4">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Rewards'}
          </Button>
        </div>
      </div>
    </div>
  );
}
