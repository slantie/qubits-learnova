import prisma from '../../lib/prisma';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function secondsToHHMM(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function computeCompletionPct(progresses: { isCompleted: boolean }[]): number {
  if (progresses.length === 0) return 0;
  const done = progresses.filter(p => p.isCompleted).length;
  return Math.round((done / progresses.length) * 100);
}

// ─── Where clause builder ─────────────────────────────────────────────────────

function buildWhere(
  userId: number,
  role: string,
  courseId?: number,
  status?: string,
): Record<string, unknown> {
  const courseFilter = courseId ? { courseId } : {};
  const statusFilter = status ? { status: status as 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' } : {};

  if (role === 'INSTRUCTOR') {
    return { course: { instructorId: userId }, ...courseFilter, ...statusFilter };
  }
  // ADMIN
  return { ...courseFilter, ...statusFilter };
}

// ─── getSummary ───────────────────────────────────────────────────────────────

export const getSummary = async (userId: number, role: string, courseId?: number) => {
  const where = buildWhere(userId, role, courseId);

  const [total, yetToStart, inProgress, completed] = await Promise.all([
    prisma.enrollment.count({ where }),
    prisma.enrollment.count({ where: { ...where, status: 'NOT_STARTED' } }),
    prisma.enrollment.count({ where: { ...where, status: 'IN_PROGRESS' } }),
    prisma.enrollment.count({ where: { ...where, status: 'COMPLETED' } }),
  ]);

  return { total, yetToStart, inProgress, completed };
};

// ─── getTable ─────────────────────────────────────────────────────────────────

export const getTable = async (
  userId: number,
  role: string,
  options: { courseId?: number; status?: string; page: number; limit: number },
) => {
  const { courseId, status, page, limit } = options;
  const where = buildWhere(userId, role, courseId, status);
  const skip = (page - 1) * limit;

  const [enrollments, total] = await Promise.all([
    prisma.enrollment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { enrolledAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
        lessonProgresses: { select: { isCompleted: true } },
      },
    }),
    prisma.enrollment.count({ where }),
  ]);

  const data = enrollments.map(e => ({
    id: e.id,
    courseName: e.course.title,
    participantName: e.user.name,
    participantEmail: e.user.email,
    enrolledDate: e.enrolledAt,
    startDate: e.startedAt,
    timeSpent: secondsToHHMM(e.timeSpent),
    completionPct: computeCompletionPct(e.lessonProgresses),
    completedDate: e.completedAt,
    status: e.status,
  }));

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
};

// ─── getCourseCards ───────────────────────────────────────────────────────────

export const getCourseCards = async (userId: number, role: string) => {
  const where = role === 'INSTRUCTOR' ? { instructorId: userId } : {};

  const courses = await prisma.course.findMany({
    where,
    select: {
      id: true,
      title: true,
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return courses;
};
