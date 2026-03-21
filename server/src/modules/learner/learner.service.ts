import prisma from '../../lib/prisma';
import { AppError } from '../../config/AppError';
import type { SubmitReviewInput, UpdateReviewInput } from './learner.schema';
import { evaluate as evaluateBadges } from '../badges/badge.service';

// ─── List published courses ───────────────────────────────────────────────────

export const listPublishedCourses = async (userId?: number) => {
  const visibilityFilter: any[] = [{ visibility: 'EVERYONE' }];
  if (userId) {
    visibilityFilter.push({ visibility: 'SIGNED_IN' });
  }

  const courses = await prisma.course.findMany({
    where: {
      isPublished: true,
      OR: visibilityFilter,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      instructor: { select: { id: true, name: true } },
      lessons: { select: { id: true, duration: true } },
      _count: { select: { enrollments: true } },
    },
  });

  // If userId provided, get their enrollments to annotate
  let enrollmentMap: Record<number, any> = {};
  if (userId) {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      include: {
        lessonProgresses: { where: { isCompleted: true }, select: { id: true } },
      },
    });
    for (const e of enrollments) {
      enrollmentMap[e.courseId] = e;
    }
  }

  return courses.map(c => {
    const totalLessons = c.lessons.length;
    const enrollment = enrollmentMap[c.id];
    let enrollmentData = undefined;
    if (enrollment) {
      const completedLessons = enrollment.lessonProgresses.length;
      enrollmentData = {
        id: enrollment.id,
        status: enrollment.status,
        progressPct: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
        completedLessons,
        incompleteLessons: totalLessons - completedLessons,
      };
    }
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      coverImage: c.coverImage,
      tags: c.tags,
      accessRule: c.accessRule,
      price: c.price ? c.price.toString() : null,
      visibility: c.visibility,
      totalDuration: c.lessons.reduce((s, l) => s + (l.duration ?? 0), 0),
      _count: { lessons: totalLessons, enrollments: c._count.enrollments },
      instructor: c.instructor,
      enrollment: enrollmentData,
    };
  });
};

// ─── Get course detail ────────────────────────────────────────────────────────

export const getCourseDetail = async (courseId: number, userId?: number) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      instructor: { select: { id: true, name: true } },
      sections: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            select: { id: true, title: true, type: true, order: true, sectionId: true, duration: true, thumbnailUrl: true },
          },
        },
      },
      lessons: {
        orderBy: { order: 'asc' },
        select: {
          id: true, title: true, type: true, order: true, sectionId: true,
          duration: true, thumbnailUrl: true,
        },
      },
      quizzes: {
        select: {
          id: true,
          title: true,
          _count: { select: { questions: true } },
        },
      },
      _count: { select: { enrollments: true } },
    },
  });

  if (!course || !course.isPublished) {
    throw new AppError(404, 'Course not found', 'COURSE_NOT_FOUND');
  }

  // Visibility check
  if (course.visibility === 'SIGNED_IN' && !userId) {
    throw new AppError(401, 'Sign in to view this course', 'AUTH_REQUIRED');
  }

  // Get user's progress if authenticated
  let completedLessonIds: number[] = [];
  let enrollment: any = undefined;
  if (userId) {
    const enr = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: {
        lessonProgresses: { where: { isCompleted: true }, select: { lessonId: true } },
      },
    });
    if (enr) {
      completedLessonIds = enr.lessonProgresses.map(lp => lp.lessonId);
      const totalLessons = course.lessons.length;
      const completedCount = completedLessonIds.length;
      enrollment = {
        id: enr.id,
        status: enr.status,
        progressPct: totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0,
        completedLessons: completedCount,
        incompleteLessons: totalLessons - completedCount,
      };
    }
  }

  const lessons = course.lessons.map(l => ({
    ...l,
    isCompleted: completedLessonIds.includes(l.id),
  }));

  const sections = course.sections.map(s => ({
    id: s.id,
    title: s.title,
    order: s.order,
    isLocked: s.isLocked,
    lessons: s.lessons.map(l => ({
      ...l,
      isCompleted: completedLessonIds.includes(l.id),
    })),
  }));

  // All lessons flat (sections + orphans) for total count
  const allLessons = [...course.sections.flatMap(s => s.lessons), ...course.lessons];

  return {
    id: course.id,
    title: course.title,
    description: course.description,
    coverImage: course.coverImage,
    tags: course.tags,
    accessRule: course.accessRule,
    price: course.price ? course.price.toString() : null,
    visibility: course.visibility,
    instructor: course.instructor,
    sections,
    lessons, // orphan lessons (no section)
    quizzes: course.quizzes,
    _count: { lessons: allLessons.length, enrollments: course._count.enrollments },
    enrollment,
  };
};

// ─── Enroll in course ─────────────────────────────────────────────────────────

export const enrollInCourse = async (userId: number, courseId: number) => {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || !course.isPublished) {
    throw new AppError(404, 'Course not found', 'COURSE_NOT_FOUND');
  }

  if (course.accessRule === 'ON_PAYMENT') {
    throw new AppError(402, 'Payment required', 'PAYMENT_REQUIRED');
  }
  if (course.accessRule === 'ON_INVITATION') {
    throw new AppError(403, 'Enrollment by invitation only', 'INVITATION_ONLY');
  }

  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });

  const enrollment = await prisma.enrollment.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: { userId, courseId },
    update: {},
  });

  if (!existing) {
    evaluateBadges(userId, { courseId }).catch(() => {});
  }

  return enrollment;
};

// ─── Get my courses with progress ─────────────────────────────────────────────

export const getMyCoursesWithProgress = async (userId: number) => {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    include: {
      course: {
        include: {
          lessons: { select: { id: true } },
          instructor: { select: { id: true, name: true } },
        },
      },
      lessonProgresses: { where: { isCompleted: true }, select: { id: true } },
    },
    orderBy: { enrolledAt: 'desc' },
  });

  return enrollments.map(e => {
    const totalLessons = e.course.lessons.length;
    const completedLessons = e.lessonProgresses.length;
    return {
      id: e.course.id,
      title: e.course.title,
      description: e.course.description,
      coverImage: e.course.coverImage,
      tags: e.course.tags,
      accessRule: e.course.accessRule,
      price: e.course.price ? e.course.price.toString() : null,
      instructor: e.course.instructor,
      enrollment: {
        id: e.id,
        status: e.status,
        enrolledAt: e.enrolledAt.toISOString(),
        progressPct: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
        completedLessons,
        incompleteLessons: totalLessons - completedLessons,
        totalLessons,
      },
    };
  });
};

// ─── Mark lesson complete ─────────────────────────────────────────────────────

export const markLessonComplete = async (userId: number, courseId: number, lessonId: number) => {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment) {
    throw new AppError(403, 'You are not enrolled in this course', 'NOT_ENROLLED');
  }

  // Verify lesson belongs to course
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson || lesson.courseId !== courseId) {
    throw new AppError(404, 'Lesson not found', 'LESSON_NOT_FOUND');
  }

  // Upsert lesson progress
  await prisma.lessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
    create: {
      enrollmentId: enrollment.id,
      lessonId,
      userId,
      isCompleted: true,
      completedAt: new Date(),
    },
    update: { isCompleted: true, completedAt: new Date() },
  });

  // Check if all lessons are complete
  const totalLessons = await prisma.lesson.count({ where: { courseId } });
  const completedLessons = await prisma.lessonProgress.count({
    where: { enrollmentId: enrollment.id, isCompleted: true },
  });

  if (completedLessons >= totalLessons && totalLessons > 0) {
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
  } else if (enrollment.status === 'NOT_STARTED') {
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { status: 'IN_PROGRESS', startedAt: new Date() },
    });
  }

  evaluateBadges(userId, { courseId }).catch(() => {});

  return {
    completedLessonIds: (await prisma.lessonProgress.findMany({
      where: { enrollmentId: enrollment.id, isCompleted: true },
      select: { lessonId: true },
    })).map(lp => lp.lessonId),
    progressPct: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
    totalLessons,
    completedLessons,
  };
};

// ─── Get course progress ──────────────────────────────────────────────────────

export const getCourseProgress = async (userId: number, courseId: number) => {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    include: {
      lessonProgresses: { where: { isCompleted: true }, select: { lessonId: true } },
    },
  });

  if (!enrollment) {
    throw new AppError(403, 'You are not enrolled in this course', 'NOT_ENROLLED');
  }

  const totalLessons = await prisma.lesson.count({ where: { courseId } });
  const completedLessonIds = enrollment.lessonProgresses.map(lp => lp.lessonId);

  return {
    completedLessonIds,
    progressPct: totalLessons > 0 ? Math.round((completedLessonIds.length / totalLessons) * 100) : 0,
    status: enrollment.status,
    totalLessons,
    completedLessons: completedLessonIds.length,
  };
};

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const getCourseReviews = async (courseId: number) => {
  const reviews = await prisma.review.findMany({
    where: { courseId },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const aggregate = await prisma.review.aggregate({
    where: { courseId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return {
    reviews: reviews.map(r => ({
      id: r.id,
      rating: r.rating,
      reviewText: r.reviewText,
      createdAt: r.createdAt.toISOString(),
      user: { id: r.user.id, name: r.user.name },
    })),
    averageRating: aggregate._avg.rating ?? 0,
    totalCount: aggregate._count.rating,
  };
};

export const submitReview = async (userId: number, courseId: number, data: SubmitReviewInput) => {
  // Verify enrollment
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment) {
    throw new AppError(403, 'You must be enrolled to review this course', 'NOT_ENROLLED');
  }

  const existingReview = await prisma.review.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });

  const review = await prisma.review.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: { userId, courseId, rating: data.rating, reviewText: data.reviewText },
    update: { rating: data.rating, reviewText: data.reviewText },
  });

  if (!existingReview) {
    evaluateBadges(userId).catch(() => {});
  }

  return review;
};

export const updateReview = async (userId: number, courseId: number, data: UpdateReviewInput) => {
  const existing = await prisma.review.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!existing) {
    throw new AppError(404, 'Review not found', 'REVIEW_NOT_FOUND');
  }

  const review = await prisma.review.update({
    where: { userId_courseId: { userId, courseId } },
    data: { rating: data.rating, reviewText: data.reviewText },
  });

  return review;
};

export const deleteReview = async (userId: number, courseId: number) => {
  const existing = await prisma.review.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!existing) {
    throw new AppError(404, 'Review not found', 'REVIEW_NOT_FOUND');
  }

  await prisma.review.delete({
    where: { userId_courseId: { userId, courseId } },
  });
};

// ─── Profile ──────────────────────────────────────────────────────────────────

export const getProfile = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, totalPoints: true, currentBadge: true },
  });
  if (!user) {
    throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
  }

  // Count enrollments
  const enrollmentCount = await prisma.enrollment.count({ where: { userId } });
  const completedCount = await prisma.enrollment.count({
    where: { userId, status: 'COMPLETED' },
  });

  const earnedBadges = await prisma.userBadge.findMany({
    where: { userId },
    select: { badgeKey: true, earnedAt: true },
    orderBy: { earnedAt: 'asc' },
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    totalPoints: user.totalPoints,
    currentBadge: user.currentBadge,
    enrollmentCount,
    completedCount,
    badges: earnedBadges.map(b => ({ badgeKey: b.badgeKey, earnedAt: b.earnedAt.toISOString() })),
  };
};

// ─── Public Profile ───────────────────────────────────────────────────────────

export const getPublicProfile = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, totalPoints: true, currentBadge: true, createdAt: true },
  });
  if (!user) {
    throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
  }

  const enrollmentCount = await prisma.enrollment.count({ where: { userId } });
  const completedCount = await prisma.enrollment.count({
    where: { userId, status: 'COMPLETED' },
  });

  const earnedBadges = await prisma.userBadge.findMany({
    where: { userId },
    select: { badgeKey: true, earnedAt: true },
    orderBy: { earnedAt: 'asc' },
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    },
    totalPoints: user.totalPoints,
    currentBadge: user.currentBadge,
    enrollmentCount,
    completedCount,
    badges: earnedBadges.map(b => ({ badgeKey: b.badgeKey, earnedAt: b.earnedAt.toISOString() })),
  };
};

// ─── Mock payment ─────────────────────────────────────────────────────────────

export const mockPayment = async (userId: number, courseId: number) => {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || !course.isPublished) {
    throw new AppError(404, 'Course not found', 'COURSE_NOT_FOUND');
  }
  if (course.accessRule !== 'ON_PAYMENT') {
    throw new AppError(400, 'This course does not require payment', 'NOT_PAID_COURSE');
  }

  const enrollment = await prisma.enrollment.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: { userId, courseId },
    update: {},
  });

  return { success: true, enrollmentId: enrollment.id };
};
