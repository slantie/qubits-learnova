# Task: B3 — Course Detail Page

**Route:** `/courses/:courseId`
**Access:** All (guests can view; learners can track progress)

## Overview
Detailed view of a single course. Shows cover image, title, description, progress stats, and an ordered lesson list with completion status icons. Has two tabs: Overview and Ratings & Reviews.

---

## Backend

### API Endpoints

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/courses/public/:courseId` | All | Full course detail with learner progress |

---

### `GET /api/courses/public/:courseId`

**Logic:**
- Check course `isPublished = true` → 404 if not
- Check visibility: if `SIGNED_IN` and user not authenticated → 403
- If authenticated: join `Enrollment` + `LessonProgress` for this user

**Response:**
```ts
{
  id: number
  title: string
  coverImage: string | null
  description: string | null
  tags: string[]
  accessRule: AccessRule
  price: number | null
  lessons: {
    id: number
    title: string
    type: LessonType
    order: number
    duration: number | null
    // attachments excluded here — loaded in lesson player
    progress: {
      isCompleted: boolean
    } | null   // null if not enrolled
  }[]
  enrollment: {
    status: EnrollmentStatus
    completedLessons: number
    totalLessons: number
    completionPercent: number
  } | null
  averageRating: number | null
  reviewCount: number
}
```

---

## Frontend

### Page: `app/(website)/courses/[courseId]/page.tsx`

#### State
```ts
const [course, setCourse] = useState<CourseDetail | null>(null)
const [activeTab, setActiveTab] = useState<'overview' | 'reviews'>('overview')
const [lessonSearch, setLessonSearch] = useState('')
```

#### On mount
- `GET /api/courses/public/:courseId` → populate `course`
- If 403 (signed-in only) and user is guest → show "Login to view this course" prompt

---

### Layout

```
[Cover Image — full width hero]
[Course Title]
[Tags]
[CTA Button — same state-aware logic as B2]

[Tab bar: Overview | Ratings & Reviews]

[Tab content]
```

---

### Components

#### `components/website/course-detail/CourseHero.tsx`
- Full-width cover image (or gradient fallback)
- Overlaid: course title, tags, CTA button
- Average star rating + review count (e.g., ★ 4.5 · 32 reviews)

---

#### `components/website/course-detail/CourseOverviewTab.tsx`

**Progress Section** (only shown if enrolled):
```
[Progress Bar — completion %]
Total: 12 lessons  |  Completed: 5  |  Remaining: 7
```

**Description Section:**
- Renders `course.description` as HTML (use `dangerouslySetInnerHTML` or a sanitiser like `dompurify`)

**Lesson List Section:**
- **Search lessons** — inline text input filters list by title (client-side)
- Ordered list of lessons
- Each lesson row = `<LessonRow />`

---

#### `components/website/course-detail/LessonRow.tsx`

Per lesson:
- **Status icon** (left):
  - `isCompleted = true` → blue filled checkmark (Lucide `CheckCircle2`, blue)
  - Current lesson (in-progress) → filled dot (Lucide `Circle`, accent)
  - Not started → empty circle
- **Lesson type icon** (small, muted): Play / FileText / Image / ClipboardList
- **Title** — clickable → navigates to `/courses/:courseId/lessons/:lessonId`
- **Duration** — shown for VIDEO type (right-aligned)

Clicking a lesson:
- If enrolled (or `accessRule = OPEN` and authenticated): navigate to lesson player
- If `ON_INVITATION` and not enrolled: show toast "You must be invited to access this course"
- If `ON_PAYMENT` and not purchased: show "Buy this course to access lessons"

---

#### Progress Bar: `components/shared/ProgressBar.tsx`
```ts
interface ProgressBarProps {
  percent: number   // 0-100
  label?: string    // e.g. "42% complete"
  color?: string    // defaults to brand accent
}
```

---

#### Ratings & Reviews Tab
→ See task `B4-ratings-reviews.md`

---

### CTA Button (same logic as B2, re-used component)

Additionally:
- If `accessRule = ON_PAYMENT` and not purchased: "Buy Course — $X.XX"
- On "Start" click: `POST /api/enrollments { courseId }` → navigate to first lesson

---

### SEO / Metadata
- Next.js `generateMetadata` for this page:
  ```ts
  export async function generateMetadata({ params }) {
    // fetch course title + description for OG tags
    return { title: course.title, description: ... }
  }
  ```
