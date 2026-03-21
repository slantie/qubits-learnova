# Task: A3 — Lessons / Content Management

**Location:** `/backoffice/courses/:courseId/edit` → Content Tab
**Access:** ADMIN, INSTRUCTOR (own course)

## Overview
The Content tab lists all lessons for a course in order, with type icons and per-lesson actions (Edit, Delete). Supports adding new lessons and reordering.

---

## Backend

### API Endpoints

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/courses/:courseId/lessons` | ADMIN, INSTRUCTOR | List all lessons for a course (ordered) |
| POST | `/api/courses/:courseId/lessons` | ADMIN, INSTRUCTOR (own) | Create a new lesson |
| PATCH | `/api/courses/:courseId/lessons/reorder` | ADMIN, INSTRUCTOR (own) | Reorder lessons |
| GET | `/api/courses/:courseId/lessons/:lessonId` | ADMIN, INSTRUCTOR | Get single lesson detail |
| PATCH | `/api/courses/:courseId/lessons/:lessonId` | ADMIN, INSTRUCTOR (own) | Update lesson |
| DELETE | `/api/courses/:courseId/lessons/:lessonId` | ADMIN, INSTRUCTOR (own) | Delete lesson |
| POST | `/api/courses/:courseId/lessons/:lessonId/file` | ADMIN, INSTRUCTOR (own) | Upload lesson file (document/image) |

---

### `GET /api/courses/:courseId/lessons`

**Logic:**
- Verify course ownership (INSTRUCTOR) or admin
- Return lessons ordered by `order` ASC
- Include `attachments` count per lesson

**Response:**
```ts
{
  lessons: {
    id: number
    title: string
    type: LessonType   // VIDEO | DOCUMENT | IMAGE | QUIZ
    order: number
    duration: number | null  // seconds
    videoUrl: string | null
    filePath: string | null
    allowDownload: boolean
    attachmentsCount: number
  }[]
}
```

---

### `POST /api/courses/:courseId/lessons`

**Body:**
```ts
{
  title: string
  type: LessonType
  order?: number  // defaults to last position
}
```

**Logic:**
- If `order` not provided: `MAX(order) + 1` for this course
- Create lesson, return full lesson object

---

### `PATCH /api/courses/:courseId/lessons/reorder`

**Body:** `{ lessonIds: number[] }` — ordered array of all lesson IDs

**Logic:**
- Verify all lesson IDs belong to the course
- Bulk update `order` field using index position
- Use Prisma `$transaction` for atomicity

---

### `PATCH /api/courses/:courseId/lessons/:lessonId`

**Body (all optional):**
```ts
{
  title?: string
  type?: LessonType
  videoUrl?: string
  duration?: number
  allowDownload?: boolean
  description?: string
  responsibleId?: number | null
}
```

**Logic:** Update only provided fields, return updated lesson.

---

### `DELETE /api/courses/:courseId/lessons/:lessonId`

**Logic:**
- Delete lesson (cascades attachments and lesson progress via Prisma)
- Re-sequence remaining lesson `order` values

---

### `POST /api/courses/:courseId/lessons/:lessonId/file`

- Multer middleware, field `file`
- Allowed MIME (DOCUMENT): `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.*`, etc.
- Allowed MIME (IMAGE): `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- Save to `UPLOAD_DIR/lessons/`, update `filePath` on lesson
- Return `{ filePath: "/uploads/lessons/filename.ext" }`

---

## Frontend

### Component: `components/backoffice/course-form/LessonsManager.tsx`

Rendered inside the Content Tab of the Course Form.

#### State
```ts
const [lessons, setLessons] = useState<Lesson[]>([])
const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
const [isEditorOpen, setIsEditorOpen] = useState(false)
const [isCreating, setIsCreating] = useState(false)
```

#### On mount
- `GET /api/courses/:courseId/lessons` → populate `lessons`

---

### Sub-components

#### `components/backoffice/course-form/LessonList.tsx`
- Ordered list with drag-and-drop reorder (use HTML5 drag API or a library like `@hello-pangea/dnd`)
- On reorder completion: `PATCH /api/courses/:courseId/lessons/reorder`
- Each row = `<LessonRow />`

---

#### `components/backoffice/course-form/LessonRow.tsx`
Displays per lesson:
- **Drag handle** icon (⋮⋮)
- **Type icon** — based on `type`:
  - VIDEO → play circle icon (Lucide `Play`)
  - DOCUMENT → document icon (Lucide `FileText`)
  - IMAGE → image icon (Lucide `Image`)
  - QUIZ → quiz icon (Lucide `ClipboardList`)
- **Title** — truncated to 1 line
- **Duration** — shown for VIDEO type (formatted as "5m 30s")
- **3-dot menu** (shadcn `DropdownMenu`):
  - **Edit** → opens `<LessonEditorModal />` with lesson data
  - **Delete** → opens confirmation `AlertDialog` → `DELETE /api/courses/:courseId/lessons/:lessonId` → remove from list

---

#### Add Content Button
- A button at the bottom of the lesson list: "+ Add Content"
- Opens `<LessonEditorModal />` in **create mode** (no pre-filled data)
- On save: lesson appended to list

---

#### Lesson Type Icons Map
```ts
const TYPE_ICONS: Record<LessonType, LucideIcon> = {
  VIDEO: Play,
  DOCUMENT: FileText,
  IMAGE: Image,
  QUIZ: ClipboardList,
}
```

---

### Empty State
When no lessons exist:
- Illustration + "No content yet"
- "+ Add your first lesson" button
