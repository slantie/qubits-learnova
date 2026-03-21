import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/authenticate';
import prisma from '../../lib/prisma';
import { BADGE_DEFINITIONS } from '../../config/badges';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id as number;

  // Load earned badges
  const earnedBadges = await prisma.userBadge.findMany({
    where: { userId },
    select: { badgeKey: true, earnedAt: true },
  });
  const earnedMap = new Map(earnedBadges.map(b => [b.badgeKey, b.earnedAt]));

  // Load progress data for countable badges
  const [completedCount, certCount, reviewCount] = await Promise.all([
    prisma.enrollment.count({ where: { userId, status: 'COMPLETED' } }),
    prisma.certificate.count({ where: { userId } }),
    prisma.review.count({ where: { userId } }),
  ]);

  // Count distinct perfect quiz attempts
  const perfectQuizzes = await prisma.quizAttempt.findMany({
    where: { userId, scorePercent: 100 },
    distinct: ['quizId'],
    select: { quizId: true },
  });
  const perfectQuizCount = perfectQuizzes.length;

  // Count distinct lesson completion days (UTC)
  const progresses = await prisma.lessonProgress.findMany({
    where: { userId, isCompleted: true, completedAt: { not: null } },
    select: { completedAt: true },
  });
  const distinctDays = new Set(progresses.map(p => p.completedAt!.toISOString().slice(0, 10))).size;

  const badges = BADGE_DEFINITIONS.map(def => {
    const earnedAt = earnedMap.get(def.key) ?? null;
    const base = {
      key: def.key,
      name: def.name,
      category: def.category,
      description: def.description,
      trigger: def.trigger,
      earned: earnedMap.has(def.key),
      earnedAt: earnedAt ? earnedAt.toISOString() : null,
    };

    // Attach progress for countable badges
    if (def.key === 'achievement:first-step') return { ...base, progress: { current: completedCount, required: 1 } };
    if (def.key === 'achievement:on-fire') return { ...base, progress: { current: completedCount, required: 5 } };
    if (def.key === 'achievement:scholar') return { ...base, progress: { current: completedCount, required: 10 } };
    if (def.key === 'achievement:collector') return { ...base, progress: { current: completedCount, required: 25 } };
    if (def.key === 'achievement:quiz-master') return { ...base, progress: { current: Math.min(perfectQuizCount, 1), required: 1 } };
    if (def.key === 'achievement:perfect-run') return { ...base, progress: { current: perfectQuizCount, required: 3 } };
    if (def.key === 'achievement:certified') return { ...base, progress: { current: certCount, required: 1 } };
    if (def.key === 'achievement:multi-cert') return { ...base, progress: { current: certCount, required: 3 } };
    if (def.key === 'achievement:dedicated') return { ...base, progress: { current: distinctDays, required: 7 } };
    if (def.key === 'achievement:reviewer') return { ...base, progress: { current: reviewCount, required: 5 } };

    return base;
  });

  res.json({ badges });
});

export default router;
