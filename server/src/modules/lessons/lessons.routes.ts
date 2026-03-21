import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { uploadLessonFile, uploadAttachment } from '../../lib/multer';
import {
  createLessonSchema,
  updateLessonSchema,
  reorderLessonsSchema,
  addAttachmentLinkSchema,
} from './lessons.schema';
import * as ctrl from './lessons.controller';

// Mounted at /api/courses/:courseId/lessons
const router = Router({ mergeParams: true });
const adminOrInstructor = [authenticate, authorize('ADMIN', 'INSTRUCTOR')] as const;

// ─── Lesson routes ────────────────────────────────────────────────────────────
router.get('/', ...adminOrInstructor, ctrl.list);
router.post('/', ...adminOrInstructor, validate(createLessonSchema), ctrl.create);

// reorder must be before /:lessonId to avoid route conflict
router.patch('/reorder', ...adminOrInstructor, validate(reorderLessonsSchema), ctrl.reorder);

router.get('/:lessonId', ...adminOrInstructor, ctrl.getOne);
router.patch('/:lessonId', ...adminOrInstructor, validate(updateLessonSchema), ctrl.update);
router.delete('/:lessonId', ...adminOrInstructor, ctrl.remove);
router.post('/:lessonId/file', ...adminOrInstructor, uploadLessonFile.single('file'), ctrl.uploadFile);

// ─── Attachment routes ────────────────────────────────────────────────────────
router.get('/:lessonId/attachments', ...adminOrInstructor, ctrl.listAttachments);
router.post(
  '/:lessonId/attachments',
  ...adminOrInstructor,
  // Handle both multipart (file) and JSON (link) — multer is optional here
  (req, res, next) => {
    const contentType = req.headers['content-type'] ?? '';
    if (contentType.includes('multipart/form-data')) {
      uploadAttachment.single('file')(req, res, next);
    } else {
      next();
    }
  },
  (req, res, next) => {
    // Only validate as link schema if no file was uploaded
    if (!req.file) {
      validate(addAttachmentLinkSchema)(req, res, next);
    } else {
      next();
    }
  },
  ctrl.addAttachment,
);
router.delete('/:lessonId/attachments/:attachmentId', ...adminOrInstructor, ctrl.deleteAttachment);

export default router;
