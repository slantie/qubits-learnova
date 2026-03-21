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
router.post('/:id/cover', ...adminOrInstructor, uploadCover.single('cover'), ctrl.uploadCoverImage);
router.post('/:id/attendees', ...adminOrInstructor, validate(addAttendeesSchema), ctrl.addAttendees);
router.post('/:id/contact', ...adminOrInstructor, validate(contactAttendeesSchema), ctrl.contactAttendees);

export default router;
