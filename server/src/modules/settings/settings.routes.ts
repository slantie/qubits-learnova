import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { getSettings } from './settings.controller';

const router = Router();

// Mounted at /api/admin/settings — admin only
router.get('/', authenticate, authorize('ADMIN'), getSettings);

export default router;
