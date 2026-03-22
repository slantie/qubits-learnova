import { Router } from 'express';
import healthRouter from './health.route';
import authRouter from '../modules/auth/auth.routes';
import coursesRouter from '../modules/courses/courses.routes';
import lessonsRouter from '../modules/lessons/lessons.routes';
import sectionsRouter from '../modules/sections/sections.routes';
import quizRouter from '../modules/quiz/quiz.routes';
import reportingRouter from '../modules/reporting/reporting.routes';
import usersRouter from '../modules/users/users.routes';
import webhooksRouter from '../modules/webhooks/webhooks.routes';
import learnerRouter from '../modules/learner/learner.routes';
import certificateRouter from '../modules/certificates/certificate.routes';
import badgesRouter from '../modules/badges/badge.routes';
import paymentsRouter from '../modules/payments/payments.routes';
import couponsRouter from '../modules/coupons/coupons.routes';

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/courses', coursesRouter);
router.use('/courses/:courseId/lessons', lessonsRouter);
router.use('/courses/:courseId/sections', sectionsRouter);
router.use('/courses/:courseId/quizzes', quizRouter);
router.use('/reporting', reportingRouter);
router.use('/users', usersRouter);
router.use('/learner', learnerRouter);
router.use('/certificates', certificateRouter);
// Video service integration (token issuing + webhook receiver)
router.use('/videos', webhooksRouter);
router.use('/webhooks', webhooksRouter);
router.use('/badges', badgesRouter);
router.use('/payments', paymentsRouter);
router.use('/admin/coupons', couponsRouter);

export default router;
