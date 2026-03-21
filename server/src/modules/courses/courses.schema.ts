import { z } from 'zod';

export const createCourseSchema = z.object({
  title: z.string().min(1),
});

export const updateCourseSchema = z.object({
  title: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
  websiteUrl: z.string().optional(),
  courseAdminId: z.number().nullable().optional(),
  visibility: z.enum(['EVERYONE', 'SIGNED_IN']).optional(),
  accessRule: z.enum(['OPEN', 'ON_INVITATION', 'ON_PAYMENT']).optional(),
  price: z.number().nonnegative().optional(),
});

export const publishCourseSchema = z.object({
  isPublished: z.boolean(),
});

export const addAttendeesSchema = z.object({
  emails: z.array(z.string().email()).min(1),
});

export const contactAttendeesSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
});

export const listCoursesQuerySchema = z.object({
  search: z.string().optional(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type PublishCourseInput = z.infer<typeof publishCourseSchema>;
export type AddAttendeesInput = z.infer<typeof addAttendeesSchema>;
export type ContactAttendeesInput = z.infer<typeof contactAttendeesSchema>;
