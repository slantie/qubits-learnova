import prisma from '../../lib/prisma';
import { AppError } from '../../config/AppError';
import type {
  CreateQuizInput,
  UpdateQuizInput,
  AddQuestionInput,
  UpdateQuestionInput,
  ReorderQuestionsInput,
  UpsertRewardInput,
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
      hasRewards: !!rewards,
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
