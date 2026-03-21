# Learnova — Learner Frontend Module: Complete Implementation Plan

> **Scope:** B1 Navbar → B2 My Courses page → B3 Course Detail page → B4 Ratings & Reviews tab → Paid badge + payment gate
>
> **Prerequisite:** Backoffice Core (courses, lessons, sections, enrollments, auth) must be complete. Quiz Builder API must be complete for question count display.
> **Rule:** Backend API additions only where needed. Frontend is a separate learner-facing surface — do NOT modify backoffice pages.
> **Stack:** Next.js (port 3000) + Tailwind CSS + existing auth session. Backend Express/Fastify (port 4000) + Prisma.

---

## Table of Contents

1. [What Already Exists (Do Not Rebuild)](#1-what-already-exists-do-not-rebuild)
2. [New Backend API Endpoints Needed](#2-new-backend-api-endpoints-needed)
3. [B1 — Navbar](#3-b1--navbar)
4. [B2 — My Courses Page](#4-b2--my-courses-page)
5. [B3 — Course Detail Page](#5-b3--course-detail-page)
6. [B4 — Ratings & Reviews Tab](#6-b4--ratings--reviews-tab)
7. [Paid Badge + Payment Gate](#7-paid-badge--payment-gate)
8. [Frontend Routing & Folder Structure](#8-frontend-routing--folder-structure)
9. [Shared Learner API Helpers](#9-shared-learner-api-helpers)
10. [Implementation Order](#10-implementation-order)
11. [Edge Cases & Validation Rules](#11-edge-cases--validation-rules)

---

## 1. What Already Exists (Do Not Rebuild)

### Schema models (already in `schema.prisma` from core plan):
- `Course` — id, title, description, coverImageUrl, isPublished, visibility, accessRule, price, tags, viewCount, websiteUrl, instructorId, courseAdminId
- `Section` — id, title, order, courseId
- `Lesson` — id, title, type, order, description, durationSeconds, videoServiceId, videoStatus, streamUrl, thumbnailUrl, fileUrl, allowDownload, courseId, sectionId
- `Enrollment` — id, status (YET_TO_START / IN_PROGRESS / COMPLETED), enrolledAt, startedAt, completedAt, timeSpentSec, userId, courseId
- `LessonProgress` — id, isCompleted, completedAt, enrollmentId, lessonId, userId
- `Review` — id, rating (1–5), reviewText, createdAt, userId, courseId — `@@unique([userId, courseId])`
- `QuizAttempt` — id, attemptNumber, pointsEarned, completedAt, userId, quizId

### Enums already defined:
- `CourseVisibility`: EVERYONE, SIGNED_IN
- `AccessRule`: OPEN, ON_INVITATION, ON_PAYMENT
- `EnrollmentStatus`: YET_TO_START, IN_PROGRESS, COMPLETED

### What does NOT exist yet and needs to be added:
- A `Badge` system for the profile panel in B2 — **add schema** (see Section 2.1)
- Learner-facing API routes for course browsing, enrollment, progress, reviews, payment

---

## 2. New Backend API Endpoints Needed

### 2.1 Schema Addition — Badge System

Add these two models to `schema.prisma`. These are new; check they don't exist before adding.

```
BadgeDefinition:
  - id: String @id @default(uuid())
  - name: String          — e.g. "Beginner", "Explorer", "Champion"
  - description: String?  — e.g. "Earned 50 points"
  - iconUrl: String?      — URL to badge image/SVG
  - pointThreshold: Int   — minimum total points to earn this badge
  - createdAt: DateTime @default(now())

UserBadge:
  - id: String @id @default(uuid())
  - userId: String → User relation (onDelete: Cascade)
  - badgeId: String → BadgeDefinition relation
  - earnedAt: DateTime @default(now())
  - @@unique([userId, badgeId])  — a user earns each badge only once
```

Add the relations to User:
```
User:
  - badges UserBadge[]
```

After adding: `npx prisma db push && npx prisma generate`

**Seed at least 4 badge definitions** via a seed script or Prisma Studio for the UI to be meaningful:
- "Beginner" — 0 points — everyone starts here
- "Explorer" — 50 points
- "Achiever" — 150 points
- "Champion" — 300 points

Badge awarding logic: After every `QuizAttempt` is created (in `quiz.service.ts > submitAttempt`), calculate the user's total `pointsEarned` across all attempts, then check if any new `BadgeDefinition` thresholds have been crossed and create `UserBadge` records if so. This is a simple additive check — only award badges not yet earned.

---

### 2.2 New Learner API Routes

Create a new module: `apps/server/src/modules/learner/`

Files needed:
- `learner.router.ts`
- `learner.controller.ts`
- `learner.service.ts`

Mount in `routes/index.ts`: `app.use('/api/learner', learnerRouter)`

All learner routes require `requireAuth` unless marked as **[PUBLIC]**.

#### Course Discovery & Enrollment

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/learner/courses` | [PUBLIC for guests / auth for signed-in] | List published courses filtered by visibility rule |
| GET | `/api/learner/courses/:courseId` | [PUBLIC / auth] | Get single course detail (overview, lessons, sections) |
| POST | `/api/learner/courses/:courseId/enroll` | Required | Enroll in a course (only for OPEN or ON_INVITATION with existing enrollment record) |
| GET | `/api/learner/my-courses` | Required | Get all courses the user is enrolled in, with enrollment status and progress |

#### Lesson Progress

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/learner/courses/:courseId/lessons/:lessonId/complete` | Required | Mark a lesson as completed; update enrollment status if needed |
| GET | `/api/learner/courses/:courseId/progress` | Required | Get the current user's progress for a course (list of completed lesson IDs, % complete) |

#### Reviews

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/learner/courses/:courseId/reviews` | [PUBLIC] | Get all reviews with user name and avatar; also return average rating and count |
| POST | `/api/learner/courses/:courseId/reviews` | Required | Submit a new review (enrolled users only; one per user per course) |
| PATCH | `/api/learner/courses/:courseId/reviews` | Required | Update the user's existing review |
| DELETE | `/api/learner/courses/:courseId/reviews` | Required | Delete the user's own review |

#### Payment (Mock)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/learner/courses/:courseId/payment/mock` | Required | Mock payment — immediately creates enrollment and returns success |

#### Profile & Badges

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/learner/profile` | Required | Get current user's profile: name, email, avatar, total points, current badge, all badge definitions with earned status |

---

### 2.3 Learner Service Logic

#### `listPublishedCourses(userId?: string)`
- Query courses where `isPublished = true`
- Visibility filter:
  - If `userId` is undefined (guest): only return courses with `visibility = EVERYONE`
  - If `userId` is defined (signed-in): return courses with `visibility = EVERYONE` OR `visibility = SIGNED_IN`
- Include: `_count { select: { lessons: true, enrollments: true } }`, instructor name
- If `userId` provided: also join enrollments to get the user's enrollment status per course
- Order by: `createdAt desc`

#### `getCourseDetail(courseId: string, userId?: string)`
- Fetch course with `isPublished = true` guard
- Apply same visibility filter as above
- Include sections (ordered), lessons per section (ordered), lessons not in any section (ordered)
- For each lesson: include `type`, `durationSeconds`, `thumbnailUrl` — do NOT include `streamUrl` or file URLs at this stage (those are served when the lesson is actually opened)
- Include quizzes with `_count { select: { questions: true } }` — this is used to display "X questions" on the detail page
- If `userId` provided: include this user's `LessonProgress` records for this course
- Increment `viewCount` by 1 on every call (fire-and-forget, don't await in the response path — use `prisma.course.update` without awaiting)

#### `enrollInCourse(userId: string, courseId: string)`
- Fetch course, verify `isPublished = true` and `accessRule = OPEN`
- If `accessRule = ON_PAYMENT`: throw 402 "Payment required" — the frontend should have redirected to the payment flow first
- If `accessRule = ON_INVITATION`: throw 403 "Enrollment by invitation only"
- Upsert enrollment: `prisma.enrollment.upsert` — if already exists, return it as-is (idempotent)
- Return the enrollment record

#### `getMyCoursesWithProgress(userId: string)`
- `prisma.enrollment.findMany` where `userId = userId`
- Include: course (with `_count { lessons: true }`, `coverImageUrl`, `title`, `description`, `tags`, `accessRule`, `price`)
- Include: `lessonProgresses { isCompleted: true }` — count completed vs total to compute % and counts
- Compute per-enrollment:
  - `totalLessons` = course._count.lessons
  - `completedLessons` = lessonProgresses.filter(lp => lp.isCompleted).length
  - `incompleteLessons` = totalLessons - completedLessons
  - `progressPct` = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

#### `markLessonComplete(userId: string, courseId: string, lessonId: string)`
- Verify user has an active enrollment for this course
- Upsert `LessonProgress`: `{ enrollmentId, lessonId, userId, isCompleted: true, completedAt: now() }`
- After upserting, check if ALL lessons in the course are now complete:
  - Count total lessons for course
  - Count completed LessonProgress records for this enrollment
  - If equal: update Enrollment `status = COMPLETED`, `completedAt = now()`
  - Else if `enrollment.status = YET_TO_START`: update to `IN_PROGRESS`, `startedAt = now()`
- Return updated progress summary

#### `getCourseProgress(userId: string, courseId: string)`
- Find enrollment for `{ userId, courseId }`
- Get all LessonProgress records for this enrollment
- Return: `{ completedLessonIds: string[], progressPct: number, status: EnrollmentStatus }`

#### `getCourseReviews(courseId: string)`
- `prisma.review.findMany` where `courseId = courseId`
- Include: `user { select: { id, name, avatarUrl } }`
- Order by: `createdAt desc`
- Compute aggregate: average rating, total count
- Return: `{ reviews, averageRating, totalCount }`

#### `submitReview(userId: string, courseId: string, rating: number, reviewText?: string)`
- Verify user has enrollment for this course (throw 403 if not enrolled)
- `prisma.review.upsert` on `@@unique([userId, courseId])`
  - `create`: full review object
  - `update`: just rating and reviewText
- Return the review

#### `getProfile(userId: string)`
- Fetch user record
- Fetch all `BadgeDefinition` records ordered by `pointThreshold asc`
- Fetch all `UserBadge` records for this user
- Compute total points: `prisma.quizAttempt.aggregate({ _sum: { pointsEarned: true }, where: { userId } })`
- Determine current badge: highest threshold badge the user has earned
- Determine next badge: first badge definition above current that has not been earned
- Return: `{ user: { name, email, avatarUrl }, totalPoints, earnedBadgeIds, allBadges, currentBadge, nextBadge }`

#### `mockPayment(userId: string, courseId: string)`
- Verify course exists, `accessRule = ON_PAYMENT`, `isPublished = true`
- Upsert enrollment (same as enroll logic)
- Return: `{ success: true, enrollmentId }`

---

## 3. B1 — Navbar

### Route: Shared layout — `apps/web/app/(learner)/layout.tsx`

The learner section lives under a `(learner)` route group, separate from `(backoffice)`. The layout applies to all learner pages.

### What the Navbar renders:

**Left side:**
- Company/app logo or name — links to `/` (home / my courses)

**Centre or left-aligned navigation:**
- "Courses" dropdown menu — on hover or click, reveals a panel showing all published courses the current user is allowed to see
  - Grouped by: Published courses matching visibility rule
  - Each item: course title, optional cover thumbnail (small), tag pills
  - Clicking a course item navigates to `/courses/:courseId`
  - Guest sees only `visibility = EVERYONE` courses
  - Signed-in user sees EVERYONE + SIGNED_IN courses

**Right side:**
- If guest (not signed in): "Sign In" button → links to `/login`
- If signed in: Username displayed (or avatar if available), clicking shows a small dropdown:
  - "My Courses" → `/my-courses`
  - "Sign Out" → calls sign-out endpoint and redirects to home

### Implementation notes:
- The navbar is a **Server Component** that reads the session server-side to determine guest vs signed-in state
- The Courses dropdown data is fetched server-side at layout render time (or via a client fetch on hover for performance)
- Mark the layout as a **Server Component**; extract the dropdown into a `CoursesDropdown` client component if needed for hover interactivity
- Do NOT use `useSession` hooks in the layout — read session on the server to avoid flash of unauthenticated state

---

## 4. B2 — My Courses Page

### Route: `apps/web/app/(learner)/my-courses/page.tsx`

**Auth required:** Redirect to `/login` if not signed in.

### Layout:

Two-column layout (on desktop). Left column: course list + search. Right column: profile panel.

```
┌────────────────────────────────────┬──────────────────────────┐
│  My Courses (N)                    │  PROFILE PANEL           │
│  [Search input]                    │                          │
│                                    │  [Avatar]  Username      │
│  [Course Card]                     │  Total points: 240 pts   │
│  [Course Card]                     │                          │
│  [Course Card]                     │  BADGES                  │
│  ...                               │  ◉ Beginner    0 pts     │
│                                    │  ◉ Explorer   50 pts  ← current
│                                    │  ○ Achiever  150 pts     │
│                                    │  ○ Champion  300 pts     │
│                                    │                          │
│                                    │  Progress to next badge: │
│                                    │  ████░░░░ 90/150 pts     │
└────────────────────────────────────┴──────────────────────────┘
```

### Course Card (B2):

Each card in the My Courses list displays:

- **Cover image** — full-width top portion of the card; if no cover image, show a placeholder gradient with the course title initial
- **Title** — bold, 2-line clamp
- **Description** — 2-line clamp, muted text
- **Tags** — pill badges, max 3 shown then "+ N more"
- **Progress bar** — full-width horizontal bar; fill % = `progressPct`; show percentage label (e.g. "65%") to the right of the bar
- **Content counts** — three small stat chips below the bar:
  - "X total" (total lessons)
  - "Y completed" (green)
  - "Z incomplete" (amber)
- **CTA button** — state-aware, bottom-right of card:
  - `status = YET_TO_START` + `accessRule = OPEN` → "Start Course" (blue)
  - `status = IN_PROGRESS` → "Continue" (blue)
  - `status = COMPLETED` → "View Course" (green outlined)
  - `accessRule = ON_PAYMENT` + no enrollment → "Buy INR {price}" (amber) — this state shouldn't appear on My Courses (only enrolled courses here) but guard for it
- **Paid badge** — if `accessRule = ON_PAYMENT`, show a small "Paid" label in the top-right corner of the cover image area

### Search bar:
- Plain text input at the top of the course list
- Client-side filter on `course.title` and `course.tags` — no API call
- Debounce: 300ms

### Profile Panel (right column):

- **Avatar**: circular image; if no `avatarUrl` on user, show initials in a coloured circle
- **Username** + **Email** (smaller, muted)
- **Total points**: summed from all quiz attempts
- **Badge list**: all `BadgeDefinition` records shown in order of `pointThreshold`
  - Earned badges: filled/highlighted icon, coloured
  - Unearned badges: greyed out icon
  - Current badge (highest earned): highlighted with a ring or accent colour
- **Progress to next badge**: a labelled progress bar showing `(currentPoints - currentBadgeThreshold) / (nextBadgeThreshold - currentBadgeThreshold)` as percentage; label shows e.g. "90 / 150 pts"
- If the user has reached the top badge: show "Max badge achieved 🎉" instead of the progress bar

### Data fetching:
- `GET /api/learner/my-courses` → course cards
- `GET /api/learner/profile` → profile panel data

Both called in parallel (`Promise.all`) on page mount.

---

## 5. B3 — Course Detail Page

### Route: `apps/web/app/(learner)/courses/[courseId]/page.tsx`

**Auth:** Public for EVERYONE courses; redirect to login for SIGNED_IN courses if guest; redirect/block for ON_INVITATION/ON_PAYMENT if not enrolled.

### Tabs:
- "Course Overview" (default active tab)
- "Ratings & Reviews" (B4)

### Course Overview Tab Layout:

```
┌────────────────────────────────────────────────────────────────────┐
│  [Cover image — full width banner, 300px height]                  │
│  Overlaid bottom-left: Course Title (large)                       │
│  Overlaid bottom-right: [CTA Button]                              │
├────────────────────────────────────────────────────────────────────┤
│  Description (rich text / HTML rendered safely)                   │
├────────────────────────────────────────────────────────────────────┤
│  Progress bar  [████████░░  65%]                                  │
│  X total  •  Y completed  •  Z incomplete                         │
├────────────────────────────────────────────────────────────────────┤
│  CONTENT LIST                    │  QUIZ SUMMARY                  │
│  [Search lessons input]          │  Total questions: 24           │
│                                  │  Multiple attempts: Yes        │
│  Section 1: Introduction         │                                │
│    ✓ Lesson 1 — Intro            │                                │
│    ✓ Lesson 2 — Setup            │                                │
│  Section 2: Core Concepts        │                                │
│    ○ Lesson 3 — Deep Dive        │                                │
│    ○ Lesson 4 — Practice         │                                │
│                                  │                                │
│  (unsectioned lessons below)     │                                │
└────────────────────────────────────────────────────────────────────┘
```

### Cover image banner:
- Full-width, fixed height (around 280–320px), `object-fit: cover`
- If no cover image: gradient background using a consistent hash of the course ID (so it's always the same colour per course)
- Course title overlaid with a dark gradient at the bottom
- CTA button overlaid bottom-right

### CTA Button — state logic:
- Guest viewing an EVERYONE + OPEN course: "Join Course" → clicking redirects to `/login?redirect=/courses/:courseId`
- Signed-in, not enrolled, OPEN: "Join Course" → calls `POST /api/learner/courses/:courseId/enroll` → on success, refreshes page state
- Signed-in, not enrolled, ON_PAYMENT: "Buy INR {price}" → opens payment modal
- Signed-in, enrolled, YET_TO_START: "Start Course" → navigate to first lesson (or mark first lesson as active)
- Signed-in, enrolled, IN_PROGRESS: "Continue" → navigate to first incomplete lesson
- Signed-in, enrolled, COMPLETED: "View Course" (no primary action — just re-read)
- ON_INVITATION with no enrollment: "Enrollment by invitation only" — disabled button, no click action

### Progress bar:
- Only shown for enrolled users
- Guest/non-enrolled users do not see the progress bar section
- Shows: `progressPct`, `totalLessons`, `completedLessons`, `incompleteLessons`

### Content list (lesson list):
- Rendered by section; unsectioned lessons appear after all sections
- Each section is collapsible (default expanded)
- Each lesson row shows:
  - Blue tick icon (✓) if `lessonId` is in `completedLessonIds` from progress API; grey circle (○) if not
  - Lesson title
  - Lesson type icon (tiny): video camera for VIDEO, document icon for DOCUMENT, image icon for IMAGE, quiz icon for QUIZ
  - Duration (HH:MM) if `durationSeconds` is set
  - Clicking a lesson row: only available to enrolled users; guests/non-enrolled see a lock icon; enrolled users navigate to the lesson player page (not in scope for this sprint — just wire the click to navigate to `/courses/:courseId/lessons/:lessonId`)
- Search bar above the list: client-side filter on lesson title; no API call; debounce 300ms

### Quiz summary panel (right side or below on mobile):
- Counts total questions across all quizzes for this course
  - Compute: sum of `quiz._count.questions` from the course detail API response
- "Multiple attempts: Yes" — always true (per your reward system design)
- This panel is informational only — no interaction

---

## 6. B4 — Ratings & Reviews Tab

### Rendered as the second tab on the Course Detail page

### Layout:

```
┌────────────────────────────────────────────────────────────┐
│  AVERAGE RATING                                            │
│                                                            │
│  ★★★★☆  4.2 / 5.0    (48 reviews)                        │
│                                                            │
│  [Add Review button — only for enrolled users]            │
├────────────────────────────────────────────────────────────┤
│  REVIEWS LIST                                              │
│                                                            │
│  [Avatar]  Jane D.                     ★★★★★              │
│            "Great course, very practical."                │
│            March 15, 2026                                 │
│                                                            │
│  [Avatar]  Rahul S.                    ★★★☆☆              │
│            "Good content but needs more examples."        │
│            March 10, 2026                                 │
│                                                            │
│  [Load more — if more than 10 reviews]                    │
└────────────────────────────────────────────────────────────┘
```

### Average rating display:
- Large star display (e.g. 5 stars with partial fill or filled/unfilled)
- Numeric rating: "4.2 / 5.0"
- Count: "(48 reviews)"
- If 0 reviews: "No reviews yet"

### Reviews list:
- Each review card shows:
  - User avatar (circular, initials fallback)
  - User name
  - Star rating (1–5 filled stars)
  - Review text (if provided; some users may submit rating-only reviews)
  - Date formatted as "Month Day, Year"
- Ordered: newest first
- Pagination or "Load more" button if more than 10 reviews — load 10 more on each click (no infinite scroll needed)

### Add Review:
- Button labelled "Add Review" or "Write a Review"
- Visible only to enrolled users; guests and non-enrolled users see either nothing or a muted "Enroll to leave a review" text
- Clicking opens an inline form or modal with:
  - Star selector: 5 interactive stars; clicking star N sets rating to N; required
  - Text area: "Your review (optional)", max 1000 chars
  - Submit button: calls `POST /api/learner/courses/:courseId/reviews`
  - Cancel button: closes form
- If user has already reviewed: button changes to "Edit Review"; the form pre-fills with their existing rating and text; submits `PATCH /api/learner/courses/:courseId/reviews`
- After submit: refresh the reviews list and average rating (re-fetch `GET /api/learner/courses/:courseId/reviews`)

### Guest behaviour:
- Guest sees the reviews list and average rating (the GET endpoint is public)
- Guest does NOT see the "Add Review" button
- No sign-in prompt in the reviews tab itself — just omit the button

---

## 7. Paid Badge + Payment Gate

### "Paid" badge on course cards:

Wherever a course card is rendered (Navbar dropdown, My Courses page, any course listing):
- If `course.accessRule === 'ON_PAYMENT'`: show a small badge/label in the card
- Badge design: small pill, amber/gold colour, text "Paid" or "INR {price}"
- Position: top-right corner of the cover image area
- This is purely a display concern — read `accessRule` and `price` from the course data already fetched

### Payment Gate — Entry points:

Two places trigger the payment flow:
1. Course Detail page CTA button: "Buy INR {price}" (when non-enrolled user views a paid course)
2. Clicking a lesson in the content list on a paid course the user hasn't bought (show lock icon instead of navigating)

### Mock Payment Flow:

Since Razorpay/PayPal integration is out of scope, implement a mock flow:

**Payment Modal:**
- A full-screen modal overlay (not a separate page)
- Header: "Complete your purchase"
- Course title and price displayed prominently
- A styled "card" form — fields for: Card Number (placeholder only, no real validation), Name on Card, Expiry, CVV — these are purely cosmetic, not submitted to any real gateway
- "Pay INR {price}" button
- Clicking the pay button: calls `POST /api/learner/courses/:courseId/payment/mock`
- While loading: button shows "Processing…" with a spinner
- On success (API returns 200): hide the form, show a success screen within the same modal:
  - Green checkmark icon
  - "Payment Successful!"
  - "You have been enrolled in {course title}"
  - "Start Learning →" button → closes modal and refreshes the page (user is now enrolled)
- "Cancel" / close button on the modal: closes without making any API call

**Mock backend behaviour:**
- `POST /api/learner/courses/:courseId/payment/mock` simply upserts an enrollment and returns `{ success: true, enrollmentId }`
- No real payment processing, no webhook, no idempotency key needed

**If real payment gateway is added later:**
- The mock endpoint becomes a "create order" endpoint
- The modal form is replaced by Razorpay's SDK checkout
- On webhook confirmation, the enrollment is created
- The architecture supports this transition — just replace the modal internals

---

## 8. Frontend Routing & Folder Structure

```
apps/web/
└── app/
    └── (learner)/
        ├── layout.tsx                        [NEW] — Learner shell with Navbar
        ├── my-courses/
        │   └── page.tsx                      [NEW] — B2 My Courses
        └── courses/
            └── [courseId]/
                ├── page.tsx                  [NEW] — B3 Course Detail (tabs: Overview + Reviews)
                └── lessons/
                    └── [lessonId]/
                        └── page.tsx          [FUTURE — not in this sprint, just ensure route doesn't 404]

└── components/
    └── learner/
        ├── Navbar.tsx                        [NEW]
        ├── CoursesDropdown.tsx               [NEW] — Courses menu dropdown
        ├── CourseCard.tsx                    [NEW] — Learner-facing card (different from backoffice card)
        ├── ProfilePanel.tsx                  [NEW] — Badge + points sidebar
        ├── BadgeList.tsx                     [NEW] — Badge grid/list within profile panel
        ├── CourseOverviewTab.tsx             [NEW] — Overview tab content
        ├── LessonList.tsx                    [NEW] — Sections + lessons with tick icons
        ├── ReviewsTab.tsx                    [NEW] — Ratings & reviews tab
        ├── StarRating.tsx                    [NEW] — Reusable star display/input component
        ├── ReviewForm.tsx                    [NEW] — Add/edit review modal or inline form
        ├── PaymentModal.tsx                  [NEW] — Mock payment flow
        └── ProgressBar.tsx                  [NEW] — Reusable labelled progress bar

└── lib/
    └── api/
        └── learner.ts                        [NEW] — All learner API helpers
```

**Important:** The `(learner)` route group is separate from the `(backoffice)` route group. They share the same Next.js app but have different layouts. Do not nest one inside the other.

---

## 9. Shared Learner API Helpers

File: `apps/web/lib/api/learner.ts`

Implement these typed async functions. All call the `/api/learner/` prefix. All pass auth credentials (`credentials: 'include'` or bearer token, matching your existing pattern).

### Types to define in this file:

```typescript
interface LearnerCourse {
  id: string
  title: string
  description: string | null
  coverImageUrl: string | null
  tags: string[]
  accessRule: 'OPEN' | 'ON_INVITATION' | 'ON_PAYMENT'
  price: number | null
  visibility: 'EVERYONE' | 'SIGNED_IN'
  _count: { lessons: number }
  enrollment?: {
    id: string
    status: 'YET_TO_START' | 'IN_PROGRESS' | 'COMPLETED'
    progressPct: number
    completedLessons: number
    incompleteLessons: number
  }
}

interface CourseDetail extends LearnerCourse {
  sections: Array<{
    id: string
    title: string
    order: number
    lessons: LessonSummary[]
  }>
  unsectionedLessons: LessonSummary[]
  quizzes: Array<{
    id: string
    _count: { questions: number }
  }>
  instructor: { id: string; name: string }
}

interface LessonSummary {
  id: string
  title: string
  type: 'VIDEO' | 'DOCUMENT' | 'IMAGE' | 'QUIZ'
  order: number
  durationSeconds: number | null
  isCompleted: boolean   // injected by API based on user's LessonProgress
}

interface CourseProgress {
  completedLessonIds: string[]
  progressPct: number
  status: 'YET_TO_START' | 'IN_PROGRESS' | 'COMPLETED'
}

interface Review {
  id: string
  rating: number
  reviewText: string | null
  createdAt: string
  user: { id: string; name: string; avatarUrl: string | null }
}

interface ReviewsResponse {
  reviews: Review[]
  averageRating: number
  totalCount: number
}

interface UserProfile {
  user: { id: string; name: string; email: string; avatarUrl: string | null }
  totalPoints: number
  earnedBadgeIds: string[]
  allBadges: Array<{
    id: string
    name: string
    description: string | null
    iconUrl: string | null
    pointThreshold: number
    earned: boolean
  }>
  currentBadge: { id: string; name: string; pointThreshold: number } | null
  nextBadge: { id: string; name: string; pointThreshold: number } | null
}
```

### Functions to implement:

| Function | Description |
|----------|-------------|
| `fetchPublishedCourses()` | GET `/api/learner/courses` — used in Navbar dropdown |
| `fetchMyCourses()` | GET `/api/learner/my-courses` |
| `fetchCourseDetail(courseId)` | GET `/api/learner/courses/:courseId` |
| `enrollInCourse(courseId)` | POST `/api/learner/courses/:courseId/enroll` |
| `fetchCourseProgress(courseId)` | GET `/api/learner/courses/:courseId/progress` |
| `markLessonComplete(courseId, lessonId)` | POST `.../lessons/:lessonId/complete` |
| `fetchCourseReviews(courseId)` | GET `/api/learner/courses/:courseId/reviews` |
| `submitReview(courseId, { rating, reviewText })` | POST `.../reviews` |
| `updateReview(courseId, { rating, reviewText })` | PATCH `.../reviews` |
| `deleteReview(courseId)` | DELETE `.../reviews` |
| `fetchProfile()` | GET `/api/learner/profile` |
| `mockPayment(courseId)` | POST `/api/learner/courses/:courseId/payment/mock` |

---

## 10. Implementation Order

```
STEP 1 — Schema addition for badges (~10 min)
  └─ Add BadgeDefinition and UserBadge models to schema.prisma
  └─ Add badges relation to User model
  └─ Run: npx prisma db push && npx prisma generate
  └─ Seed 4 badge definitions in Prisma Studio or a seed script

STEP 2 — Learner service: course discovery (~20 min)
  └─ Implement: listPublishedCourses (with visibility filter), getCourseDetail
  └─ Test via curl:
       GET /api/learner/courses (no auth) → only EVERYONE courses
       GET /api/learner/courses (with auth) → EVERYONE + SIGNED_IN courses
       GET /api/learner/courses/:courseId → full detail with sections, lessons, quizzes

STEP 3 — Learner service: enrollment (~15 min)
  └─ Implement: enrollInCourse, getMyCoursesWithProgress
  └─ Test: enroll in an OPEN course → appears in /my-courses with 0% progress
  └─ Test: enroll in ON_PAYMENT course without payment → 402 error

STEP 4 — Learner service: lesson progress (~15 min)
  └─ Implement: markLessonComplete, getCourseProgress
  └─ Test: mark 2 of 5 lessons complete → progress = 40% → status = IN_PROGRESS
  └─ Test: mark all lessons complete → status = COMPLETED, completedAt set

STEP 5 — Learner service: reviews (~15 min)
  └─ Implement: getCourseReviews, submitReview, updateReview, deleteReview
  └─ Test: submit review as enrolled user → appears in list with correct average
  └─ Test: submit review as non-enrolled → 403 error
  └─ Test: submit second review from same user → updates existing (upsert)

STEP 6 — Learner service: profile + badges (~20 min)
  └─ Implement: getProfile
  └─ Add badge award logic to submitAttempt in quiz.service.ts
  └─ Test: earn 60 points via quiz → profile shows "Explorer" badge earned
  └─ Test: getProfile returns all badge definitions with correct earned status

STEP 7 — Mock payment service (~10 min)
  └─ Implement: mockPayment
  └─ Test: POST /api/learner/courses/:courseId/payment/mock → creates enrollment
  └─ Test: calling again is idempotent (returns existing enrollment)

STEP 8 — Frontend: learner.ts API helpers (~20 min)
  └─ Implement all typed fetch functions with correct TypeScript types
  └─ Test in browser console: fetchPublishedCourses() returns expected shape

STEP 9 — Frontend: Navbar (~30 min)
  └─ Build layout.tsx with Navbar component
  └─ Build CoursesDropdown (fetch published courses, show per visibility rule)
  └─ Wire auth state: guest shows Sign In, signed-in shows username + dropdown
  └─ Test: sign out → only EVERYONE courses visible in dropdown
  └─ Test: sign in → SIGNED_IN courses also appear

STEP 10 — Frontend: My Courses page — Course Cards (~35 min)
  └─ Build my-courses/page.tsx
  └─ Build CourseCard component with all states (cover, title, desc, tags, progress bar, stat chips, CTA button)
  └─ Wire to fetchMyCourses()
  └─ Test: enrolled course with 40% progress → progress bar shows 40%, correct counts displayed
  └─ Test: search filters cards client-side

STEP 11 — Frontend: My Courses page — Profile Panel (~25 min)
  └─ Build ProfilePanel component with avatar, points, badge list, progress to next badge
  └─ Wire to fetchProfile()
  └─ Test: user with 90 points → Explorer badge highlighted, progress bar shows 90/150 pts
  └─ Test: user at max badge → "Max badge achieved" shown

STEP 12 — Frontend: Course Detail — Overview Tab (~40 min)
  └─ Build courses/[courseId]/page.tsx with tab structure
  └─ Build CourseOverviewTab with cover banner + CTA, description, progress bar, content list, quiz summary
  └─ Build LessonList with section collapsibles, tick icons, search
  └─ Wire to fetchCourseDetail() + fetchCourseProgress()
  └─ Test: guest views course → no progress bar, lessons have lock icon, CTA = "Join Course" → redirect to login
  └─ Test: enrolled user → tick icons on completed lessons, CTA = "Continue"

STEP 13 — Frontend: Course Detail — Join/Enroll flow (~15 min)
  └─ Wire "Join Course" button to enrollInCourse() API
  └─ On success: refresh page state so CTA changes to "Start Course"
  └─ Test: click Join → page refreshes → button now shows "Start Course"

STEP 14 — Frontend: Reviews Tab (~30 min)
  └─ Build ReviewsTab component with average rating display + star UI + reviews list
  └─ Build StarRating reusable component (display mode + interactive mode)
  └─ Build ReviewForm (inline or modal)
  └─ Wire to fetchCourseReviews(), submitReview(), updateReview()
  └─ Test: guest views reviews → no Add Review button
  └─ Test: enrolled user submits review → list refreshes with new review + updated average
  └─ Test: same user edits review → form pre-fills, PATCH called

STEP 15 — Frontend: Payment Modal (~25 min)
  └─ Build PaymentModal with cosmetic card form + pay button
  └─ Wire to mockPayment() API
  └─ On success: show confirmation screen, then "Start Learning" closes modal + refreshes page
  └─ Test: click "Buy INR 500" on paid course → modal opens → pay → confirmation → enrolled

STEP 16 — End-to-end smoke test (~20 min)
  └─ As guest: browse courses, see only EVERYONE courses, try to join → redirect to login
  └─ Sign in: join a free course, mark lessons complete, progress bar updates
  └─ Submit quiz attempt: check badge earned in profile
  └─ Submit review, check average updates
  └─ As guest: view a paid course card → "Paid" badge visible → click buy → redirected to login
  └─ Sign in, mock pay a paid course → enrolled, start learning
```

---

## 11. Edge Cases & Validation Rules

### Visibility & Access Guard

- A guest making a direct URL request to `/courses/:courseId` for a `SIGNED_IN` course: redirect to `/login?redirect=...`
- A signed-in user accessing an `ON_INVITATION` course they are not enrolled in: show a "This course is by invitation only" message, no CTA button
- `isPublished = false`: return 404 from the learner API regardless of visibility — unpublished courses are invisible to learners
- Admin/Instructor viewing a course via the learner URL: should work normally (they can also be learners); do not exclude them based on role

### Enrollment idempotency

- Calling enroll on an already-enrolled course must return the existing enrollment, not a duplicate (use `upsert`)
- The CTA button must handle the case where the user is already enrolled but the frontend didn't know (e.g. after page refresh mid-session)

### Progress computation

- A course with 0 lessons: `progressPct = 0`, CTA should still work (joining enrolls the user; all lessons complete immediately in theory — treat as 100% if 0 lessons)
- Lessons added to a course after a user enrolled: those new lessons count as incomplete in progress computation — `totalLessons` is the live count, not the count at enrollment time

### Review constraints

- A user can only have one review per course — enforced by `@@unique([userId, courseId])` in schema
- Minimum rating: 1 star; maximum: 5 stars — validate in Zod schema and service
- Review text: optional, max 1000 chars — validate in Zod
- Average rating computation: use `prisma.review.aggregate({ _avg: { rating: true } })` server-side, not computed on frontend

### Badge awarding

- Badge award check happens after every `QuizAttempt` creation — run it async (do not await in the attempt response path to keep latency low)
- Each badge awarded only once per user — `@@unique([userId, badgeId])` prevents duplicates
- If a user earns multiple new badges in one attempt (e.g. jumps from 40 to 200 points), award all of them

### Payment

- Mock payment endpoint is idempotent: calling it twice for the same user + course creates only one enrollment
- Do not expose the mock endpoint on production — add an env flag check: `if (process.env.PAYMENT_MOCK_ENABLED !== 'true') return res.status(404).json({ message: 'Not found' })`

### Star rating component

- Interactive mode (for review form): hovering a star previews that rating; clicking locks it
- Display mode (for review list): renders static filled/empty/half stars; accepts a float (e.g. 4.2) and renders partial fill on the last fractional star
- Build as a single `<StarRating value={n} interactive={bool} onChange={fn} />` component to avoid duplication

---

*End of LEARNER_FRONTEND_PLAN.md — Estimated implementation time: ~5 hours (backend ~1.5h, frontend ~3.5h)*
