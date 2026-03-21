import { z } from 'zod';

export const createSectionSchema = z.object({
  title: z.string().min(1),
  order: z.number().int().optional(),
});

export const updateSectionSchema = z.object({
  title: z.string().min(1).optional(),
  isLocked: z.boolean().optional(),
  description: z.string().nullable().optional(),
});

export const reorderSectionsSchema = z.object({
  sectionIds: z.array(z.number().int()).min(1),
});

export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;
export type ReorderSectionsInput = z.infer<typeof reorderSectionsSchema>;
