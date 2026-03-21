'use client';

import { useEffect, useState, useCallback } from 'react';
import { ReviewData, ReviewsResponse } from '@/types';
import { fetchCourseReviews, submitReview, updateReview, deleteReview } from '@/lib/api/learner';
import { useAuth } from '@/hooks/useAuth';
import { StarRating } from '@/components/learner/StarRating';
import { ReviewForm } from '@/components/learner/ReviewForm';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquarePlus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ReviewsTabProps {
  courseId: number;
  isEnrolled: boolean;
}

export function ReviewsTab({ courseId, isEnrolled }: ReviewsTabProps) {
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  const loadReviews = useCallback(async () => {
    try {
      const result = await fetchCourseReviews(courseId);
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const userReview = data?.reviews.find(r => r.user.id === user?.id);
  const isEditing = !!userReview;

  const handleSubmit = async (formData: { rating: number; reviewText?: string }) => {
    if (isEditing) {
      await updateReview(courseId, formData);
    } else {
      await submitReview(courseId, formData);
    }
    setShowForm(false);
    setLoading(true);
    await loadReviews();
  };

  const handleDelete = async () => {
    if (!confirm('Delete your review?')) return;
    try {
      await deleteReview(courseId);
      toast.success('Review deleted');
      setLoading(true);
      await loadReviews();
    } catch {
      toast.error('Failed to delete review');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">
        Unable to load reviews
      </div>
    );
  }

  const visibleReviews = data.reviews.slice(0, visibleCount);

  return (
    <div className="space-y-6 py-4">
      {/* Average rating */}
      <div className="flex items-center gap-4 p-5 rounded-xl bg-muted/40 border">
        <div className="text-center">
          <p className="text-4xl font-bold">
            {data.averageRating > 0 ? data.averageRating.toFixed(1) : '—'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">out of 5</p>
        </div>
        <div>
          <StarRating value={Math.round(data.averageRating)} size="md" />
          <p className="text-sm text-muted-foreground mt-1">
            {data.totalCount} {data.totalCount === 1 ? 'review' : 'reviews'}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      {isAuthenticated && isEnrolled && !showForm && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isEditing ? 'outline' : 'default'}
            onClick={() => setShowForm(true)}
          >
            {isEditing ? (
              <>
                <Pencil className="size-3.5 mr-1.5" /> Edit Review
              </>
            ) : (
              <>
                <MessageSquarePlus className="size-3.5 mr-1.5" /> Write a Review
              </>
            )}
          </Button>
          {isEditing && (
            <Button size="sm" variant="ghost" onClick={handleDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="size-3.5 mr-1.5" /> Delete
            </Button>
          )}
        </div>
      )}

      {/* Not enrolled hint */}
      {isAuthenticated && !isEnrolled && (
        <p className="text-xs text-muted-foreground italic">
          Enroll in this course to leave a review
        </p>
      )}

      {/* Review form */}
      {showForm && (
        <ReviewForm
          initialRating={userReview?.rating}
          initialText={userReview?.reviewText ?? ''}
          isEditing={isEditing}
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Reviews list */}
      {data.reviews.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          No reviews yet. Be the first!
        </div>
      ) : (
        <div className="space-y-3">
          {visibleReviews.map(review => (
            <ReviewCard key={review.id} review={review} isOwn={review.user.id === user?.id} />
          ))}

          {data.reviews.length > visibleCount && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setVisibleCount(prev => prev + 10)}
            >
              Load more reviews
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ review, isOwn }: { review: ReviewData; isOwn: boolean }) {
  const initials = review.user.name
    ? review.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const formattedDate = new Date(review.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className={`flex gap-3 p-4 rounded-lg border ${isOwn ? 'bg-primary/5 border-primary/15' : 'bg-card'}`}>
      <div className="size-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate">
            {review.user.name}
            {isOwn && <span className="text-xs text-primary ml-1.5">(You)</span>}
          </span>
          <span className="text-[11px] text-muted-foreground shrink-0">{formattedDate}</span>
        </div>
        <StarRating value={review.rating} size="sm" className="mt-1" />
        {review.reviewText && (
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {review.reviewText}
          </p>
        )}
      </div>
    </div>
  );
}
