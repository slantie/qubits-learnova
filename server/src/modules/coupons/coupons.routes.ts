import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import * as ctrl from './coupons.controller';

const router = Router();
const adminOnly = [authenticate, authorize('ADMIN')];

router.get('/', ...adminOnly, ctrl.list);
router.post('/', ...adminOnly, ctrl.create);
router.patch('/:id/toggle', ...adminOnly, ctrl.toggle);

export default router;
