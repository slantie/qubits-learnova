import prisma from '../../lib/prisma';
import { AppError } from '../../config/AppError';
import type { CreateSectionInput, UpdateSectionInput, ReorderSectionsInput } from './sections.schema';

async function assertCourseAccess(courseId: number, userId: number, role: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new AppError(404, 'Course not found', 'COURSE_NOT_FOUND');
  if (role === 'INSTRUCTOR' && course.instructorId !== userId)
    throw new AppError(403, 'Access denied', 'FORBIDDEN');
  return course;
}

export const listSections = async (courseId: number, userId: number, role: string) => {
  await assertCourseAccess(courseId, userId, role);
  return prisma.section.findMany({
    where: { courseId },
    orderBy: { order: 'asc' },
    include: {
      lessons: {
        orderBy: { order: 'asc' },
        select: {
          id: true, title: true, type: true, order: true,
          duration: true, videoStatus: true, sectionId: true,
        },
      },
    },
  });
};

export const createSection = async (
  courseId: number,
  data: CreateSectionInput,
  userId: number,
  role: string,
) => {
  await assertCourseAccess(courseId, userId, role);

  let order = data.order;
  if (order === undefined) {
    const last = await prisma.section.aggregate({ where: { courseId }, _max: { order: true } });
    order = (last._max.order ?? 0) + 1;
  }

  return prisma.section.create({ data: { courseId, title: data.title, order } });
};

export const updateSection = async (
  courseId: number,
  sectionId: number,
  data: UpdateSectionInput,
  userId: number,
  role: string,
) => {
  await assertCourseAccess(courseId, userId, role);
  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section || section.courseId !== courseId)
    throw new AppError(404, 'Section not found', 'SECTION_NOT_FOUND');
  return prisma.section.update({ where: { id: sectionId }, data });
};

export const deleteSection = async (
  courseId: number,
  sectionId: number,
  userId: number,
  role: string,
) => {
  await assertCourseAccess(courseId, userId, role);
  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section || section.courseId !== courseId)
    throw new AppError(404, 'Section not found', 'SECTION_NOT_FOUND');

  // Detach lessons instead of deleting them
  await prisma.lesson.updateMany({ where: { sectionId }, data: { sectionId: null } });
  await prisma.section.delete({ where: { id: sectionId } });

  // Re-sequence remaining sections
  const remaining = await prisma.section.findMany({ where: { courseId }, orderBy: { order: 'asc' } });
  await prisma.$transaction(
    remaining.map((s, i) => prisma.section.update({ where: { id: s.id }, data: { order: i + 1 } })),
  );
};

export const reorderSections = async (
  courseId: number,
  data: ReorderSectionsInput,
  userId: number,
  role: string,
) => {
  await assertCourseAccess(courseId, userId, role);
  const sections = await prisma.section.findMany({ where: { courseId }, select: { id: true } });
  const valid = new Set(sections.map(s => s.id));
  for (const id of data.sectionIds) {
    if (!valid.has(id)) throw new AppError(400, `Section ${id} not in course`, 'INVALID_SECTION_ID');
  }
  await prisma.$transaction(
    data.sectionIds.map((id, i) => prisma.section.update({ where: { id }, data: { order: i + 1 } })),
  );
};

export const moveLessonToSection = async (
  courseId: number,
  lessonId: number,
  sectionId: number | null,
  order: number,
  userId: number,
  role: string,
) => {
  await assertCourseAccess(courseId, userId, role);
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson || lesson.courseId !== courseId)
    throw new AppError(404, 'Lesson not found', 'LESSON_NOT_FOUND');
  if (sectionId !== null) {
    const section = await prisma.section.findUnique({ where: { id: sectionId } });
    if (!section || section.courseId !== courseId)
      throw new AppError(404, 'Section not found', 'SECTION_NOT_FOUND');
  }
  return prisma.lesson.update({ where: { id: lessonId }, data: { sectionId, order } });
};
