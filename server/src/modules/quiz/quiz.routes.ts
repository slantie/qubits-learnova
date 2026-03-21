import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createQuizSchema,
  updateQuizSchema,
  addQuestionSchema,
  updateQuestionSchema,
  reorderQuestionsSchema,
  upsertRewardSchema,
  submitAttemptSchema,
} from './quiz.schema';
import * as ctrl from './quiz.controller';

const router = Router({ mergeParams: true });
const adminOrInstructor = [authenticate, authorize('ADMIN', 'INSTRUCTOR')] as const;

// ─── Quiz routes ──────────────────────────────────────────────────────────────
// GET endpoints are open to any authenticated user (learners need to list & take quizzes)
router.get('/', authenticate, ctrl.listQuizzes);
router.get('/:quizId', authenticate, ctrl.getQuiz);

router.post('/', ...adminOrInstructor, validate(createQuizSchema), ctrl.createQuiz);
router.patch('/:quizId', ...adminOrInstructor, validate(updateQuizSchema), ctrl.updateQuiz);
router.delete('/:quizId', ...adminOrInstructor, ctrl.deleteQuiz);

// ─── Question routes ──────────────────────────────────────────────────────────
router.post('/:quizId/questions', ...adminOrInstructor, validate(addQuestionSchema), ctrl.addQuestion);
router.patch('/:quizId/questions/reorder', ...adminOrInstructor, validate(reorderQuestionsSchema), ctrl.reorderQuestions);
router.patch('/:quizId/questions/:questionId', ...adminOrInstructor, validate(updateQuestionSchema), ctrl.updateQuestion);
router.delete('/:quizId/questions/:questionId', ...adminOrInstructor, ctrl.deleteQuestion);

// ─── Reward routes ────────────────────────────────────────────────────────────
router.put('/:quizId/reward', ...adminOrInstructor, validate(upsertRewardSchema), ctrl.upsertReward);

// ─── Student attempt routes (any authenticated user) ──────────────────────────
router.post('/:quizId/attempt', authenticate, validate(submitAttemptSchema), ctrl.submitAttempt);
router.get('/:quizId/attempts', authenticate, ctrl.getMyAttempts);

// ─── Instructor analytics ─────────────────────────────────────────────────────
router.get('/:quizId/all-attempts', ...adminOrInstructor, ctrl.getQuizAttempts);
router.get('/:quizId/analytics', ...adminOrInstructor, ctrl.getQuizAnalytics);

export default router;
