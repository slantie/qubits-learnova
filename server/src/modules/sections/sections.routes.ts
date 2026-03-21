import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createSectionSchema, updateSectionSchema, reorderSectionsSchema } from './sections.schema';
import * as ctrl from './sections.controller';

// Mounted at /api/courses/:courseId/sections
const router = Router({ mergeParams: true });
const adminOrInstructor = [authenticate, authorize('ADMIN', 'INSTRUCTOR')] as const;

router.get('/', ...adminOrInstructor, ctrl.list);
router.post('/', ...adminOrInstructor, validate(createSectionSchema), ctrl.create);
router.patch('/reorder', ...adminOrInstructor, validate(reorderSectionsSchema), ctrl.reorder);
router.post('/move-lesson', ...adminOrInstructor, ctrl.moveLesson);
router.patch('/:sectionId', ...adminOrInstructor, validate(updateSectionSchema), ctrl.update);
router.delete('/:sectionId', ...adminOrInstructor, ctrl.remove);

export default router;
