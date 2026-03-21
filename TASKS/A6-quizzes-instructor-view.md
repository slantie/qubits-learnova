# Task: A6 — Quizzes — Instructor View

**Location:** `/backoffice/courses/:courseId/edit` → Quiz Tab
**Access:** ADMIN, INSTRUCTOR (own course)

## Overview
Lists all quizzes linked to the course. Allows creating new quizzes (navigates to Quiz Builder) and deleting existing ones.

---

## Backend

### API Endpoints

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/courses/:courseId/quizzes` | ADMIN, INSTRUCTOR | List quizzes for a course |
| POST | `/api/courses/:courseId/quizzes` | ADMIN, INSTRUCTOR (own) | Create a new quiz |
| DELETE | `/api/courses/:courseId/quizzes/:quizId` | ADMIN, INSTRUCTOR (own) | Delete a quiz |

---

### `GET /api/courses/:courseId/quizzes`

**Logic:**
- Verify course ownership (INSTRUCTOR) or admin
- Return quizzes with question count

**Response:**
```ts
{
  quizzes: {
    id: number
    title: string
    questionCount: number
    hasRewards: boolean
    createdAt: string
  }[]
}
```

---

### `POST /api/courses/:courseId/quizzes`

**Body:** `{ title: string }`

**Logic:**
- Validate `title` non-empty
- Create quiz with `courseId`
- Also create default `QuizReward` record: `{ attempt1Points: 10, attempt2Points: 7, attempt3Points: 4, attempt4PlusPoints: 1 }`
- Return `{ id, title, questionCount: 0, hasRewards: true }`

**After creation:** client navigates to `/backoffice/courses/:courseId/quiz/:quizId`

---

### `DELETE /api/courses/:courseId/quizzes/:quizId`

**Logic:**
- Verify quiz belongs to course
- Verify course ownership (INSTRUCTOR) or admin
- Delete quiz (cascade deletes questions, rewards, attempts via Prisma)

---

## Frontend

### Component: `components/backoffice/course-form/QuizList.tsx`

Rendered inside the Quiz Tab of the Course Form.

#### State
```ts
const [quizzes, setQuizzes] = useState<Quiz[]>([])
const [isCreating, setIsCreating] = useState(false)
const [newQuizTitle, setNewQuizTitle] = useState('')
```

#### On mount
- `GET /api/courses/:courseId/quizzes` → populate `quizzes`

---

### UI Layout

#### Header
- Title: "Quizzes"
- **+ Add Quiz** button → expands inline form or opens `<CreateQuizInlineForm />`

#### Quiz Row (per quiz)
Each quiz shown as a card/row with:
- Quiz title
- Question count: "X questions"
- Rewards badge: "Rewards configured" (green) or "No rewards" (gray) based on `hasRewards`
- **Edit** button → navigate to `/backoffice/courses/:courseId/quiz/:quizId`
- **Delete** button → confirmation `AlertDialog` → `DELETE` → remove from list

---

### Create Quiz Inline Form
- Expands below the "+ Add Quiz" button (accordion style)
- Single text input: "Quiz title"
- **Create & Edit** button:
  1. `POST /api/courses/:courseId/quizzes`
  2. Navigate to quiz builder with returned `quizId`
- **Cancel** button — collapses form

---

### Empty State
When no quizzes:
- Icon (ClipboardList) + "No quizzes yet"
- "+ Create your first quiz" button

---

### Navigation
- Clicking **Edit** routes to `app/(backoffice)/backoffice/courses/[courseId]/quiz/[quizId]/page.tsx`
- This page is the Quiz Builder (see A7)
