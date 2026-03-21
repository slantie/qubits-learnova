import { z } from 'zod';

export const createLessonSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['VIDEO', 'DOCUMENT', 'IMAGE', 'QUIZ']).default('VIDEO'),
  order: z.number().int().optional(),
});

const timestampSchema = z.object({
  time: z.number().min(0),
  label: z.string().min(1),
  description: z.string().optional(),
});

export const updateLessonSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(['VIDEO', 'DOCUMENT', 'IMAGE', 'QUIZ']).optional(),
  videoUrl: z.string().optional(),
  videoId: z.string().optional(),
  videoStatus: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  duration: z.number().int().optional(),
  allowDownload: z.boolean().optional(),
  description: z.string().nullable().optional(),
  timestamps: z.array(timestampSchema).nullable().optional(),
  responsibleId: z.number().int().nullable().optional(),
});

export const reorderLessonsSchema = z.object({
  lessonIds: z.array(z.number().int()).min(1),
});

export const addAttachmentLinkSchema = z.object({
  label: z.string().min(1),
  externalUrl: z.string().url(),
});

export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
export type ReorderLessonsInput = z.infer<typeof reorderLessonsSchema>;
export type AddAttachmentLinkInput = z.infer<typeof addAttachmentLinkSchema>;
