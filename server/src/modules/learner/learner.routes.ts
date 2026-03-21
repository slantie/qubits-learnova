import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { optionalAuth } from '../../middleware/optionalAuth';
import { validate } from '../../middleware/validate';
import { submitReviewSchema, updateReviewSchema } from './learner.schema';
import * as ctrl from './learner.controller';

const router = Router();

// ─── Course Discovery (public / optional auth) ───────────────────────────────
router.get('/', optionalAuth, ctrl.listCourses);
router.get('/courses/:courseId', optionalAuth, ctrl.getCourseDetail);

// ─── My Courses (auth required) ──────────────────────────────────────────────
router.get('/my-courses', authenticate, ctrl.myCourses);

// ─── Enrollment (auth required) ──────────────────────────────────────────────
router.post('/courses/:courseId/enroll', authenticate, ctrl.enroll);

// ─── Lesson Progress (auth required) ─────────────────────────────────────────
router.get('/courses/:courseId/progress', authenticate, ctrl.getCourseProgress);
router.post('/courses/:courseId/lessons/:lessonId/complete', authenticate, ctrl.markLessonComplete);

// ─── Reviews ─────────────────────────────────────────────────────────────────
router.get('/courses/:courseId/reviews', ctrl.getReviews);
router.post('/courses/:courseId/reviews', authenticate, validate(submitReviewSchema), ctrl.submitReview);
router.patch('/courses/:courseId/reviews', authenticate, validate(updateReviewSchema), ctrl.updateReview);
router.delete('/courses/:courseId/reviews', authenticate, ctrl.deleteReview);

// ─── Public Profile (no auth) ────────────────────────────────────────────────
router.get('/users/:userId/profile', ctrl.getPublicProfile);

// ─── Profile (auth required) ─────────────────────────────────────────────────
router.get('/profile', authenticate, ctrl.getProfile);

// ─── Mock Payment (auth required) ────────────────────────────────────────────
router.post('/courses/:courseId/payment/mock', authenticate, ctrl.mockPayment);

export default router;
