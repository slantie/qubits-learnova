import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import * as usersController from './users.controller';

const router = Router();

// Used by course-form to list instructors/admins for selection
router.get('/', authenticate, authorize('ADMIN', 'INSTRUCTOR'), usersController.list);

export default router;
