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
} from './quiz.schema';
import * as ctrl from './quiz.controller';

const router = Router({ mergeParams: true });
const adminOrInstructor = [authenticate, authorize('ADMIN', 'INSTRUCTOR')] as const;

// ─── Quiz routes ──────────────────────────────────────────────────────────────
router.get('/', ...adminOrInstructor, ctrl.listQuizzes);
router.post('/', ...adminOrInstructor, validate(createQuizSchema), ctrl.createQuiz);
router.get('/:quizId', ...adminOrInstructor, ctrl.getQuiz);
router.patch('/:quizId', ...adminOrInstructor, validate(updateQuizSchema), ctrl.updateQuiz);
router.delete('/:quizId', ...adminOrInstructor, ctrl.deleteQuiz);

// ─── Question routes ──────────────────────────────────────────────────────────
router.post('/:quizId/questions', ...adminOrInstructor, validate(addQuestionSchema), ctrl.addQuestion);
router.patch('/:quizId/questions/reorder', ...adminOrInstructor, validate(reorderQuestionsSchema), ctrl.reorderQuestions);
router.patch('/:quizId/questions/:questionId', ...adminOrInstructor, validate(updateQuestionSchema), ctrl.updateQuestion);
router.delete('/:quizId/questions/:questionId', ...adminOrInstructor, ctrl.deleteQuestion);

// ─── Reward routes ────────────────────────────────────────────────────────────
router.put('/:quizId/reward', ...adminOrInstructor, validate(upsertRewardSchema), ctrl.upsertReward);

export default router;
