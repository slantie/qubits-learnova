import { PrismaClient } from '../generated/prisma';
import { BadgeCategory } from '../generated/prisma';

export interface EvaluateContext {
  courseId?: number;
  quizId?: number;
}

export interface BadgeDefinition {
  key: string;
  name: string;
  category: BadgeCategory;
  description: string;
  trigger: string;
  check: (userId: number, db: PrismaClient, context?: EvaluateContext) => Promise<boolean>;
}

export const BADGE_THRESHOLDS = [
  { name: 'Newbie',     min: 20  },
  { name: 'Explorer',   min: 40  },
  { name: 'Achiever',   min: 60  },
  { name: 'Specialist', min: 80  },
  { name: 'Expert',     min: 100 },
  { name: 'Master',     min: 120 },
] as const;

export function computeBadge(totalPoints: number): string | null {
  const earned = [...BADGE_THRESHOLDS].reverse().find(b => totalPoints >= b.min);
  return earned?.name ?? null;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // Tier badges (6)
  { key: 'tier:newbie', name: 'Newbie', category: BadgeCategory.TIER, description: 'Earned your first points', trigger: 'Reach 20 points',
    check: async (userId, db) => { const u = await db.user.findUnique({ where: { id: userId }, select: { totalPoints: true } }); return (u?.totalPoints ?? 0) >= 20; } },
  { key: 'tier:explorer', name: 'Explorer', category: BadgeCategory.TIER, description: 'Expanding your horizons', trigger: 'Reach 40 points',
    check: async (userId, db) => { const u = await db.user.findUnique({ where: { id: userId }, select: { totalPoints: true } }); return (u?.totalPoints ?? 0) >= 40; } },
  { key: 'tier:achiever', name: 'Achiever', category: BadgeCategory.TIER, description: 'Making real progress', trigger: 'Reach 60 points',
    check: async (userId, db) => { const u = await db.user.findUnique({ where: { id: userId }, select: { totalPoints: true } }); return (u?.totalPoints ?? 0) >= 60; } },
  { key: 'tier:specialist', name: 'Specialist', category: BadgeCategory.TIER, description: 'Deep expertise unlocked', trigger: 'Reach 80 points',
    check: async (userId, db) => { const u = await db.user.findUnique({ where: { id: userId }, select: { totalPoints: true } }); return (u?.totalPoints ?? 0) >= 80; } },
  { key: 'tier:expert', name: 'Expert', category: BadgeCategory.TIER, description: 'Top tier learner', trigger: 'Reach 100 points',
    check: async (userId, db) => { const u = await db.user.findUnique({ where: { id: userId }, select: { totalPoints: true } }); return (u?.totalPoints ?? 0) >= 100; } },
  { key: 'tier:master', name: 'Master', category: BadgeCategory.TIER, description: 'The pinnacle of learning', trigger: 'Reach 120 points',
    check: async (userId, db) => { const u = await db.user.findUnique({ where: { id: userId }, select: { totalPoints: true } }); return (u?.totalPoints ?? 0) >= 120; } },

  // Course milestone badges (4)
  { key: 'achievement:first-step', name: 'First Step', category: BadgeCategory.COURSE_MILESTONE, description: 'You completed your first course', trigger: 'Complete 1 course',
    check: async (userId, db) => { const c = await db.enrollment.count({ where: { userId, status: 'COMPLETED' } }); return c >= 1; } },
  { key: 'achievement:on-fire', name: 'On Fire', category: BadgeCategory.COURSE_MILESTONE, description: 'On a serious learning streak', trigger: 'Complete 5 courses',
    check: async (userId, db) => { const c = await db.enrollment.count({ where: { userId, status: 'COMPLETED' } }); return c >= 5; } },
  { key: 'achievement:scholar', name: 'Scholar', category: BadgeCategory.COURSE_MILESTONE, description: 'A true scholar', trigger: 'Complete 10 courses',
    check: async (userId, db) => { const c = await db.enrollment.count({ where: { userId, status: 'COMPLETED' } }); return c >= 10; } },
  { key: 'achievement:collector', name: 'Collector', category: BadgeCategory.COURSE_MILESTONE, description: 'Insatiable curiosity', trigger: 'Complete 25 courses',
    check: async (userId, db) => { const c = await db.enrollment.count({ where: { userId, status: 'COMPLETED' } }); return c >= 25; } },

  // Quiz excellence badges (2)
  { key: 'achievement:quiz-master', name: 'Quiz Master', category: BadgeCategory.QUIZ_EXCELLENCE, description: 'Perfect score on a quiz', trigger: 'Score 100% on any quiz',
    check: async (userId, db) => { const a = await db.quizAttempt.findFirst({ where: { userId, scorePercent: 100 } }); return a !== null; } },
  { key: 'achievement:perfect-run', name: 'Perfect Run', category: BadgeCategory.QUIZ_EXCELLENCE, description: 'Perfection, repeatedly', trigger: 'Score 100% on 3 distinct quizzes',
    check: async (userId, db) => { const a = await db.quizAttempt.findMany({ where: { userId, scorePercent: 100 }, distinct: ['quizId'], select: { quizId: true } }); return a.length >= 3; } },

  // Speed badge (1)
  { key: 'achievement:speed-learner', name: 'Speed Learner', category: BadgeCategory.SPEED, description: 'Blazing fast completion', trigger: 'Complete a course within 24h of enrolling',
    check: async (userId, db) => {
      const enrollments = await db.enrollment.findMany({ where: { userId, status: 'COMPLETED', completedAt: { not: null } }, select: { enrolledAt: true, completedAt: true } });
      return enrollments.some(e => e.completedAt && (e.completedAt.getTime() - e.enrolledAt.getTime()) <= 24 * 60 * 60 * 1000);
    } },

  // Certification badges (2)
  { key: 'achievement:certified', name: 'Certified', category: BadgeCategory.CERTIFICATION, description: 'Officially certified', trigger: 'Earn your first certificate',
    check: async (userId, db) => { const c = await db.certificate.count({ where: { userId } }); return c >= 1; } },
  { key: 'achievement:multi-cert', name: 'Multi-Cert', category: BadgeCategory.CERTIFICATION, description: 'Multiply certified', trigger: 'Earn 3 certificates',
    check: async (userId, db) => { const c = await db.certificate.count({ where: { userId } }); return c >= 3; } },

  // Dedication badges (3)
  { key: 'achievement:early-bird', name: 'Early Bird', category: BadgeCategory.DEDICATION, description: 'First to the party', trigger: 'Be the first to enroll in a course',
    check: async (userId, db, context) => {
      if (!context?.courseId) return false;
      const first = await db.enrollment.findFirst({ where: { courseId: context.courseId }, orderBy: { enrolledAt: 'asc' }, select: { userId: true } });
      return first?.userId === userId;
    } },
  { key: 'achievement:dedicated', name: 'Dedicated', category: BadgeCategory.DEDICATION, description: 'Consistent and committed', trigger: 'Complete lessons on 7 distinct calendar days',
    check: async (userId, db) => {
      const progresses = await db.lessonProgress.findMany({ where: { userId, isCompleted: true, completedAt: { not: null } }, select: { completedAt: true } });
      const days = new Set(progresses.map(p => p.completedAt!.toISOString().slice(0, 10)));
      return days.size >= 7;
    } },
  { key: 'achievement:reviewer', name: 'Reviewer', category: BadgeCategory.DEDICATION, description: 'Helping the community', trigger: 'Leave 5 course reviews',
    check: async (userId, db) => { const c = await db.review.count({ where: { userId } }); return c >= 5; } },
];
