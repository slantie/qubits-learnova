import prisma from '../../lib/prisma';
import { BADGE_DEFINITIONS, EvaluateContext, computeBadge } from '../../config/badges';
import { BadgeCategory } from '../../generated/prisma';

export const evaluate = async (
  userId: number,
  context?: EvaluateContext,
): Promise<{ id: number; userId: number; badgeKey: string; category: BadgeCategory; earnedAt: Date }[]> => {
  try {
    // 1. Get already-earned badge keys
    const existing = await prisma.userBadge.findMany({
      where: { userId },
      select: { badgeKey: true },
    });
    const earnedKeys = new Set(existing.map(b => b.badgeKey));

    // 2. Run checks for unarned badges
    const toAward: { badgeKey: string; category: BadgeCategory }[] = [];
    for (const def of BADGE_DEFINITIONS) {
      if (earnedKeys.has(def.key)) continue;
      const earned = await def.check(userId, prisma, context);
      if (earned) {
        toAward.push({ badgeKey: def.key, category: def.category });
      }
    }

    if (toAward.length === 0) return [];

    // 3. Batch insert newly earned badges
    await prisma.userBadge.createMany({
      data: toAward.map(b => ({ userId, badgeKey: b.badgeKey, category: b.category })),
      skipDuplicates: true,
    });

    // 4. If any new TIER badge, update User.currentBadge
    const hasNewTier = toAward.some(b => b.category === BadgeCategory.TIER);
    if (hasNewTier) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { totalPoints: true } });
      if (user) {
        const newBadge = computeBadge(user.totalPoints);
        await prisma.user.update({ where: { id: userId }, data: { currentBadge: newBadge } });
      }
    }

    // 5. Return newly minted badges
    return prisma.userBadge.findMany({
      where: { userId, badgeKey: { in: toAward.map(b => b.badgeKey) } },
    });
  } catch (err) {
    console.error('[BadgeService] evaluate error:', err);
    return [];
  }
};
