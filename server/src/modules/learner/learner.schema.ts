import { z } from 'zod';

export const submitReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().max(1000).optional(),
});

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().max(1000).optional(),
});

export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
