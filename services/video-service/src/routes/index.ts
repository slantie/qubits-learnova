import { Router } from 'express';
import healthRouter from './health.route';
import videoRouter from './video.route';
import streamRouter from './stream.route';

const router = Router();

router.use('/health', healthRouter);
router.use('/videos', videoRouter);
router.use('/stream', streamRouter);

export default router;
