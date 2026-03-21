import { Router } from 'express';
import healthRouter from './health.route';

const router = Router();

router.use('/health', healthRouter);

// Add more routes here
// router.use('/users', usersRouter);

export default router;
