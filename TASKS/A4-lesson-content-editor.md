# Task: A4 — Lesson / Content Editor

**Location:** Modal/Popup on `/backoffice/courses/:courseId/edit` (Content Tab)
**Access:** ADMIN, INSTRUCTOR (own course)

## Overview
A tabbed popup (Dialog) for creating or editing a single lesson. Has three tabs: Content (fields + file/video), Description (rich text), Additional Attachments (files + links).

---

## Backend

### API Endpoints

(Lesson CRUD from A3 covers the core save operations. Additional endpoints needed for attachments:)

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/courses/:courseId/lessons/:lessonId/attachments` | ADMIN, INSTRUCTOR | List attachments for a lesson |
| POST | `/api/courses/:courseId/lessons/:lessonId/attachments` | ADMIN, INSTRUCTOR (own) | Add attachment (file or link) |
| DELETE | `/api/courses/:courseId/lessons/:lessonId/attachments/:attachmentId` | ADMIN, INSTRUCTOR (own) | Remove attachment |

---

### `GET /api/courses/:courseId/lessons/:lessonId/attachments`

**Response:**
```ts
{
  attachments: {
    id: number
    type: 'FILE' | 'LINK'
    label: string
    filePath: string | null
    externalUrl: string | null
  }[]
}
```

---

### `POST /api/courses/:courseId/lessons/:lessonId/attachments`

**Two modes (discriminated by Content-Type):**

**Mode 1 — File upload (`multipart/form-data`)**
- Fields: `file` (binary), `label` (string)
- Save file to `UPLOAD_DIR/attachments/`
- Create `Attachment { type: 'FILE', filePath, label }`

**Mode 2 — Link (`application/json`)**
- Body: `{ label: string, externalUrl: string }`
- Validate URL format (zod `url()`)
- Create `Attachment { type: 'LINK', externalUrl, label }`

**Response:** Created attachment object.

---

### `DELETE /api/courses/:courseId/lessons/:lessonId/attachments/:attachmentId`

**Logic:**
- Verify attachment belongs to lesson
- If `type === 'FILE'`: delete physical file from `UPLOAD_DIR`
- Delete DB record

---

## Frontend

### Component: `components/backoffice/course-form/LessonEditorModal.tsx`

A shadcn `Dialog` with 3 inner tabs.

#### Props
```ts
interface LessonEditorModalProps {
  courseId: number
  lesson?: Lesson | null  // null = create mode
  onSave: (lesson: Lesson) => void
  onClose: () => void
  isOpen: boolean
}
```

#### State
```ts
const [tab, setTab] = useState<'content' | 'description' | 'attachments'>('content')
const [formData, setFormData] = useState<LessonFormData>({
  title: '',
  type: 'VIDEO',
  videoUrl: '',
  duration: '',
  allowDownload: false,
  description: '',
  responsibleId: null,
})
const [attachments, setAttachments] = useState<Attachment[]>([])
const [uploadedFile, setUploadedFile] = useState<File | null>(null)
const [isSaving, setIsSaving] = useState(false)
```

#### On open (edit mode)
- Pre-fill `formData` from `lesson` prop
- `GET /api/courses/:courseId/lessons/:lessonId/attachments` → populate `attachments`

---

### Tab 1 — Content

#### Fields always shown:
- **Lesson Title** — required text input
- **Lesson Type Selector** — button group or segmented control: Video | Document | Image
- **Responsible Person** — optional user select (`GET /api/users?role=INSTRUCTOR,ADMIN`)

#### Fields shown by type:

**VIDEO type:**
- **Video URL** — text input (YouTube or Google Drive link)
  - Show a small thumbnail preview if URL is a valid YouTube link
- **Duration** — number input (minutes + seconds, split into 2 inputs, combined to seconds on save)

**DOCUMENT type:**
- **Document Upload** — file input (PDF, Word, Excel, etc.)
  - Shows selected file name or current file name if editing
- **Allow Download Toggle** — shadcn `Switch`

**IMAGE type:**
- **Image Upload** — file input with drag-and-drop, shows image preview
- **Allow Download Toggle** — shadcn `Switch`

---

### Tab 2 — Description

- **Lesson Description** — rich text area (Tiptap or `<textarea>` with markdown)
- Shows formatted to learners at the top of the lesson player

---

### Tab 3 — Additional Attachments

#### Attachment List
- Renders each attachment as a row:
  - Icon: 📎 for FILE, 🔗 for LINK
  - Label text
  - Delete button → `DELETE .../attachments/:id` → remove from list

#### Add File Section
- File input + Label input + "Upload" button
- On upload: `POST .../attachments` (multipart) → append to list

#### Add Link Section
- URL input + Label input + "Add Link" button
- Validate URL client-side before submit
- On save: `POST .../attachments` (JSON) → append to list

---

### Save Logic

On clicking **Save** (primary action button in dialog footer):
1. If `uploadedFile` exists: first `POST /api/courses/:courseId/lessons/:lessonId/file` to upload the file
2. Then `PATCH /api/courses/:courseId/lessons/:lessonId` with form fields
3. For create mode: `POST /api/courses/:courseId/lessons` then handle file upload with returned lessonId
4. Call `onSave(updatedLesson)` and close modal

#### Validation before save:
- `title` is non-empty
- If VIDEO: `videoUrl` is non-empty
- If DOCUMENT/IMAGE: file must be uploaded (create) or already exists (edit)
