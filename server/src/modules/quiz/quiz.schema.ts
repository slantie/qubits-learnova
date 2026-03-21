import { z } from 'zod';

export const createQuizSchema = z.object({
  title: z.string().min(1).max(255),
});

export const updateQuizSchema = z.object({
  title: z.string().min(1).max(255).optional(),
});

export const addQuestionSchema = z.object({
  text: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  correctOptions: z.array(z.number().int().min(0)),
});

export const updateQuestionSchema = z.object({
  text: z.string().min(1).optional(),
  options: z.array(z.string().min(1)).min(2).optional(),
  correctOptions: z.array(z.number().int().min(0)).optional(),
});

export const reorderQuestionsSchema = z.object({
  questionIds: z.array(z.number().int()),
});

export const upsertRewardSchema = z.object({
  attempt1Points: z.number().int().min(0),
  attempt2Points: z.number().int().min(0),
  attempt3Points: z.number().int().min(0),
  attempt4PlusPoints: z.number().int().min(0),
});

export type CreateQuizInput = z.infer<typeof createQuizSchema>;
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;
export type AddQuestionInput = z.infer<typeof addQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type ReorderQuestionsInput = z.infer<typeof reorderQuestionsSchema>;
export type UpsertRewardInput = z.infer<typeof upsertRewardSchema>;
