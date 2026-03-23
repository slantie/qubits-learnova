import { Router, Request, Response } from 'express';
import { getLeaderboard, getQuizzesWithAttempts, getQuizLeaderboard } from './leaderboard.service';

const router = Router();

// GET /leaderboard — overall by totalPoints
router.get('/', async (_req: Request, res: Response) => {
  const leaderboard = await getLeaderboard();
  res.json({ leaderboard });
});

// GET /leaderboard/quizzes — list quizzes that have attempts (for tab selector)
router.get('/quizzes', async (_req: Request, res: Response) => {
  const quizzes = await getQuizzesWithAttempts();
  res.json({ quizzes });
});

// GET /leaderboard/quiz/:quizId — quiz-specific leaderboard
router.get('/quiz/:quizId', async (req: Request<{ quizId: string }>, res: Response) => {
  const quizId = parseInt(req.params.quizId, 10);
  if (isNaN(quizId)) {
    res.status(400).json({ message: 'Invalid quiz id' });
    return;
  }
  const leaderboard = await getQuizLeaderboard(quizId);
  res.json({ leaderboard });
});

export default router;
