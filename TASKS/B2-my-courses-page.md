# Task: B2 — My Courses Page

**Route:** `/courses`
**Access:** All (guests see open/everyone courses; learners see enrolled courses)

## Overview
The learner's primary dashboard. Shows published course cards with state-aware CTA buttons, real-time search, and a profile panel (for logged-in learners) showing points, badge, and badge progress.

---

## Backend

### API Endpoints

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/courses/public` | All | List published courses with enrollment status for current user |
| GET | `/api/users/me/profile` | Authenticated | Get learner's points, badge, next badge progress |

---

### `GET /api/courses/public`

**Query params:** `search?: string`

**Logic:**
- Always filter: `isPublished = true`
- If guest (no token): also filter `visibility = 'EVERYONE'`
- If authenticated: return all published courses (`EVERYONE` + `SIGNED_IN`)
- For each course, if user is authenticated: join `Enrollment` to get `status` and `enrolledAt`
- Return `accessRule` so client can determine CTA button state

**Response:**
```ts
{
  courses: {
    id: number
    title: string
    tags: string[]
    description: string | null
    coverImage: string | null
    accessRule: AccessRule
    price: number | null
    enrollment: {
      status: EnrollmentStatus | null   // null if not enrolled
    } | null
  }[]
}
```

---

### `GET /api/users/me/profile`

**Logic:**
- Return authenticated user's: `totalPoints`, `currentBadge`
- Compute `nextBadge` and `pointsToNextBadge` using `BADGE_THRESHOLDS`
- Compute `badgeProgressPercent` = `(totalPoints - currentThreshold) / (nextThreshold - currentThreshold) × 100`

**Response:**
```ts
{
  name: string
  email: string
  totalPoints: number
  currentBadge: string | null
  nextBadge: string | null
  pointsToNextBadge: number | null
  badgeProgressPercent: number
}
```

---

## Frontend

### Page: `app/(website)/courses/page.tsx`

#### State
```ts
const [courses, setCourses] = useState<PublicCourse[]>([])
const [search, setSearch] = useState('')
const [profile, setProfile] = useState<UserProfile | null>(null)
```

#### On mount
- `GET /api/courses/public` → populate `courses`
- If authenticated: `GET /api/users/me/profile` → populate `profile`

---

### Layout
```
[Search Bar]
[Profile Panel (right sidebar, only if logged in)] | [Course Cards Grid]
```

On mobile: Profile Panel collapses above the cards.

---

### Components

#### `components/website/courses/CourseGrid.tsx`
- CSS Grid: 1 col mobile, 2 col tablet, 3 col desktop
- Maps courses to `<CourseCard />`
- Shows "No courses found" empty state when search yields no results

---

#### `components/website/courses/CourseCard.tsx`

**Displays:**
- Cover image (with fallback gradient placeholder)
- Title
- Tags (up to 3 pills, "+ N more" if excess)
- Short description (clamped to 2 lines)
- **CTA Button** (state-aware — see below)

**CTA Button states:**
```ts
function getCTALabel(course: PublicCourse, isAuthenticated: boolean): string {
  if (!isAuthenticated) return 'Join Course'                              // guest
  if (course.accessRule === 'ON_PAYMENT' && !course.enrollment) return 'Buy Course'
  if (!course.enrollment || course.enrollment.status === 'NOT_STARTED') return 'Start'
  if (course.enrollment.status === 'IN_PROGRESS') return 'Continue'
  if (course.enrollment.status === 'COMPLETED') return 'View Course'
  return 'Start'
}
```

**CTA button actions:**
- `Join Course` → navigate to `/login`
- `Buy Course` → navigate to `/courses/:id` (payment flow on detail page)
- `Start` → `POST /api/enrollments` (enroll if not enrolled) → navigate to first lesson
- `Continue` → navigate to last accessed lesson
- `View Course` → navigate to `/courses/:id`

Clicking the **card title or image** always navigates to `/courses/:id`.

---

#### `components/website/courses/SearchBar.tsx`
- Debounced 300ms search input
- Updates `search` state → re-fetches `GET /api/courses/public?search={query}`
- Placeholder: "Search courses..."

---

#### `components/website/courses/ProfilePanel.tsx`

Only rendered for authenticated users.

**Displays:**
- User avatar (initials circle)
- User name
- **Total Points** — large number display
- **Current Badge** — colored badge icon + name
  - If no badge yet: "No badge yet — keep learning!"
- **Badge Progress Bar** — `shadcn Progress` component
  - Label: "X points to [NextBadge]"
  - Shows full if at max badge (Master)

**Badge colors:**
| Badge | Color |
|-------|-------|
| Newbie | Brown `#8B4513` |
| Explorer | Blue `#3B82F6` |
| Achiever | Green `#22C55E` |
| Specialist | Purple `#A855F7` |
| Expert | Orange `#F97316` |
| Master | Red `#EF4444` |

---

### Enrollment API

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/api/enrollments` | Authenticated | Enroll in a course |

**`POST /api/enrollments`**

**Body:** `{ courseId: number }`

**Logic:**
- Check course `accessRule`:
  - `OPEN` → create enrollment with `status = NOT_STARTED`
  - `ON_INVITATION` → check if user is already enrolled → if not, 403 "You must be invited to join this course"
  - `ON_PAYMENT` → 402 "Payment required" (payment flow TBD)
- If already enrolled → return existing enrollment (no duplicate)
- Return `{ enrollmentId, courseId, status }`
