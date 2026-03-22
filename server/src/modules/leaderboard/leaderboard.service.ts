import prisma from '../../lib/prisma';

export async function getLeaderboard() {
  const users = await prisma.user.findMany({
    where: { totalPoints: { gt: 0 } },
    orderBy: { totalPoints: 'desc' },
    take: 100,
    select: {
      id: true,
      name: true,
      email: true,
      totalPoints: true,
      enrollments: {
        where: { completedAt: { not: null } },
        select: { id: true },
      },
    },
  });

  return users.map((u, i) => ({
    rank: i + 1,
    userId: u.id,
    name: u.name,
    email: u.email,
    totalPoints: u.totalPoints,
    completedCourses: u.enrollments.length,
  }));
}

export async function getQuizzesWithAttempts() {
  const quizzes = await prisma.quiz.findMany({
    where: { attempts: { some: {} } },
    select: {
      id: true,
      title: true,
      _count: { select: { attempts: true } },
    },
    orderBy: { id: 'asc' },
  });

  return quizzes.map(q => ({
    id: q.id,
    title: q.title,
    attemptCount: q._count.attempts,
  }));
}

export async function getQuizLeaderboard(quizId: number) {
  // Get best attempt per user (highest scorePercent, then lowest attemptNumber)
  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId },
    orderBy: [{ scorePercent: 'desc' }, { attemptNumber: 'asc' }],
    select: {
      userId: true,
      scorePercent: true,
      pointsEarned: true,
      attemptNumber: true,
      completedAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  // Keep only best attempt per user
  const seen = new Set<number>();
  const best = attempts.filter(a => {
    if (seen.has(a.userId)) return false;
    seen.add(a.userId);
    return true;
  });

  return best.map((a, i) => ({
    rank: i + 1,
    userId: a.userId,
    name: a.user.name,
    email: a.user.email,
    scorePercent: a.scorePercent,
    pointsEarned: a.pointsEarned,
    attemptNumber: a.attemptNumber,
    completedAt: a.completedAt,
  }));
}
