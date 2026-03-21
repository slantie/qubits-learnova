import { Prisma } from '../../generated/prisma';
import prisma from '../../lib/prisma';
import { AppError } from '../../config/AppError';
import type {
  CreateLessonInput,
  UpdateLessonInput,
  ReorderLessonsInput,
  AddAttachmentLinkInput,
} from './lessons.schema';

// ─── Guard: course ownership ──────────────────────────────────────────────────

async function assertCourseAccess(courseId: number, userId: number, role: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new AppError(404, 'Course not found', 'COURSE_NOT_FOUND');
  if (role === 'INSTRUCTOR' && course.instructorId !== userId) {
    throw new AppError(403, 'Access denied', 'FORBIDDEN');
  }
  return course;
}

async function assertLessonBelongs(lessonId: number, courseId: number) {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson || lesson.courseId !== courseId) {
    throw new AppError(404, 'Lesson not found', 'LESSON_NOT_FOUND');
  }
  return lesson;
}

// ─── List lessons ─────────────────────────────────────────────────────────────

export const listLessons = async (courseId: number, userId: number, role: string) => {
  await assertCourseAccess(courseId, userId, role);

  const lessons = await prisma.lesson.findMany({
    where: { courseId },
    orderBy: { order: 'asc' },
    include: { _count: { select: { attachments: true } } },
  });

  return lessons.map(({ _count, ...l }) => ({
    ...l,
    attachmentsCount: _count.attachments,
  }));
};

// ─── Create lesson ────────────────────────────────────────────────────────────

export const createLesson = async (
  courseId: number,
  data: CreateLessonInput,
  userId: number,
  role: string,
) => {
  await assertCourseAccess(courseId, userId, role);

  let order = data.order;
  if (order === undefined) {
    const last = await prisma.lesson.aggregate({
      where: { courseId },
      _max: { order: true },
    });
    order = (last._max.order ?? 0) + 1;
  }

  return prisma.lesson.create({ data: { courseId, title: data.title, type: data.type, order } });
};

// ─── Get single lesson ────────────────────────────────────────────────────────

export const getLesson = async (courseId: number, lessonId: number, userId: number, role: string) => {
  await assertCourseAccess(courseId, userId, role);
  return assertLessonBelongs(lessonId, courseId);
};

// ─── Update lesson ────────────────────────────────────────────────────────────

export const updateLesson = async (
  courseId: number,
  lessonId: number,
  data: UpdateLessonInput,
  userId: number,
  role: string,
) => {
  await assertCourseAccess(courseId, userId, role);
  await assertLessonBelongs(lessonId, courseId);

  const { timestamps, ...rest } = data;
  const prismaData: Record<string, unknown> = { ...rest };
  if (timestamps !== undefined) {
    prismaData.timestamps = timestamps === null
      ? Prisma.DbNull
      : timestamps;
  }

  return prisma.lesson.update({ where: { id: lessonId }, data: prismaData });
};

// ─── Delete lesson ────────────────────────────────────────────────────────────

export const deleteLesson = async (
  courseId: number,
  lessonId: number,
  userId: number,
  role: string,
) => {
  await assertCourseAccess(courseId, userId, role);
  await assertLessonBelongs(lessonId, courseId);

  await prisma.lesson.delete({ where: { id: lessonId } });

  // Re-sequence remaining lessons
  const remaining = await prisma.lesson.findMany({
    where: { courseId },
    orderBy: { order: 'asc' },
  });
  await prisma.$transaction(
    remaining.map((l, i) => prisma.lesson.update({ where: { id: l.id }, data: { order: i + 1 } })),
  );
};

// ─── Reorder lessons ──────────────────────────────────────────────────────────

export const reorderLessons = async (
  courseId: number,
  data: ReorderLessonsInput,
  userId: number,
  role: string,
) => {
  await assertCourseAccess(courseId, userId, role);

  // Verify all IDs belong to this course
  const lessons = await prisma.lesson.findMany({ where: { courseId }, select: { id: true } });
  const validIds = new Set(lessons.map(l => l.id));
  for (const id of data.lessonIds) {
    if (!validIds.has(id)) throw new AppError(400, `Lesson ${id} does not belong to this course`, 'INVALID_LESSON_ID');
  }

  await prisma.$transaction(
    data.lessonIds.map((id, i) =>
      prisma.lesson.update({ where: { id }, data: { order: i + 1 } }),
    ),
  );
};

// ─── Upload lesson file ───────────────────────────────────────────────────────

export const uploadLessonFile = async (
  courseId: number,
  lessonId: number,
  filePath: string,
  userId: number,
  role: string,
) => {
  await assertCourseAccess(courseId, userId, role);
  await assertLessonBelongs(lessonId, courseId);

  await prisma.lesson.update({ where: { id: lessonId }, data: { filePath } });
  return { filePath };
};

// ─── List attachments ─────────────────────────────────────────────────────────

export const listAttachments = async (
  courseId: number,
  lessonId: number,
  userId: number,
  role: string,
) => {
  await assertCourseAccess(courseId, userId, role);
  await assertLessonBelongs(lessonId, courseId);

  return prisma.attachment.findMany({ where: { lessonId } });
};

// ─── Add file attachment ──────────────────────────────────────────────────────

export const addFileAttachment = async (
  courseId: number,
  lessonId: number,
  filePath: string,
  label: string,
  userId: number,
  role: string,
) => {
  await assertCourseAccess(courseId, userId, role);
  await assertLessonBelongs(lessonId, courseId);

  return prisma.attachment.create({
    data: { lessonId, type: 'FILE', label, filePath },
  });
};

// ─── Add link attachment ──────────────────────────────────────────────────────

export const addLinkAttachment = async (
  courseId: number,
  lessonId: number,
  data: AddAttachmentLinkInput,
  userId: number,
  role: string,
) => {
  await assertCourseAccess(courseId, userId, role);
  await assertLessonBelongs(lessonId, courseId);

  return prisma.attachment.create({
    data: { lessonId, type: 'LINK', label: data.label, externalUrl: data.externalUrl },
  });
};

// ─── Delete attachment ────────────────────────────────────────────────────────

export const deleteAttachment = async (
  courseId: number,
  lessonId: number,
  attachmentId: number,
  userId: number,
  role: string,
) => {
  await assertCourseAccess(courseId, userId, role);
  await assertLessonBelongs(lessonId, courseId);

  const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
  if (!attachment || attachment.lessonId !== lessonId) {
    throw new AppError(404, 'Attachment not found', 'ATTACHMENT_NOT_FOUND');
  }

  await prisma.attachment.delete({ where: { id: attachmentId } });
};
