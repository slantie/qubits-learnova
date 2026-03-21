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

// ─── Add attendees ─────────────────────────────────────────────────────────────

export const addAttendees = async (
  courseId: number,
  data: AddAttendeesInput,
  userId: number,
  role: string,
) => {
  await assertAccess(courseId, userId, role);

  let enrolled = 0;
  let alreadyEnrolled = 0;
  let invited = 0;

  for (const email of data.emails) {
    let targetUser = await prisma.user.findUnique({ where: { email } });
    let isNew = false;

    if (!targetUser) {
      const tempPassword = uuidv4().slice(0, 12);
      const passwordHash = await hashPassword(tempPassword);
      targetUser = await prisma.user.create({
        data: { email, name: email.split('@')[0], passwordHash, role: 'LEARNER' },
      });
      isNew = true;

      await sendMail({
        to: email,
        subject: 'You have been invited to Learnova',
        html: `<p>You have been invited to a course on Learnova. Your temporary password is: <strong>${tempPassword}</strong></p><p>Please log in and change your password.</p>`,
      }).catch(() => { /* non-fatal */ });

      invited++;
    }

    const existing = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: targetUser.id, courseId } },
    });

    if (existing) {
      alreadyEnrolled++;
    } else {
      await prisma.enrollment.create({ data: { userId: targetUser.id, courseId } });
      if (!isNew) enrolled++;
    }
  }

  return { enrolled, alreadyEnrolled, invited };
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
