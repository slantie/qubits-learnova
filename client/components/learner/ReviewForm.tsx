'use client';

import { useState } from 'react';
import { StarRating } from '@/components/learner/StarRating';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CircleNotch } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface ReviewFormProps {
  initialRating?: number;
  initialText?: string;
  isEditing?: boolean;
  onSubmit: (data: { rating: number; reviewText?: string }) => Promise<void>;
  onCancel: () => void;
}

export function ReviewForm({
  initialRating = 0,
  initialText = '',
  isEditing = false,
  onSubmit,
  onCancel,
}: ReviewFormProps) {
  const [rating, setRating] = useState(initialRating);
  const [reviewText, setReviewText] = useState(initialText);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    setLoading(true);
    try {
      await onSubmit({ rating, reviewText: reviewText.trim() || undefined });
      toast.success(isEditing ? 'Review updated!' : 'Review submitted!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-card">
      <div>
        <p className="text-sm font-medium mb-2">Your Rating</p>
        <StarRating
          value={rating}
          interactive
          onChange={setRating}
          size="lg"
        />
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Your Review (optional)</p>
        <Textarea
          placeholder="Share your experience with this course..."
          value={reviewText}
          onChange={e => setReviewText(e.target.value)}
          maxLength={1000}
          rows={3}
          className="resize-none"
        />
        <p className="text-[11px] text-muted-foreground mt-1 text-right">
          {reviewText.length}/1000
        </p>
      </div>
      <div className="flex items-center gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={loading || rating === 0}>
          {loading && <CircleNotch className="size-3.5 animate-spin mr-1.5" />}
          {isEditing ? 'Update Review' : 'Submit Review'}
        </Button>
      </div>
    </div>
  );
}
