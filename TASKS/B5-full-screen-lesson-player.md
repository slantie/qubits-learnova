# Task: B5 — Full-Screen Lesson Player

**Route:** `/courses/:courseId/lessons/:lessonId`
**Access:** Authenticated + enrolled learners (or OPEN access rule)

## Overview
A distraction-free full-screen learning interface. Left sidebar lists all lessons with status icons and attachments. Main area shows lesson content (video, document, image, or quiz). Top navigation with Back and Next Content buttons.

---

## Backend

### API Endpoints

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/courses/public/:courseId/lessons/:lessonId` | Enrolled learner | Get lesson content + sidebar data |
| POST | `/api/courses/:courseId/lessons/:lessonId/progress` | Enrolled learner | Mark lesson as started/completed |
| PATCH | `/api/enrollments/:enrollmentId/time` | Enrolled learner | Update time spent (periodic ping) |

---

### `GET /api/courses/public/:courseId/lessons/:lessonId`

**Logic:**
- Verify learner is enrolled (check `Enrollment { userId, courseId }`)
- If `accessRule = ON_INVITATION` or `ON_PAYMENT` and not enrolled → 403
- If `accessRule = OPEN` → allow authenticated users even without enrollment; auto-enroll them
- Fetch lesson with full detail: `description`, `videoUrl`, `filePath`, `duration`, `allowDownload`, `attachments`
- Fetch all course lessons (for sidebar) ordered by `order`
- Fetch user's `LessonProgress` for this enrollment
- Mark this lesson as "started" (update enrollment `startedAt` if first lesson, `status = IN_PROGRESS`)

**Response:**
```ts
{
  lesson: {
    id: number
    title: string
    type: LessonType
    description: string | null
    videoUrl: string | null
    filePath: string | null
    duration: number | null
    allowDownload: boolean
    attachments: {
      id: number
      type: AttachmentType
      label: string
      filePath: string | null
      externalUrl: string | null
    }[]
  }
  sidebar: {
    courseTitle: string
    completionPercent: number
    lessons: {
      id: number
      title: string
      type: LessonType
      order: number
      isCompleted: boolean
      isCurrentLesson: boolean
      attachments: { id: number; label: string; type: AttachmentType; filePath: string | null; externalUrl: string | null }[]
    }[]
  }
  navigation: {
    prevLessonId: number | null
    nextLessonId: number | null
  }
}
```

---

### `POST /api/courses/:courseId/lessons/:lessonId/progress`

**Body:** `{ isCompleted: boolean }`

**Logic:**
- Upsert `LessonProgress { enrollmentId, lessonId, isCompleted, completedAt }`
- If `isCompleted = true`: check if ALL lessons in course are completed → update `Enrollment { status: COMPLETED, completedAt: now() }`
- Recompute `completionPercent`
- Return `{ completionPercent, courseCompleted: boolean }`

---

### `PATCH /api/enrollments/:enrollmentId/time`

**Body:** `{ seconds: number }` — incremental seconds to add

**Logic:**
- `enrollment.timeSpent += seconds`
- Called every 30s from the client while the player is visible

---

## Frontend

### Page: `app/(website)/courses/[courseId]/lessons/[lessonId]/page.tsx`

**Layout:** Full-screen (no standard website navbar/footer — this is an isolated player)

```
[Top Bar: Back | Course Title | Completion %]
[Left Sidebar | Main Content Area]
```

---

### Components

#### `components/website/lesson-player/PlayerTopBar.tsx`
- **Back** button (← icon) → navigates to `/courses/:courseId`
- Course title (truncated)
- Completion percentage badge (e.g., "42% complete")
- **Next Content** button → navigates to `navigation.nextLessonId` (disabled if null)

---

#### `components/website/lesson-player/LessonSidebar.tsx`

**Collapsible** (toggle button ← → on the sidebar edge)

**Contents:**
- Course title at top
- Completion percentage + mini progress bar
- Lesson list — each lesson = `<SidebarLessonItem />`

---

#### `components/website/lesson-player/SidebarLessonItem.tsx`

Per lesson in sidebar:
- **Status icon**:
  - `isCompleted` → blue filled checkmark
  - `isCurrentLesson` → accent indicator (filled dot or highlighted row)
  - Otherwise → empty circle
- **Title** — clickable → navigate to that lesson
- **Type icon** (small, muted)
- **Attachments** listed below lesson title (indented):
  - FILE: 📎 label → download link (if `filePath` available)
  - LINK: 🔗 label → opens in new tab

---

#### `components/website/lesson-player/LessonContent.tsx`

Switches based on `lesson.type`:

**VIDEO:**
```tsx
<VideoPlayer url={lesson.videoUrl} />
```
- Embed via `<iframe>` for YouTube (transform URL to embed format)
- For Google Drive: use Drive embed URL
- Show duration below player

**DOCUMENT:**
```tsx
<DocumentViewer filePath={lesson.filePath} allowDownload={lesson.allowDownload} />
```
- Render PDF inline using `<iframe src={lesson.filePath}>` or embed
- Show "Download" button if `allowDownload = true`

**IMAGE:**
```tsx
<ImageViewer filePath={lesson.filePath} allowDownload={lesson.allowDownload} />
```
- Full-size `<img>` with object-fit contain
- Show "Download" button if `allowDownload = true`

**QUIZ:**
→ See `B6-quiz-flow-learner.md` — `<QuizView />` component

---

#### Lesson Description
Shown above the content viewer (if `lesson.description` is not null):
- Renders HTML using sanitised `dangerouslySetInnerHTML`

---

#### Mark Complete
- A "Mark as Complete" button shown below the content
- On click: `POST /api/.../progress { isCompleted: true }`
- Button changes to "Completed ✓" after success
- Updates sidebar checkmark and `completionPercent`
- If all lessons complete: shows `<CourseCompletionBanner />` and triggers `<PointsPopup />` if a quiz was just completed (handled in B7)

---

### Time Tracking Hook: `hooks/useTimeTracking.ts`
```ts
// Pings PATCH /api/enrollments/:enrollmentId/time every 30s
// Pauses when tab is hidden (visibilitychange API)
// Sends remaining seconds on page unload (navigator.sendBeacon)
```

---

### Navigation
- **Previous lesson**: ← button in top bar or keyboard shortcut (ArrowLeft)
- **Next lesson**: "Next Content" button or keyboard shortcut (ArrowRight)
- Sidebar lessons are clickable to jump to any lesson directly
