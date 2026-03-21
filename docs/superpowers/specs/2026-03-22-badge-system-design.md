# Badge System Design

**Date:** 2026-03-22
**Status:** Approved
**Approach:** Hybrid (Option C leaning Option B) — tier badge cached on User, all badge history stored in UserBadge table

---

## Overview

Add a comprehensive GitHub-style badge system to Learnova. Two badge families:

1. **Point-Tier Badges (6)** — auto-promoted as `totalPoints` grows. Visually redesigned from plain text to GitHub-style circular metallic badges.
2. **Achievement Badges (12)** — unlocked by specific accomplishments across 5 categories.

All 18 badges rendered as GitHub-style circular components: conic-gradient metallic ring, dark inner field, purpose-built SVG icon. Glow uses `filter: drop-shadow` — subtle on light UI, richer on dark UI.

---

## Badge Inventory (18 total)

### Tier Badges (6) — `category: TIER`

| Key | Name | Threshold |
|-----|------|-----------|
| `tier:newbie` | Newbie | 20 pts |
| `tier:explorer` | Explorer | 40 pts |
| `tier:achiever` | Achiever | 60 pts |
| `tier:specialist` | Specialist | 80 pts |
| `tier:expert` | Expert | 100 pts |
| `tier:master` | Master | 120 pts |

### Course Milestone Badges (4) — `category: COURSE_MILESTONE`

| Key | Name | Trigger |
|-----|------|---------|
| `achievement:first-step` | First Step | Complete 1st course |
| `achievement:on-fire` | On Fire | Complete 5 courses |
| `achievement:scholar` | Scholar | Complete 10 courses |
| `achievement:collector` | Collector | Complete 25 courses |

### Quiz Excellence Badges (2) — `category: QUIZ_EXCELLENCE`

| Key | Name | Trigger |
|-----|------|---------|
| `achievement:quiz-master` | Quiz Master | Score 100% on any quiz |
| `achievement:perfect-run` | Perfect Run | Score 100% on 3 distinct quizzes |

### Speed Badge (1) — `category: SPEED`

| Key | Name | Trigger |
|-----|------|---------|
| `achievement:speed-learner` | Speed Learner | Complete a course within 24h of enrolling |

### Certification Badges (2) — `category: CERTIFICATION`

| Key | Name | Trigger |
|-----|------|---------|
| `achievement:certified` | Certified | Earn first certificate |
| `achievement:multi-cert` | Multi-Cert | Earn 3 certificates |

### Dedication Badges (3) — `category: DEDICATION`

| Key | Name | Trigger |
|-----|------|---------|
| `achievement:early-bird` | Early Bird | First learner to enroll in a course |
| `achievement:dedicated` | Dedicated | Complete lessons on 7 distinct calendar days (UTC) |
| `achievement:reviewer` | Reviewer | Leave 5 course reviews |

---

## Data Model

### Schema change 1 — extend `QuizAttempt`

Add `scorePercent Int @default(0)` to `QuizAttempt`. Populated in `quiz.service.ts → submitAttempt()` as `Math.round((correctCount / totalQuestions) * 100)` before the record is created. This enables clean, direct queries for quiz badge checks without re-scoring stored answer JSON.

```prisma
model QuizAttempt {
  // ... existing fields ...
  scorePercent  Int      @default(0)   // NEW — percentage correct, 0-100
}
```

### Schema change 2 — new enum

```prisma
enum BadgeCategory {
  TIER
  COURSE_MILESTONE
  QUIZ_EXCELLENCE
  SPEED
  CERTIFICATION
  DEDICATION
}
```

### Schema change 3 — new model

```prisma
model UserBadge {
  id       Int           @id @default(autoincrement())
  userId   Int
  user     User          @relation(fields: [userId], references: [id])
  badgeKey String        // e.g. "tier:master", "achievement:quiz-master"
  category BadgeCategory
  earnedAt DateTime      @default(now())

  @@unique([userId, badgeKey])
}
```

### Schema change 4 — add relation on `User`

```prisma
badges UserBadge[]
```

`User.currentBadge` is kept as a quick-access cache for the current highest tier badge name (e.g. `"Master"`). Updated by `BadgeService` whenever a tier promotion occurs.

---

## Server Architecture

### `server/src/config/badges.ts` (expanded)

Each badge definition:

```ts
interface BadgeDefinition {
  key: string;
  name: string;
  category: BadgeCategory;
  description: string;
  trigger: string;   // human-readable unlock condition for display
  check: (userId: number, db: PrismaClient, context?: EvaluateContext) => Promise<boolean>;
}
```

Each `check()` is responsible for its own queries against the DB — straightforward and independently testable. No pre-loading context object is needed; Prisma's connection pooling handles N small queries efficiently at this scale.

All 18 definitions exported as `BADGE_DEFINITIONS: BadgeDefinition[]`.
Tier thresholds remain in `BADGE_THRESHOLDS` (unchanged). `computeBadge()` is reused inside tier badge `check()` functions.

**Check implementations (critical details):**

- `achievement:quiz-master` — `db.quizAttempt.findFirst({ where: { userId, scorePercent: 100 } })` — relies on new `scorePercent` field.
- `achievement:perfect-run` — `db.quizAttempt.findMany({ where: { userId, scorePercent: 100 }, distinct: ['quizId'] })` count >= 3.
- `achievement:early-bird` — `db.enrollment.findFirst({ where: { courseId: context.courseId }, orderBy: { enrolledAt: 'asc' } })` then check if `enrollment.userId === userId`. Requires `context.courseId` (see evaluate signature below).
- `achievement:dedicated` — `db.lessonProgress.findMany({ where: { userId, isCompleted: true } })` extract `completedAt` dates, convert to UTC date strings, count distinct values >= 7.
- `achievement:reviewer` — `db.review.count({ where: { userId } })` >= 5. The `Review` model enforces `@@unique([userId, courseId])` so this counts distinct courses reviewed, not upsert calls.

### `server/src/modules/badges/badge.service.ts`

```ts
interface EvaluateContext {
  courseId?: number;   // passed when triggered from enroll / course completion
  quizId?: number;     // passed when triggered from quiz submission
}

BadgeService.evaluate(userId: number, context?: EvaluateContext): Promise<UserBadge[]>
```

Logic:
1. Load user's existing `UserBadge` keys into a Set for O(1) lookup
2. Run each `BadgeDefinition.check(userId, db, context)` — skip if already earned
3. Batch-insert newly earned badges via `createMany({ skipDuplicates: true })`
4. If any new TIER badge earned, update `User.currentBadge` to the highest newly earned tier name (reuse `computeBadge()` against `user.totalPoints`)
5. Return array of newly minted `UserBadge` records
6. Entire method wrapped in try/catch — errors are logged but never rethrow; badge evaluation must never break the calling operation

### Call sites — fire-and-forget, on new records only

```ts
// quiz.service.ts — after creating QuizAttempt
BadgeService.evaluate(userId, { quizId }).catch(() => {});

// learner.service.ts — enrollCourse() — ONLY when enrollment is newly created
// Detect: issue a findUnique BEFORE the upsert. If null, the enrollment is new.
// Note: Enrollment has no updatedAt column — do NOT use createdAt === updatedAt.
// const existing = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
// ... then upsert as before ...
// if (!existing) BadgeService.evaluate(userId, { courseId }).catch(() => {});
if (isNewEnrollment) {
  BadgeService.evaluate(userId, { courseId }).catch(() => {});
}

// learner.service.ts — inside markLessonComplete(), after course completion detected
BadgeService.evaluate(userId, { courseId }).catch(() => {});

// learner.service.ts — submitReview() — ONLY on net-new review (not on update)
// Detect: issue a findUnique BEFORE the upsert. If null, the review is new.
// Note: Review has no updatedAt column — do NOT use createdAt === updatedAt.
// const existing = await prisma.review.findUnique({ where: { userId_courseId: { userId, courseId } } });
// ... then upsert as before ...
// if (!existing) BadgeService.evaluate(userId).catch(() => {});
if (isNewReview) {
  BadgeService.evaluate(userId).catch(() => {});
}

// certificate.service.ts — after issueCertificate()
BadgeService.evaluate(userId).catch(() => {});
```

### `server/src/modules/badges/badge.routes.ts`

All routes require `authenticate` middleware (same middleware used across profile, courses, progress routes).

```
GET /badges   — authenticate — returns all 18 badge definitions + earned status for req.user.id
```

Response shape:
```ts
{
  badges: Array<{
    key: string;
    name: string;
    category: BadgeCategory;
    description: string;
    trigger: string;
    earned: boolean;
    earnedAt: string | null;   // ISO string
    // progress field for countable badges:
    progress?: { current: number; required: number };
  }>
}
```

Progress is populated server-side for badges with numeric thresholds:
- Course milestones: `current = completedCourseCount`, `required = threshold`
- Quiz excellence: `current = distinctPerfectQuizCount`, `required = threshold`
- Certification: `current = certificateCount`, `required = threshold`
- Dedication/Reviewer: `current = reviewCount or distinctDaysCount`, `required = threshold`
- Tier and Early Bird: no progress field

### `GET /profile` extension

The existing profile response is extended with:
```ts
badges: Array<{ badgeKey: string; earnedAt: string }>  // earned badges only, narrow shape
```

No internal fields (`id`, `userId`) exposed. The full badge definitions catalogue (with locked/progress state) is only on `GET /badges`.

---

## Frontend Architecture

### `client/components/badges/BadgeIcon.tsx`

Core visual component:

```ts
interface BadgeIconProps {
  badgeKey: string;    // drives SVG and ring colour
  size?: 'sm' | 'md' | 'lg';   // sm=48px, md=80px, lg=112px — default 'md'
  locked?: boolean;    // grayscale(0.8) + opacity-35
  showLabel?: boolean;
  showTrigger?: boolean;
}
```

Renders: outer div with conic-gradient ring (Tailwind `bg-[conic-gradient(...)]`) → dark inner circle (`bg-[radial-gradient(...)]`) → inline SVG icon.

A static `BADGE_VISUALS` map keyed by `badgeKey` provides: ring gradient CSS value, glow drop-shadow value (light), glow drop-shadow value (dark), and the SVG path content.

Ring glow applied via: `style={{ filter: dropShadowValue }}` with a Tailwind `dark:` variant override for richer glow in dark mode.

### `client/components/badges/BadgesGrid.tsx`

Props:
```ts
interface BadgesGridProps {
  badges: BadgeStatusItem[];  // all 18 from GET /badges
  compact?: boolean;          // for use inside ProfilePanel
}
```

Renders badges grouped by category with section headers. Locked badges at 35% opacity with grayscale filter. Shows `progress.current / progress.required` hint below locked countable badges (e.g. "7 / 10 courses — 3 more to unlock"). Progress data comes from the `progress` field in the API response.

### `client/components/learner/ProfilePanel.tsx` (updated)

Replace the current `<p>Badge: {currentBadge}</p>` block with a flex row of earned `BadgeIcon` components at `size="sm"`. Show up to 4 badges; if more are earned, show a `+N` chip. Clicking the chip or any badge navigates to `/badges`.

### `client/app/(website)/badges/page.tsx` (new)

Full badge showcase page. Fetches `GET /badges`. Sections per category. Each badge rendered as `BadgeIcon` at `size="lg"` with name, description, trigger, earned date or progress hint. Page title: "Your Badges".

### `client/lib/api/badges.ts` (new)

```ts
export function fetchBadges(): Promise<BadgeStatusList>
```

---

## Implementation Constraints

- `BadgeService.evaluate()` must never throw — all errors caught and logged silently. Badge evaluation is non-critical.
- `createMany({ skipDuplicates: true })` ensures idempotency — safe to call evaluate() multiple times for the same user.
- No background job or cron — evaluation triggered by user actions only.
- Tier badge check reuses `computeBadge()` from `config/badges.ts` — no duplication.
- Calendar day for `Dedicated` badge computed in UTC for all users. Timezone preference is a future enhancement.
- `achievement:reviewer` badge check queries `db.review.count({ where: { userId } })` — counts distinct `Review` rows (one per course due to the `@@unique` constraint), not upsert invocations.
- `evaluate()` is only called on genuinely new records (new enrollment, new review) — not on every upsert result.

---

## Files Changed / Created

### Server
- `prisma/schema.prisma` — add `scorePercent` to `QuizAttempt`; add `BadgeCategory` enum; add `UserBadge` model; add `badges` relation on `User`
- `prisma/migrations/` — one migration: `add_score_percent_and_user_badge_table`
- `src/config/badges.ts` — expand with all 18 `BadgeDefinition` entries including `check()` implementations
- `src/modules/badges/badge.service.ts` — new (`evaluate()` with `EvaluateContext`)
- `src/modules/badges/badge.routes.ts` — new (`GET /badges` with `authenticate`)
- `src/routes/index.ts` (or equivalent router mount) — mount `/badges`
- `src/modules/quiz/quiz.service.ts` — populate `scorePercent` on `QuizAttempt` creation; add fire-and-forget `evaluate()` call
- `src/modules/learner/learner.service.ts` — add fire-and-forget `evaluate()` calls after new enrollment, course completion, new review
- `src/modules/certificates/certificate.service.ts` — add fire-and-forget `evaluate()` call after certificate issue
- `src/modules/learner/learner.service.ts` — extend `getProfile()` to include `badges` array

### Client
- `components/badges/BadgeIcon.tsx` — new
- `components/badges/BadgesGrid.tsx` — new
- `app/(website)/badges/page.tsx` — new
- `components/learner/ProfilePanel.tsx` — update badge display section
- `lib/api/badges.ts` — new
- `types/index.ts` — add `BadgeStatusItem`, `BadgeStatusList`, `UserBadge` types
