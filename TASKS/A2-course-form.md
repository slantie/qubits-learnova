# Task: A2 — Course Form (Edit Course)

**Route:** `/backoffice/courses/:courseId/edit`
**Access:** ADMIN, INSTRUCTOR (own course)

## Overview
The main configuration page for a course. Has a header with publishing controls and attendee management, course metadata fields, and four tabs: Content, Description, Options, Quiz.

---

## Backend

### API Endpoints

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/courses/:id` | ADMIN, INSTRUCTOR | Get full course detail for editing |
| PATCH | `/api/courses/:id` | ADMIN, INSTRUCTOR (own) | Update course fields |
| PATCH | `/api/courses/:id/publish` | ADMIN, INSTRUCTOR (own) | Toggle `isPublished` |
| POST | `/api/courses/:id/cover` | ADMIN, INSTRUCTOR (own) | Upload cover image (multipart) |
| POST | `/api/courses/:id/attendees` | ADMIN, INSTRUCTOR (own) | Enroll learners by email list |
| POST | `/api/courses/:id/contact` | ADMIN, INSTRUCTOR (own) | Send bulk email to enrolled learners |

---

### `GET /api/courses/:id`

**Logic:**
- Fetch course with relations: `lessons` (ordered), `quizzes`, `enrollments._count`
- If `role === INSTRUCTOR` and `course.instructorId !== req.user.id` → 403

**Response shape:**
```ts
{
  id, title, tags, description, coverImage,
  isPublished, visibility, accessRule, price,
  websiteUrl, courseAdminId,
  lessons: { id, title, type, order, duration }[]
  quizzes: { id, title }[]
  enrollmentCount: number
}
```

---

### `PATCH /api/courses/:id`

**Body (all optional):**
```ts
{
  title?: string
  tags?: string[]
  description?: string    // HTML
  websiteUrl?: string
  courseAdminId?: number | null
}
```
**Logic:** Validate, update only provided fields, return updated course.

---

### `PATCH /api/courses/:id/publish`

**Body:** `{ isPublished: boolean }`

**Business rule:** If `isPublished === true`, `websiteUrl` must be set — return 422 if missing.

---

### `POST /api/courses/:id/cover`

- Multer middleware (`multipart/form-data`, field `cover`)
- Allowed MIME: `image/jpeg`, `image/png`, `image/webp`
- Max size: `MAX_FILE_SIZE_MB`
- Save to `UPLOAD_DIR/covers/`, return `{ coverImage: "/uploads/covers/filename.webp" }`

---

### `POST /api/courses/:id/attendees`

**Body:** `{ emails: string[] }`

**Logic:**
- For each email:
  - Find user by email, create if not exists (send invite email via Nodemailer with temp password)
  - Upsert `Enrollment` for `{ userId, courseId }` — skip if already enrolled
- Return `{ enrolled: number, alreadyEnrolled: number, invited: number }`

---

### `POST /api/courses/:id/contact`

**Body:** `{ subject: string, body: string }`

**Logic:**
- Fetch all enrolled user emails for the course
- Send bulk email via Nodemailer (BCC all, or loop individually)
- Return `{ sent: number }`

---

## Frontend

### Page: `app/(backoffice)/backoffice/courses/[courseId]/edit/page.tsx`

**On mount:** `GET /api/courses/:courseId` → populate all form state

#### State
```ts
const [course, setCourse] = useState<CourseDetail | null>(null)
const [activeTab, setActiveTab] = useState<'content' | 'description' | 'options' | 'quiz'>('content')
const [isSaving, setIsSaving] = useState(false)
```

#### Auto-save
- Debounce `PATCH /api/courses/:id` 800ms on any field change (title, tags, description, websiteUrl)

---

### Components

#### `components/backoffice/course-form/CourseFormHeader.tsx`
Renders the top action bar:
- **Back** link → `/backoffice/courses`
- Course title (inline editable `<input>`)
- **Publish on Website** — shadcn `Switch`, calls `PATCH /api/courses/:id/publish`
  - If turning on and `websiteUrl` is empty → show validation toast, don't toggle
- **Preview** button → opens `/courses/:websiteUrl` in new tab
- **Add Attendees** button → opens `<AddAttendeesModal />`
- **Contact Attendees** button → opens `<ContactAttendeesModal />`

---

#### `components/backoffice/course-form/CourseMetaFields.tsx`
- **Tags** — multi-tag input (type tag + Enter to add, × to remove)
- **Website URL** — text input with `FRONTEND_URL/courses/` prefix hint
- **Course Admin** — user search select (fetches `GET /api/users?role=INSTRUCTOR,ADMIN`)
- **Cover Image** — drag-and-drop upload zone, preview thumbnail, calls `POST /api/courses/:id/cover`

---

#### Tabs (shadcn `Tabs` component)

**Content Tab** → renders `<LessonsManager />` (see `A3`)

**Description Tab**
- Rich text editor for course-level description
- Use a lightweight WYSIWYG (e.g., `@base-ui/react` + Tiptap, or a `<textarea>` with markdown if full editor not available)
- Auto-saves HTML to `PATCH /api/courses/:id` → `description`

**Options Tab** → renders `<CourseOptions />` (see `A5`)

**Quiz Tab** → renders `<QuizList />` (see `A6`)

---

#### `components/backoffice/course-form/AddAttendeesModal.tsx`
- shadcn `Dialog`
- Multi-email input (comma or newline separated)
- Submit → `POST /api/courses/:id/attendees`
- Show result: "3 enrolled, 1 already enrolled, 2 invited by email"

---

#### `components/backoffice/course-form/ContactAttendeesModal.tsx`
- shadcn `Dialog`
- Subject + body textarea
- Submit → `POST /api/courses/:id/contact`
- Show "Email sent to X learners"

---

### Routing
- Page loads `courseId` from `useParams()`
- Tab state preserved in URL query param `?tab=content` for shareable links
