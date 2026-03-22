import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { uploadAvatar } from '../../lib/multer';
import * as usersController from './users.controller';

const router = Router();

// Used by course-form to list instructors/admins for selection
router.get('/', authenticate, authorize('ADMIN', 'INSTRUCTOR'), usersController.list);

// Own profile
router.get('/me', authenticate, usersController.getMyProfile);
router.patch('/me/profile', authenticate, usersController.updateMyProfile);
router.post('/me/avatar', authenticate, uploadAvatar.single('avatar'), usersController.uploadMyAvatar);

// Contact a specific user (admin only)
router.post('/:id/contact', authenticate, authorize('ADMIN'), usersController.contactUser);

// Change own password (any authenticated user)
router.post('/me/change-password', authenticate, usersController.changePassword);

export default router;
