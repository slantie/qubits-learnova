import prisma from '../../lib/prisma';
import { AppError } from '../../config/AppError';
import { evaluate as evaluateBadges } from '../badges/badge.service';
import type {
  CreateQuizInput,
  UpdateQuizInput,
  AddQuestionInput,
  UpdateQuestionInput,
  ReorderQuestionsInput,
  UpsertRewardInput,
  SubmitAttemptInput,
} from './quiz.schema';

// ─── Ownership guard ──────────────────────────────────────────────────────────

async function assertCourseAccess(courseId: number, userId: number, role: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new AppError(404, 'Course not found', 'COURSE_NOT_FOUND');
  if (role === 'INSTRUCTOR' && course.instructorId !== userId) {
    throw new AppError(403, 'Access denied', 'FORBIDDEN');
  }
  return course;
}

// ─── Quiz CRUD ────────────────────────────────────────────────────────────────

export const listQuizzes = async (courseId: number, userId: number, role: string) => {
  await assertCourseAccess(courseId, userId, role);

  const quizzes = await prisma.quiz.findMany({
    where: { courseId },
    orderBy: { createdAt: 'asc' },
    include: {
      _count: { select: { questions: true } },
      rewards: true,
    },
  });

  return quizzes.map(quiz => {
    const { _count, rewards, ...rest } = quiz;
    return {
      ...rest,
      questionCount: _count.questions,
      rewards: rewards ?? null,
    };
  });
};

export const createQuiz = async (
  courseId: number,
  data: CreateQuizInput,
  userId: number,
  role: string,
) => {
  await assertCourseAccess(courseId, userId, role);

  const quiz = await prisma.quiz.create({
    data: {
      courseId,
      title: data.title,
      rewards: {
        create: {
          attempt1Points: 10,
          attempt2Points: 7,
          attempt3Points: 4,
          attempt4PlusPoints: 1,
        },
      },
    },
    include: {
      rewards: true,
      questions: true,
    },
  });

  return quiz;
};

export const getQuiz = async (
  courseId: number,
  quizId: number,
  userId: number,
  role: string,
) => {
  await assertCourseAccess(courseId, userId, role);

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { orderBy: { order: 'asc' } },
      rewards: true,
    },
  });

  if (!quiz || quiz.courseId !== courseId) {
    throw new AppError(404, 'Quiz not found', 'QUIZ_NOT_FOUND');
  }

  return quiz;
};

export const updateQuiz = async (
  courseId: number,
  quizId: number,
  data: UpdateQuizInput,
  userId: number,
  role: string,
) => {
  await assertCourseAccess(courseId, userId, role);

  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz || quiz.courseId !== courseId) {
    throw new AppError(404, 'Quiz not found', 'QUIZ_NOT_FOUND');
  }

  return prisma.quiz.update({ where: { id: quizId }, data });
};

export const deleteQuiz = async (
  courseId: number,
  quizId: number,
  userId: number,
  role: string,
) => {
  await assertCourseAccess(courseId, userId, role);

  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz || quiz.courseId !== courseId) {
    throw new AppError(404, 'Quiz not found', 'QUIZ_NOT_FOUND');
  }

  await prisma.quiz.delete({ where: { id: quizId } });
};

// ─── Question CRUD ────────────────────────────────────────────────────────────

export const addQuestion = async (
  courseId: number,
  quizId: number,
  data: AddQuestionInput,
  userId: number,
  role: string,
) => {
  await assertCourseAccess(courseId, userId, role);

  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz || quiz.courseId !== courseId) {
    throw new AppError(404, 'Quiz not found', 'QUIZ_NOT_FOUND');
  }

  const maxIndex = data.options.length - 1;
  const invalidIndex = data.correctOptions.some(i => i > maxIndex);
  if (invalidIndex) {
    throw new AppError(400, 'correctOptions indices are out of bounds for the provided options', 'INVALID_CORRECT_OPTIONS');
  }

  const aggregate = await prisma.question.aggregate({
    where: { quizId },
    _max: { order: true },
  });
  const nextOrder = (aggregate._max.order ?? 0) + 1;

  return prisma.question.create({
    data: {
      quizId,
      text: data.text,
      options: data.options,
      correctOptions: data.correctOptions,
      order: nextOrder,
    },
  });
};

export const updateQuestion = async (
  courseId: number,
  quizId: number,
  questionId: number,
  data: UpdateQuestionInput,
  userId: number,
  role: string,
) => {
  await assertCourseAccess(courseId, userId, role);

  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz || quiz.courseId !== courseId) {
    throw new AppError(404, 'Quiz not found', 'QUIZ_NOT_FOUND');
  }

  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question || question.quizId !== quizId) {
    throw new AppError(404, 'Question not found', 'QUESTION_NOT_FOUND');
  }

  if (data.correctOptions !== undefined && data.options !== undefined) {
    const maxIndex = data.options.length - 1;
    const invalidIndex = data.correctOptions.some(i => i > maxIndex);
    if (invalidIndex) {
      throw new AppError(400, 'correctOptions indices are out of bounds for the provided options', 'INVALID_CORRECT_OPTIONS');
    }
  }

  return prisma.question.update({ where: { id: questionId }, data });
};

export const deleteQuestion = async (
  courseId: number,
  quizId: number,
  questionId: number,
  userId: number,
  role: string,
) => {
  await assertCourseAccess(courseId, userId, role);

  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz || quiz.courseId !== courseId) {
    throw new AppError(404, 'Quiz not found', 'QUIZ_NOT_FOUND');
  }

  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question || question.quizId !== quizId) {
    throw new AppError(404, 'Question not found', 'QUESTION_NOT_FOUND');
  }

  await prisma.question.delete({ where: { id: questionId } });

  const remaining = await prisma.question.findMany({
    where: { quizId },
    orderBy: { order: 'asc' },
  });

  await prisma.$transaction(
    remaining.map((q, idx) =>
      prisma.question.update({ where: { id: q.id }, data: { order: idx + 1 } }),
    ),
  );
};

export const reorderQuestions = async (
  courseId: number,
  quizId: number,
  data: ReorderQuestionsInput,
  userId: number,
  role: string,
) => {
  await assertCourseAccess(courseId, userId, role);

  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz || quiz.courseId !== courseId) {
    throw new AppError(404, 'Quiz not found', 'QUIZ_NOT_FOUND');
  }

  await prisma.$transaction(
    data.questionIds.map((id, idx) =>
      prisma.question.update({ where: { id }, data: { order: idx + 1 } }),
    ),
  );
};

// ─── Reward upsert ────────────────────────────────────────────────────────────

export const upsertReward = async (
  courseId: number,
  quizId: number,
  data: UpsertRewardInput,
  userId: number,
  role: string,
) => {
  await assertCourseAccess(courseId, userId, role);

  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz || quiz.courseId !== courseId) {
    throw new AppError(404, 'Quiz not found', 'QUIZ_NOT_FOUND');
  }

  return prisma.quizReward.upsert({
    where: { quizId },
    update: data,
    create: { quizId, ...data },
  });
};

// ─── Student attempt ──────────────────────────────────────────────────────────

export const submitAttempt = async (
  courseId: number,
  quizId: number,
  data: SubmitAttemptInput,
  userId: number,
) => {
  // Fetch quiz with questions and reward
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { orderBy: { order: 'asc' } },
      rewards: true,
    },
  });

  if (!quiz || quiz.courseId !== courseId) {
    throw new AppError(404, 'Quiz not found', 'QUIZ_NOT_FOUND');
  }

  if (quiz.questions.length === 0) {
    throw new AppError(400, 'Quiz has no questions', 'QUIZ_EMPTY');
  }

  if (data.answers.length !== quiz.questions.length) {
    throw new AppError(
      400,
      `Expected ${quiz.questions.length} answer(s), got ${data.answers.length}`,
      'ANSWER_COUNT_MISMATCH',
    );
  }

  // Validate all questionIds belong to this quiz and are unique
  const quizQuestionIds = new Set(quiz.questions.map(q => q.id));
  const submittedIds = data.answers.map(a => a.questionId);
  const uniqueSubmitted = new Set(submittedIds);

  if (uniqueSubmitted.size !== submittedIds.length) {
    throw new AppError(400, 'Duplicate questionId in answers', 'DUPLICATE_QUESTION');
  }

  for (const id of submittedIds) {
    if (!quizQuestionIds.has(id)) {
      throw new AppError(400, `Question ${id} does not belong to this quiz`, 'INVALID_QUESTION');
    }
  }

  // Score: a question is correct when selected option indices exactly match correctOptions
  const questionMap = new Map(quiz.questions.map(q => [q.id, q]));
  let correctCount = 0;

  for (const answer of data.answers) {
    const question = questionMap.get(answer.questionId)!;
    const sortedSelected = [...answer.selectedOptions].sort((a, b) => a - b);
    const sortedCorrect  = [...question.correctOptions].sort((a, b) => a - b);
    const isCorrect =
      sortedSelected.length === sortedCorrect.length &&
      sortedSelected.every((v, i) => v === sortedCorrect[i]);
    if (isCorrect) correctCount++;
  }

  const totalQuestions = quiz.questions.length;
  const scorePercentage = Math.round((correctCount / totalQuestions) * 100);

  // Determine attempt number
  const existingCount = await prisma.quizAttempt.count({ where: { userId, quizId } });
  const attemptNumber = existingCount + 1;

  // Determine points earned from reward tier
  const reward = quiz.rewards;
  let pointsEarned = 0;
  if (reward) {
    if (attemptNumber === 1) pointsEarned = reward.attempt1Points;
    else if (attemptNumber === 2) pointsEarned = reward.attempt2Points;
    else if (attemptNumber === 3) pointsEarned = reward.attempt3Points;
    else pointsEarned = reward.attempt4PlusPoints;
  }

  // Persist attempt — store answers as JSON
  const attempt = await prisma.quizAttempt.create({
    data: {
      userId,
      quizId,
      attemptNumber,
      pointsEarned,
      scorePercent: scorePercentage,
      answers: data.answers as object,
    },
  });

  // Award points to user
  if (pointsEarned > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { totalPoints: { increment: pointsEarned } },
    });
  }

  // Evaluate badges (fire-and-forget)
  evaluateBadges(userId, { quizId }).catch(() => {});

  return {
    id: attempt.id,
    attemptNumber,
    pointsEarned,
    scorePercentage,
    correctCount,
    totalQuestions,
    completedAt: attempt.completedAt,
  };
};

export const getMyAttempts = async (
  courseId: number,
  quizId: number,
  userId: number,
) => {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz || quiz.courseId !== courseId) {
    throw new AppError(404, 'Quiz not found', 'QUIZ_NOT_FOUND');
  }

  return prisma.quizAttempt.findMany({
    where: { userId, quizId },
    orderBy: { completedAt: 'desc' },
    select: {
      id: true,
      attemptNumber: true,
      pointsEarned: true,
      completedAt: true,
    },
  });
};

// ─── Instructor attempt analytics ────────────────────────────────────────────

function scoreAttempt(
  answersJson: unknown,
  questionMap: Map<number, number[]>,
): { correctCount: number; totalQuestions: number; scorePercentage: number } {
  const totalQuestions = questionMap.size;
  if (totalQuestions === 0) return { correctCount: 0, totalQuestions: 0, scorePercentage: 0 };

  let parsed: unknown = answersJson;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { parsed = []; }
  }
  if (!Array.isArray(parsed)) return { correctCount: 0, totalQuestions, scorePercentage: 0 };

  const answers = parsed as Array<{ questionId: number; selectedOptions: number[] }>;
  let correctCount = 0;

  for (const answer of answers) {
    const correctOptions = questionMap.get(answer.questionId);
    if (!correctOptions) continue;
    const sorted = [...answer.selectedOptions].sort((a, b) => a - b);
    const correct = [...correctOptions].sort((a, b) => a - b);
    if (
      sorted.length === correct.length &&
      sorted.every((v, i) => v === correct[i])
    ) {
      correctCount++;
    }
  }

  return {
    correctCount,
    totalQuestions,
    scorePercentage: Math.round((correctCount / totalQuestions) * 100),
  };
}

export const getQuizAttempts = async (
  courseId: number,
  quizId: number,
  userId: number,
  role: string,
) => {
  await assertCourseAccess(courseId, userId, role);

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: true },
  });
  if (!quiz || quiz.courseId !== courseId) {
    throw new AppError(404, 'Quiz not found', 'QUIZ_NOT_FOUND');
  }

  const questionMap = new Map(quiz.questions.map(q => [q.id, q.correctOptions]));

  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId },
    orderBy: { completedAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return attempts.map(a => ({
    id: a.id,
    attemptNumber: a.attemptNumber,
    pointsEarned: a.pointsEarned,
    completedAt: a.completedAt,
    user: a.user,
    ...scoreAttempt(a.answers, questionMap),
  }));
};

export const getQuizAnalytics = async (
  courseId: number,
  quizId: number,
  userId: number,
  role: string,
) => {
  await assertCourseAccess(courseId, userId, role);

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: true, rewards: true },
  });
  if (!quiz || quiz.courseId !== courseId) {
    throw new AppError(404, 'Quiz not found', 'QUIZ_NOT_FOUND');
  }

  const questionMap = new Map(quiz.questions.map(q => [q.id, q.correctOptions]));

  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId },
    select: { userId: true, attemptNumber: true, pointsEarned: true, answers: true },
  });

  const totalAttempts = attempts.length;
  const uniqueLearners = new Set(attempts.map(a => a.userId)).size;
  const totalPointsAwarded = attempts.reduce((s, a) => s + a.pointsEarned, 0);

  const scores = attempts.map(a => scoreAttempt(a.answers, questionMap).scorePercentage);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;
  const perfectScores = scores.filter(s => s === 100).length;

  // Per-question correctness rate
  const questionCorrectCounts = new Map<number, number>();
  const questionAttemptCounts = new Map<number, number>();
  for (const attempt of attempts) {
    const answers = attempt.answers as Array<{ questionId: number; selectedOptions: number[] }>;
    for (const answer of answers) {
      const correctOptions = questionMap.get(answer.questionId);
      if (!correctOptions) continue;
      questionAttemptCounts.set(answer.questionId, (questionAttemptCounts.get(answer.questionId) ?? 0) + 1);
      const sorted = [...answer.selectedOptions].sort((a, b) => a - b);
      const correct = [...correctOptions].sort((a, b) => a - b);
      const isCorrect = sorted.length === correct.length && sorted.every((v, i) => v === correct[i]);
      if (isCorrect) questionCorrectCounts.set(answer.questionId, (questionCorrectCounts.get(answer.questionId) ?? 0) + 1);
    }
  }

  const questionStats = quiz.questions.map(q => ({
    id: q.id,
    text: q.text,
    order: q.order,
    totalAnswered: questionAttemptCounts.get(q.id) ?? 0,
    totalCorrect: questionCorrectCounts.get(q.id) ?? 0,
    correctRate: questionAttemptCounts.get(q.id)
      ? Math.round(((questionCorrectCounts.get(q.id) ?? 0) / questionAttemptCounts.get(q.id)!) * 100)
      : 0,
  }));

  return {
    totalAttempts,
    uniqueLearners,
    avgScore,
    perfectScores,
    totalPointsAwarded,
    rewards: quiz.rewards ?? null,
    questionStats,
  };
};
