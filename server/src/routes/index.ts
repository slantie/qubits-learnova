import { Router } from 'express';
import healthRouter from './health.route';
import authRouter from '../modules/auth/auth.routes';
import coursesRouter from '../modules/courses/courses.routes';
import lessonsRouter from '../modules/lessons/lessons.routes';
import usersRouter from '../modules/users/users.routes';

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/courses', coursesRouter);
router.use('/courses/:courseId/lessons', lessonsRouter);
router.use('/users', usersRouter);

export default router;
