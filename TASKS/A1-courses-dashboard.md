# Task: A1 — Courses Dashboard (Backoffice)

**Route:** `/backoffice/courses`
**Access:** ADMIN, INSTRUCTOR

## Overview
Central landing page of the backoffice. Lists all courses created by the instructor (or all courses for Admin). Supports Kanban view, List view, real-time search, and course creation.

---

## Backend

### API Endpoints

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/courses` | ADMIN, INSTRUCTOR | List courses (instructor sees own; admin sees all) |
| POST | `/api/courses` | ADMIN, INSTRUCTOR | Create a new course (name only) |
| DELETE | `/api/courses/:id` | ADMIN, INSTRUCTOR (own) | Delete a course |
| POST | `/api/courses/:id/share-link` | ADMIN, INSTRUCTOR | Generate/return shareable learner URL |

---

### `GET /api/courses`

**Query params:** `search?: string`

**Logic:**
- If `role === INSTRUCTOR`: filter `where { instructorId: req.user.id }`
- If `role === ADMIN`: no filter
- Apply `search` as case-insensitive `title` contains filter
- Return each course with computed fields:
  - `lessonCount` — count of lessons
  - `totalDuration` — sum of `lesson.duration` (seconds)
  - `isPublished`
  - `tags`

**Response shape:**
```ts
{
  courses: {
    id: number
    title: string
    tags: string[]
    isPublished: boolean
    lessonCount: number
    totalDuration: number  // seconds
    coverImage: string | null
    createdAt: string
  }[]
}
```

---

### `POST /api/courses`

**Body:** `{ title: string }`

**Logic:**
- Validate `title` non-empty (zod)
- Create course with `instructorId = req.user.id`, all other fields defaulted
- Return created course id + title

---

### `DELETE /api/courses/:id`

**Logic:**
- Find course by id
- If `role === INSTRUCTOR` and `course.instructorId !== req.user.id` → 403
- Delete (cascade deletes lessons, quizzes, enrollments via Prisma `onDelete: Cascade`)

---

### `POST /api/courses/:id/share-link`

**Logic:**
- Verify course exists and requester has access
- Return `{ url: "${FRONTEND_URL}/courses/${course.websiteUrl || course.id}" }`

---

## Frontend

### Page: `app/(backoffice)/backoffice/courses/page.tsx`

#### State
```ts
const [view, setView] = useState<'kanban' | 'list'>('kanban')
const [search, setSearch] = useState('')
const [courses, setCourses] = useState<Course[]>([])
const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
```

#### Data Fetching
- `GET /api/courses?search={search}` — debounced 300ms on search input
- Refetch after course creation

---

### Components

#### `components/backoffice/courses/CoursesDashboard.tsx`
Top-level shell. Renders:
- Header: title "Courses", view toggle (Kanban/List), Search input, `+` Create button
- Conditional: `<KanbanView />` or `<ListView />`
- `<CreateCourseModal />`

---

#### `components/backoffice/courses/KanbanView.tsx`
- Columns: **Draft** (isPublished=false) and **Published** (isPublished=true)
- Maps courses into the appropriate column
- Renders `<CourseCard />` for each course

---

#### `components/backoffice/courses/CourseCard.tsx`
Displays:
- Cover image (placeholder if none)
- Title
- Tags as badges
- Published badge (green pill) if `isPublished`
- Total lessons count + formatted duration (e.g. "3h 20m")
- Action buttons: **Edit** (→ `/backoffice/courses/:id/edit`) | **Share** (copies URL to clipboard) | **Delete** (confirmation dialog)

---

#### `components/backoffice/courses/ListView.tsx`
shadcn `Table` with columns:
| Column | Content |
|--------|---------|
| Title | Course name |
| Tags | Comma-separated |
| Lessons | Count |
| Duration | Formatted |
| Status | Published / Draft badge |
| Actions | Edit / Share / Delete icons |

Sortable by: Title, Lessons, Status (client-side sort).

---

#### `components/backoffice/courses/CreateCourseModal.tsx`
- shadcn `Dialog`
- Single input: Course Name
- Disabled submit if empty
- On submit: `POST /api/courses` → close modal → optimistic add to list
- Shows error toast if API fails

---

### Utility: `lib/formatDuration.ts`
```ts
export function formatDuration(seconds: number): string {
  // Returns "2h 15m" or "45m" or "30s"
}
```

---

### Navigation
- Clicking **Edit** on any card navigates to `/backoffice/courses/[id]/edit`
- **Share** copies `navigator.clipboard.writeText(url)` and shows a toast "Link copied!"
- **Delete** opens a shadcn `AlertDialog` for confirmation before calling `DELETE /api/courses/:id`
