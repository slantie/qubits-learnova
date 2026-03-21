import prisma from '../../lib/prisma';
import { sendMail } from '../../lib/mailer';
import { hashPassword } from '../../lib/hash';
import { AppError } from '../../config/AppError';
import { v4 as uuidv4 } from 'uuid';
import type {
  CreateCourseInput,
  UpdateCourseInput,
  PublishCourseInput,
  AddAttendeesInput,
  ContactAttendeesInput,
} from './courses.schema';

// ─── Ownership guard ─────────────────────────────────────────────────────────

async function assertAccess(courseId: number, userId: number, role: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new AppError(404, 'Course not found', 'COURSE_NOT_FOUND');
  if (role === 'INSTRUCTOR' && course.instructorId !== userId) {
    throw new AppError(403, 'Access denied', 'FORBIDDEN');
  }
  return course;
}

// ─── List courses ─────────────────────────────────────────────────────────────

export const listCourses = async (userId: number, role: string, search?: string) => {
  const where: Record<string, unknown> = {};
  if (role === 'INSTRUCTOR') where.instructorId = userId;
  if (search) {
    where.title = { contains: search, mode: 'insensitive' };
  }

  const courses = await prisma.course.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      lessons: { select: { id: true, duration: true } },
    },
  });

  return courses.map(c => ({
    id: c.id,
    title: c.title,
    tags: c.tags,
    isPublished: c.isPublished,
    lessonCount: c.lessons.length,
    totalDuration: c.lessons.reduce((sum, l) => sum + (l.duration ?? 0), 0),
    coverImage: c.coverImage,
    createdAt: c.createdAt.toISOString(),
  }));
};

// ─── Create course ─────────────────────────────────────────────────────────────

export const createCourse = async (data: CreateCourseInput, instructorId: number) => {
  const course = await prisma.course.create({
    data: { title: data.title, instructorId },
    select: { id: true, title: true },
  });
  return course;
};

// ─── Delete course ─────────────────────────────────────────────────────────────

export const deleteCourse = async (courseId: number, userId: number, role: string) => {
  await assertAccess(courseId, userId, role);
  await prisma.course.delete({ where: { id: courseId } });
};

// ─── Share link ────────────────────────────────────────────────────────────────

export const getShareLink = async (courseId: number, userId: number, role: string) => {
  const course = await assertAccess(courseId, userId, role);
  const slug = course.websiteUrl ?? String(course.id);
  const baseUrl = process.env.CLIENT_URL ?? 'http://localhost:3000';
  return { url: `${baseUrl}/courses/${slug}` };
};

// ─── Get course detail ─────────────────────────────────────────────────────────

export const getCourseDetail = async (courseId: number, userId: number, role: string) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      lessons: {
        orderBy: { order: 'asc' },
        select: { id: true, title: true, type: true, order: true, duration: true },
      },
      quizzes: { select: { id: true, title: true } },
      _count: { select: { enrollments: true } },
    },
  });
  if (!course) throw new AppError(404, 'Course not found', 'COURSE_NOT_FOUND');
  if (role === 'INSTRUCTOR' && course.instructorId !== userId) {
    throw new AppError(403, 'Access denied', 'FORBIDDEN');
  }

  const { _count, ...rest } = course;
  return { ...rest, enrollmentCount: _count.enrollments };
};

// ─── Update course ─────────────────────────────────────────────────────────────

export const updateCourse = async (
  courseId: number,
  data: UpdateCourseInput,
  userId: number,
  role: string,
) => {
  await assertAccess(courseId, userId, role);
  const updated = await prisma.course.update({ where: { id: courseId }, data });
  return updated;
};

// ─── Publish / unpublish ───────────────────────────────────────────────────────

export const publishCourse = async (
  courseId: number,
  data: PublishCourseInput,
  userId: number,
  role: string,
) => {
  const course = await assertAccess(courseId, userId, role);
  if (data.isPublished && !course.websiteUrl) {
    throw new AppError(422, 'websiteUrl must be set before publishing', 'WEBSITE_URL_REQUIRED');
  }
  return prisma.course.update({
    where: { id: courseId },
    data: { isPublished: data.isPublished },
    select: { id: true, isPublished: true },
  });
};

// ─── Cover image ───────────────────────────────────────────────────────────────

export const updateCoverImage = async (
  courseId: number,
  filePath: string,
  userId: number,
  role: string,
) => {
  await assertAccess(courseId, userId, role);
  await prisma.course.update({ where: { id: courseId }, data: { coverImage: filePath } });
  return { coverImage: filePath };
};

// ─── Learner-facing: public course list ────────────────────────────────────────

export const listPublicCourses = async (search?: string) => {
  const courses = await prisma.course.findMany({
    where: {
      isPublished: true,
      ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      instructor: { select: { name: true } },
      lessons: { select: { id: true, duration: true } },
    },
  });

  return courses.map(c => ({
    id: c.id,
    title: c.title,
    description: c.description,
    coverImage: c.coverImage,
    tags: c.tags,
    lessonCount: c.lessons.length,
    totalDuration: c.lessons.reduce((s, l) => s + (l.duration ?? 0), 0),
    instructorName: c.instructor.name,
  }));
};

// ─── Learner-facing: course detail with lessons ─────────────────────────────

export const getCourseView = async (courseId: number, userId: number, role: string) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      instructor: { select: { name: true } },
      lessons: {
        orderBy: { order: 'asc' },
        select: {
          id: true, title: true, type: true, order: true,
          duration: true, description: true,
          videoUrl: true, videoStatus: true, thumbnailUrl: true,
          filePath: true, allowDownload: true,
        },
      },
    },
  });

  if (!course) throw new AppError(404, 'Course not found', 'COURSE_NOT_FOUND');
  if (!course.isPublished && role !== 'ADMIN' && role !== 'INSTRUCTOR') {
    throw new AppError(403, 'Course not available', 'FORBIDDEN');
  }

  let completedLessonIds: number[] = [];

  if (role === 'LEARNER') {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: {
        lessonProgresses: {
          where: { isCompleted: true },
          select: { lessonId: true },
        },
      },
    });
    if (!enrollment) throw new AppError(403, 'You are not enrolled in this course', 'NOT_ENROLLED');
    completedLessonIds = enrollment.lessonProgresses.map(lp => lp.lessonId);
  }

  const { instructor, ...rest } = course;
  return { ...rest, instructorName: instructor.name, completedLessonIds };
};

// ─── Learner-facing: single lesson view ────────────────────────────────────────

export const getLessonView = async (
  courseId: number,
  lessonId: number,
  userId: number,
  role: string,
) => {
  // Enrollment guard for learners
  if (role === 'LEARNER') {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrollment) throw new AppError(403, 'You are not enrolled in this course', 'NOT_ENROLLED');
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      attachments: { select: { id: true, type: true, label: true, filePath: true, externalUrl: true } },
    },
  });

  if (!lesson || lesson.courseId !== courseId) {
    throw new AppError(404, 'Lesson not found', 'LESSON_NOT_FOUND');
  }

  return lesson;
};

// ─── Mark lesson complete ─────────────────────────────────────────────────────

export const markLessonComplete = async (
  courseId: number,
  lessonId: number,
  userId: number,
) => {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment) throw new AppError(403, 'Not enrolled', 'NOT_ENROLLED');

  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson || lesson.courseId !== courseId) {
    throw new AppError(404, 'Lesson not found', 'LESSON_NOT_FOUND');
  }

  const progress = await prisma.lessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
    create: {
      enrollmentId: enrollment.id,
      lessonId,
      userId,
      isCompleted: true,
      completedAt: new Date(),
    },
    update: {
      isCompleted: true,
      completedAt: new Date(),
    },
  });

  if (!enrollment.startedAt) {
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { startedAt: new Date(), status: 'IN_PROGRESS' },
    });
  } else if (enrollment.status === 'NOT_STARTED') {
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { status: 'IN_PROGRESS' },
    });
  }

  const totalLessons = await prisma.lesson.count({ where: { courseId } });
  const completedCount = await prisma.lessonProgress.count({
    where: { enrollmentId: enrollment.id, isCompleted: true },
  });

  if (completedCount >= totalLessons) {
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
  }

  return { progress, completedCount, totalLessons };
};

// ─── Mark lesson incomplete ───────────────────────────────────────────────────

export const markLessonIncomplete = async (
  courseId: number,
  lessonId: number,
  userId: number,
) => {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment) throw new AppError(403, 'Not enrolled', 'NOT_ENROLLED');

  await prisma.lessonProgress.updateMany({
    where: { enrollmentId: enrollment.id, lessonId },
    data: { isCompleted: false, completedAt: null },
  });

  if (enrollment.status === 'COMPLETED') {
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { status: 'IN_PROGRESS', completedAt: null },
    });
  }

  const totalLessons = await prisma.lesson.count({ where: { courseId } });
  const completedCount = await prisma.lessonProgress.count({
    where: { enrollmentId: enrollment.id, isCompleted: true },
  });

  return { completedCount, totalLessons };
};

// ─── Add attendees ─────────────────────────────────────────────────────────────

export const addAttendees = async (
  courseId: number,
  data: AddAttendeesInput,
  userId: number,
  role: string,
) => {
  await assertAccess(courseId, userId, role);

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { title: true } });
  const courseTitle = course?.title ?? 'a course';
  const baseUrl = process.env.CLIENT_URL ?? 'http://localhost:3000';

  let enrolled = 0;
  let alreadyEnrolled = 0;
  let invited = 0;
  const emailErrors: string[] = [];

  for (const email of data.emails) {
    let targetUser = await prisma.user.findUnique({ where: { email } });
    let isNew = false;
    let tempPassword: string | null = null;

    if (!targetUser) {
      tempPassword = uuidv4().slice(0, 12);
      const passwordHash = await hashPassword(tempPassword);
      targetUser = await prisma.user.create({
        data: { email, name: email.split('@')[0], passwordHash, role: 'LEARNER' },
      });
      isNew = true;
    }

    const existing = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: targetUser.id, courseId } },
    });

    if (existing) {
      alreadyEnrolled++;
      continue;
    }

    await prisma.enrollment.create({ data: { userId: targetUser.id, courseId } });

    // Send appropriate email
    try {
      if (isNew && tempPassword) {
        await sendMail({
          to: email,
          subject: `You've been invited to "${courseTitle}" on Learnova`,
          html: `<p>You've been enrolled in <strong>${courseTitle}</strong> on Learnova.</p><p>Your temporary password is: <strong>${tempPassword}</strong></p><p>Please <a href="${baseUrl}/login">log in</a> and change your password.</p>`,
        });
        invited++;
      } else {
        await sendMail({
          to: email,
          subject: `You've been enrolled in "${courseTitle}" on Learnova`,
          html: `<p>You've been enrolled in <strong>${courseTitle}</strong> on Learnova.</p><p><a href="${baseUrl}/courses/${courseId}">View the course</a></p>`,
        });
        enrolled++;
      }
    } catch {
      // Enrollment succeeded; note the email failure
      if (isNew) invited++; else enrolled++;
      emailErrors.push(email);
    }
  }

  return { enrolled, alreadyEnrolled, invited, emailErrors };
};

// ─── Contact attendees ─────────────────────────────────────────────────────────

export const contactAttendees = async (
  courseId: number,
  data: ContactAttendeesInput,
  userId: number,
  role: string,
) => {
  await assertAccess(courseId, userId, role);

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId },
    include: { user: { select: { email: true } } },
  });

  const emails = enrollments.map(e => e.user.email);
  if (emails.length === 0) return { sent: 0 };

  await sendMail({ to: emails, subject: data.subject, html: data.body });
  return { sent: emails.length };
};
