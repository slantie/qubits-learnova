import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import * as ctrl from './reporting.controller';

const router = Router();
const adminOrInstructor = [authenticate, authorize('ADMIN', 'INSTRUCTOR')] as const;

// Mounted at /api/reporting

router.get('/summary', ...adminOrInstructor, ctrl.getSummary);
router.get('/table', ...adminOrInstructor, ctrl.getTable);
router.get('/courses', ...adminOrInstructor, ctrl.getCourseCards);

export default router;
