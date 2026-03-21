# Task: A7 — Quiz Builder

**Route:** `/backoffice/courses/:courseId/quiz/:quizId`
**Access:** ADMIN, INSTRUCTOR (own course)

## Overview
A dedicated full-page builder for creating quiz questions and configuring attempt-based point rewards. Two-panel layout: left panel lists questions, right panel edits the selected question.

---

## Backend

### API Endpoints

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/courses/:courseId/quizzes/:quizId` | ADMIN, INSTRUCTOR | Get quiz with all questions and rewards |
| PATCH | `/api/courses/:courseId/quizzes/:quizId` | ADMIN, INSTRUCTOR (own) | Update quiz title |
| POST | `/api/courses/:courseId/quizzes/:quizId/questions` | ADMIN, INSTRUCTOR (own) | Add a new question |
| PATCH | `/api/courses/:courseId/quizzes/:quizId/questions/:questionId` | ADMIN, INSTRUCTOR (own) | Update a question |
| DELETE | `/api/courses/:courseId/quizzes/:quizId/questions/:questionId` | ADMIN, INSTRUCTOR (own) | Delete a question |
| PATCH | `/api/courses/:courseId/quizzes/:quizId/rewards` | ADMIN, INSTRUCTOR (own) | Update rewards config |

---

### `GET /api/courses/:courseId/quizzes/:quizId`

**Response:**
```ts
{
  id: number
  title: string
  questions: {
    id: number
    text: string
    options: string[]          // e.g. ["Paris", "London", "Berlin"]
    correctOptions: number[]   // indices e.g. [0]
    order: number
  }[]
  rewards: {
    attempt1Points: number
    attempt2Points: number
    attempt3Points: number
    attempt4PlusPoints: number
  }
}
```

---

### `POST /api/courses/:courseId/quizzes/:quizId/questions`

**Body:**
```ts
{
  text: string
  options: string[]      // at least 2
  correctOptions: number[]  // at least 1 valid index
}
```

**Logic:**
- Validate: `text` non-empty, `options` length ≥ 2, `correctOptions` indices within options bounds
- `order` = `MAX(order) + 1`
- Return created question

---

### `PATCH /api/courses/:courseId/quizzes/:quizId/questions/:questionId`

**Body:** Same as POST (all optional)

**Validation:** Same as POST if fields are provided.

---

### `DELETE /api/courses/:courseId/quizzes/:quizId/questions/:questionId`

**Logic:**
- Delete question
- Re-sequence remaining questions' `order`

---

### `PATCH /api/courses/:courseId/quizzes/:quizId/rewards`

**Body:**
```ts
{
  attempt1Points: number    // must be >= attempt2Points
  attempt2Points: number    // must be >= attempt3Points
  attempt3Points: number    // must be >= attempt4PlusPoints
  attempt4PlusPoints: number  // must be >= 0
}
```

**Validation:** Points must be non-negative integers and strictly non-increasing across attempts.

---

## Frontend

### Page: `app/(backoffice)/backoffice/courses/[courseId]/quiz/[quizId]/page.tsx`

**Layout:** Two-column (left 30% / right 70%), full-height minus topbar.

#### State
```ts
const [quiz, setQuiz] = useState<Quiz | null>(null)
const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null)
const [isRewardsPanelOpen, setIsRewardsPanelOpen] = useState(false)
const [isSaving, setIsSaving] = useState(false)
```

#### On mount
- `GET /api/courses/:courseId/quizzes/:quizId` → populate `quiz` and select first question

---

### Components

#### `components/backoffice/quiz-builder/QuestionList.tsx` (Left Panel)

- **Quiz title** — editable inline input at top (auto-saves to `PATCH .../quizzes/:quizId`)
- **Back link** → `/backoffice/courses/:courseId/edit?tab=quiz`
- Numbered list of questions: "Question 1", "Question 2", ...
  - Active question highlighted
  - Click → select and show in right panel
- **+ Add Question** button at bottom:
  - `POST .../questions` with empty defaults
  - Append to list + auto-select new question
- **Rewards** button (trophy icon) at bottom:
  - Opens `<RewardsPanel />` (replaces right panel or slide-over)

---

#### `components/backoffice/quiz-builder/QuestionEditor.tsx` (Right Panel)

Shown when a question is selected.

**Fields:**
- **Question Text** — textarea, required
- **Answer Options** — dynamic list:
  - At least 2 options required
  - Each option: text input + "Mark as correct" toggle (checkmark icon)
  - Multiple options can be marked correct (for multi-select questions)
  - **+ Add Option** button
  - **Delete option** button (×) — only shown if > 2 options
- **Correct answers highlighted** in green

**Save behavior:**
- Auto-save on blur or debounced 600ms after any change
- `PATCH .../questions/:questionId`
- Visual save indicator per field

**Delete question:**
- Trash icon button in top-right of editor
- Confirmation inline or dialog → `DELETE .../questions/:questionId`
- Select previous question after delete

---

#### `components/backoffice/quiz-builder/RewardsPanel.tsx`

Shown when "Rewards" button is clicked (replaces right panel content or is a slide-over).

**UI:**
| Attempt | Points input |
|---------|-------------|
| 1st Attempt | `<input type="number">` |
| 2nd Attempt | `<input type="number">` |
| 3rd Attempt | `<input type="number">` |
| 4th Attempt+ | `<input type="number">` |

**Validation display:** Show inline warning if values are not non-increasing.

**Save button:** `PATCH .../rewards` → show success toast.

**Info callout:**
> "Points decrease with each attempt to incentivise first-try success."

---

### Empty States
- No questions yet: "No questions added" + "+ Add your first question" button
- No question selected: "Select a question from the list to edit it"
