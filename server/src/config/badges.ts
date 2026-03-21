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
