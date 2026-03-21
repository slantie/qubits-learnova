# Frontend Agent Task List
# Learnova — Backoffice Integration (A1–A4)

All backend endpoints are implemented and ready. This file is the task list for the frontend agent.
Base API URL: `http://localhost:4000/api` (set via `NEXT_PUBLIC_API_URL`).

---

## Status Key
- [ ] Not started
- [~] In progress
- [x] Done

---

## Phase 0 — Already Working (verify, don't rebuild)

- [x] Auth flow: POST /auth/signup, POST /auth/login, GET /auth/me
- [x] Courses dashboard: GET /courses with debounced search
- [x] KanbanView: drag-to-publish via PATCH /courses/:id/publish
- [x] ListView: table view with share/delete/edit buttons
- [x] CreateCourseModal: POST /courses with title only
- [x] CourseCard: share link, delete, navigate to edit page

---

## Phase 1 — Quick Fixes

### 1.1 KanbanView publish error handling
File: `client/components/backoffice/courses/KanbanView.tsx`

The catch block silently swallows publish errors. Add a toast:
```ts
} catch (e) {
  toast.error(e instanceof Error ? e.message : 'Failed to update course status');
}
```
Note: Publish requires `websiteUrl` to be set. If it's null, the backend returns 422 with message `"websiteUrl must be set before publishing"`. Show this message to the user.

### 1.2 Auth page headings
Files: `client/app/(auth)/login/page.tsx`, `client/app/(auth)/signup/page.tsx`

Replace `font-bold` with `font-medium` on all `<h1>` elements per the design system (no bold — Matter SemiBold is the max at 600).

### 1.3 Backoffice layout — Topbar & Sidebar
File: `client/app/(backoffice)/layout.tsx`

Currently just placeholder text. Build:
- **Topbar**: Learnova logo/wordmark left, user name + role badge center-right, logout button far right. On logout: call POST /auth/logout (fire-and-forget), then `logout()` from useAuth, then `router.push('/login')`.
- **Sidebar**: Navigation links — "Courses" → `/backoffice/courses`. Active state highlighted with primary teal. Collapse to icon-only on mobile.

---

## Phase 2 — Course Edit Page (A1 + A2)

### 2.1 Create the page route
File: `client/app/(backoffice)/backoffice/courses/[id]/edit/page.tsx`

- Fetch course detail on mount: `GET /api/courses/:id` → returns `CourseDetail` (see `client/types/index.ts`)
- Show loading skeleton while fetching
- On 403/404: redirect to `/backoffice/courses`
- Layout: back button to courses list, course title in page heading, tabbed sections below

### 2.2 Tab 1 — Course Info
Calls: `PATCH /api/courses/:id`, `POST /api/courses/:id/cover`, `PATCH /api/courses/:id/publish`

Fields:
| Field | Input type | Notes |
|-------|-----------|-------|
| Title | text input | required |
| Description | textarea | optional |
| Tags | tag input | comma-separated, stored as array |
| Visibility | select | `EVERYONE` \| `SIGNED_IN` |
| Access Rule | select | `OPEN` \| `ON_INVITATION` \| `ON_PAYMENT` |
| Website URL | text input | required before publish; validate format |
| Cover Image | file input | `POST /courses/:id/cover` multipart, field name `cover`; preview current image |

Save button → `PATCH /courses/:id` with changed fields only.

Publish toggle:
- If `isPublished=false` and `websiteUrl` is empty: show inline warning "Set a website URL before publishing"
- Otherwise: `PATCH /courses/:id/publish` with `{ isPublished: !current }`
- Update local state on success

### 2.3 Tab 2 — Lessons (A3)
Calls: `GET /api/courses/:id/lessons`, `POST /api/courses/:id/lessons`, `PATCH /api/courses/:id/lessons/reorder`, `DELETE /api/courses/:id/lessons/:lessonId`

- List lessons in order (use `order` field), each row shows: drag handle, type icon, title, duration formatted, attachment count badge, edit button, delete button
- Drag-to-reorder: on drop → `PATCH /courses/:id/lessons/reorder` with `{ lessonIds: [ordered array of ids] }`
- "Add Lesson" button → opens `CreateLessonModal`
- Edit button → opens `LessonEditorModal` for that lesson
- Delete button → confirm dialog → `DELETE /courses/:id/lessons/:lessonId`

**CreateLessonModal** (`client/components/backoffice/lessons/CreateLessonModal.tsx`):
- Fields: Title (text), Type (select: VIDEO | DOCUMENT | IMAGE | QUIZ)
- Submit → `POST /courses/:id/lessons` → on success refresh list, open LessonEditorModal for the new lesson

### 2.4 Lesson Editor Modal (A4)
Component: `client/components/backoffice/lessons/LessonEditorModal.tsx`
Calls: `GET /api/courses/:id/lessons/:lessonId`, `PATCH /api/courses/:id/lessons/:lessonId`, `POST /api/courses/:id/lessons/:lessonId/file`, `GET /api/courses/:id/lessons/:lessonId/attachments`, `POST /api/courses/:id/lessons/:lessonId/attachments`, `DELETE /api/courses/:id/lessons/:lessonId/attachments/:attachmentId`

Sections:
1. **Info**: editable title, duration (number, minutes), type shown as badge (read-only)
2. **File upload** (for VIDEO / DOCUMENT / IMAGE types only):
   - `POST /courses/:courseId/lessons/:lessonId/file` multipart, field name `file`
   - Show current file path if set, show upload progress/spinner
3. **Attachments**:
   - List from `GET .../attachments`; each row: icon (FILE/LINK), label, delete button
   - "Add File" → file picker → `POST .../attachments` multipart with fields `file` + `label`
   - "Add Link" → inline form with URL + label → `POST .../attachments` JSON `{ externalUrl, label }`
   - Delete → `DELETE .../attachments/:attachmentId`
4. **Save button** → `PATCH .../lessons/:lessonId` with `{ title, duration }`

### 2.5 Tab 3 — Attendees
Calls: `POST /api/courses/:id/attendees`

- Show current `enrollmentCount` from course detail
- Textarea: enter comma-separated or newline-separated emails
- "Add Attendees" button → parse emails → `POST /courses/:id/attendees` with `{ emails: string[] }`
- Show result: `enrolled X new learners, invited Y new users, X already enrolled`

### 2.6 Tab 4 — Contact
Calls: `POST /api/courses/:id/contact`

- Subject input (text)
- Body textarea
- "Send to all enrolled" button → `POST /courses/:id/contact` with `{ subject, body }`
- Show result: `Sent to X learners`

---

## Phase 3 — Learner Route (post-signup redirect target)

### 3.1 Courses listing page for learners
File: `client/app/(website)/courses/page.tsx`

Signup redirects learners to `/courses`. This page does not exist yet — currently it would 404.
Minimum viable: a simple page telling the learner "You've joined! Courses coming soon." or redirect them to `/` if a full learner dashboard isn't in scope yet.

---

## API Contract Quick Reference

All requests require `Authorization: Bearer <token>` header (set automatically by `client/lib/api.ts`).

| Method | Endpoint | Body / Query | Response |
|--------|----------|-------------|----------|
| GET | `/courses` | `?search=` | `Course[]` |
| POST | `/courses` | `{ title }` | `{ id, title }` |
| GET | `/courses/:id` | — | `CourseDetail` |
| PATCH | `/courses/:id` | `UpdateCourseInput` | full course |
| DELETE | `/courses/:id` | — | 204 |
| POST | `/courses/:id/share-link` | — | `{ url }` |
| PATCH | `/courses/:id/publish` | `{ isPublished: boolean }` | `{ id, isPublished }` |
| POST | `/courses/:id/cover` | multipart `cover` field | `{ coverImage }` |
| POST | `/courses/:id/attendees` | `{ emails: string[] }` | `{ enrolled, invited, alreadyEnrolled }` |
| POST | `/courses/:id/contact` | `{ subject, body }` | `{ sent }` |
| GET | `/courses/:id/lessons` | — | `Lesson[]` |
| POST | `/courses/:id/lessons` | `{ title, type, order? }` | lesson object |
| PATCH | `/courses/:id/lessons/reorder` | `{ lessonIds: number[] }` | 204 |
| GET | `/courses/:id/lessons/:lessonId` | — | lesson object |
| PATCH | `/courses/:id/lessons/:lessonId` | `{ title?, duration?, content? }` | lesson object |
| DELETE | `/courses/:id/lessons/:lessonId` | — | 204 |
| POST | `/courses/:id/lessons/:lessonId/file` | multipart `file` field | `{ filePath }` |
| GET | `/courses/:id/lessons/:lessonId/attachments` | — | `Attachment[]` |
| POST | `/courses/:id/lessons/:lessonId/attachments` | multipart `file`+`label` OR JSON `{ externalUrl, label }` | attachment object |
| DELETE | `/courses/:id/lessons/:lessonId/attachments/:id` | — | 204 |

### Types (all in `client/types/index.ts`)
- `Course` — list item (id, title, tags, isPublished, lessonCount, totalDuration, coverImage, createdAt)
- `CourseDetail` — full detail for edit page
- `Lesson` — includes attachmentsCount
- `Attachment` — id, lessonId, type, label, filePath, externalUrl
- `User.id` is `number` (not string — matches backend)

### Design system reminders
- Font: `font-medium` (500) for all headings and labels. `font-semibold` (600) only for metric numbers. No `font-bold`.
- Primary teal: `text-primary` / `bg-primary` → `#007067` (oklch 0.45 0.10 185)
- h1/h2 use `font-season` CSS variable (SeasonMix). h3–h6 use `font-matter`.
- Lesson type icons: VIDEO → `PlayCircle`, DOCUMENT → `FileText`, IMAGE → `Image`, QUIZ → `HelpCircle` (lucide-react)
