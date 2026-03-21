import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { uploadCover } from '../../lib/multer';
import {
  createCourseSchema,
  updateCourseSchema,
  publishCourseSchema,
  addAttendeesSchema,
  contactAttendeesSchema,
  listCoursesQuerySchema,
} from './courses.schema';
import * as ctrl from './courses.controller';

const router = Router();
const adminOrInstructor = [authenticate, authorize('ADMIN', 'INSTRUCTOR')] as const;

// ─── Learner-facing (public) routes — must come before /:id ───────────────────
router.get('/public', ctrl.listPublic);
router.get('/:id/view', authenticate, ctrl.getView);
router.get('/:id/lessons/:lessonId/view', authenticate, ctrl.getLessonView);

// ─── Dashboard (A1) ───────────────────────────────────────────────────────────
router.get(
  '/',
  ...adminOrInstructor,
  validate(listCoursesQuerySchema, 'query'),
  ctrl.list,
);
router.post('/', ...adminOrInstructor, validate(createCourseSchema), ctrl.create);
router.delete('/:id', ...adminOrInstructor, ctrl.remove);
router.post('/:id/share-link', ...adminOrInstructor, ctrl.shareLink);

// ─── Course form (A2) ─────────────────────────────────────────────────────────
router.get('/:id', ...adminOrInstructor, ctrl.getDetail);
router.patch('/:id', ...adminOrInstructor, validate(updateCourseSchema), ctrl.update);
router.patch('/:id/publish', ...adminOrInstructor, validate(publishCourseSchema), ctrl.publish);
router.post('/:id/cover', ...adminOrInstructor, uploadCover.single('file'), ctrl.uploadCoverImage);
router.post('/:id/attendees', ...adminOrInstructor, validate(addAttendeesSchema), ctrl.addAttendees);
router.post('/:id/contact', ...adminOrInstructor, validate(contactAttendeesSchema), ctrl.contactAttendees);

export default router;
