# Learnova — Quiz Builder Module: Complete Implementation Plan

> **Scope:** A6 Quiz List Tab → A7 Quiz Builder → Rewards Panel → Student Quiz Attempt Flow (API-only)
>
> **Prerequisite:** Backoffice Core (courses, sections, lessons, auth, RBAC) must be complete.
> **Rule:** Schema additions only — no destructive changes. All new models append to existing `schema.prisma`.
> **Stack:** Express/Fastify (port 4000) + Prisma + Next.js (port 3000) + Tailwind CSS.

---

## Table of Contents

1. [What Already Exists (Do Not Rebuild)](#1-what-already-exists-do-not-rebuild)
2. [Schema Additions](#2-schema-additions)
3. [Backend — Quiz API](#3-backend--quiz-api)
4. [Frontend — Quiz Builder UI](#4-frontend--quiz-builder-ui)
5. [Student Attempt API (Learner-side)](#5-student-attempt-api-learner-side)
6. [Implementation Order](#6-implementation-order)
7. [Edge Cases & Validation Rules](#7-edge-cases--validation-rules)

---

## 1. What Already Exists (Do Not Rebuild)

The following models are already defined in `schema.prisma` from the core plan. Reference them but do not recreate them:

- `Quiz` — id, title, courseId, lessonId (optional @unique), createdAt, updatedAt
- `QuizReward` — id, attempt1Points, attempt2Points, attempt3Points, attempt4PlusPoints, quizId (@unique)
- `Question` — id, text, order, quizId
- `QuestionOption` — id, text, isCorrect, order, questionId
- `QuizAttempt` — id, attemptNumber, pointsEarned, completedAt, userId, quizId
- `QuizAnswer` — id, questionId, optionId, attemptId
- `Course` — already has `quizzes Quiz[]` relation
- `Lesson` — already has `quizLesson Quiz? @relation("QuizLesson")` and `type LessonType` (which includes `QUIZ`)

The following files are already stubbed in the core plan but need to be **fully implemented** now:

- `apps/server/src/modules/quiz/quiz.router.ts`
- `apps/server/src/modules/quiz/quiz.controller.ts`
- `apps/server/src/modules/quiz/quiz.service.ts`
- `apps/server/src/modules/quiz/quiz.schema.ts`
- `apps/web/app/(backoffice)/courses/[courseId]/edit/quiz/page.tsx`
- `apps/web/app/(backoffice)/courses/[courseId]/edit/quiz/[quizId]/page.tsx`
- `apps/web/components/backoffice/QuizBuilder.tsx`
- `apps/web/components/backoffice/RewardsPanel.tsx`
- `apps/web/lib/api/quiz.ts`

---

## 2. Schema Additions

Open `apps/server/prisma/schema.prisma`. Check if the models listed in Section 1 already exist. If they do, **do not re-add them**. The only addition needed in this module is the student-side attempt tracking, which may already be partially present.

### 2.1 Verify these models exist (from core plan)

Run `npx prisma studio` and confirm these tables exist:
`Quiz`, `QuizReward`, `Question`, `QuestionOption`, `QuizAttempt`, `QuizAnswer`

### 2.2 Only add if missing

If `QuizAttempt` and `QuizAnswer` were omitted from your earlier migration, add them now:

```
QuizAttempt:
  - id: String @id @default(uuid())
  - attemptNumber: Int
  - pointsEarned: Int
  - completedAt: DateTime @default(now())
  - userId: String → User relation
  - quizId: String → Quiz relation
  - answers: QuizAnswer[]

QuizAnswer:
  - id: String @id @default(uuid())
  - questionId: String  (not a FK relation — just the ID stored as plain string)
  - optionId: String    (same — plain string, no FK)
  - attemptId: String → QuizAttempt relation (onDelete: Cascade)
```

After any schema change:
```
npx prisma db push
npx prisma generate
```

---

## 3. Backend — Quiz API

### 3.1 File: `quiz.router.ts`

Mount all routes under the existing `/api/quizzes` prefix (already wired in `routes/index.ts`).

All routes require `requireAuth` + `requireRole(['ADMIN', 'INSTRUCTOR'])` **except** the student attempt routes — those require `requireAuth` only (any authenticated user).

#### Instructor/Admin routes (RBAC: ADMIN or INSTRUCTOR):

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/courses/:courseId/quizzes` | List all quizzes for a course (with question count and reward) |
| POST | `/courses/:courseId/quizzes` | Create a new quiz for a course |
| GET | `/courses/:courseId/quizzes/:quizId` | Get full quiz with all questions, options, reward |
| PATCH | `/courses/:courseId/quizzes/:quizId` | Update quiz title only |
| DELETE | `/courses/:courseId/quizzes/:quizId` | Delete quiz (cascades questions, options, reward, attempts) |
| POST | `/courses/:courseId/quizzes/:quizId/questions` | Add a new question with its options |
| PATCH | `/courses/:courseId/quizzes/:quizId/questions/:questionId` | Update question text and/or options (replace all options) |
| DELETE | `/courses/:courseId/quizzes/:quizId/questions/:questionId` | Delete a question |
| PATCH | `/courses/:courseId/quizzes/:quizId/questions/reorder` | Reorder questions by supplying an ordered array of question IDs |
| PUT | `/courses/:courseId/quizzes/:quizId/reward` | Upsert the reward config for a quiz |

#### Student routes (RBAC: any authenticated user):

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/courses/:courseId/quizzes/:quizId/attempt` | Submit a quiz attempt with all answers |
| GET | `/courses/:courseId/quizzes/:quizId/attempts` | Get all past attempts for the current user on this quiz |

---

### 3.2 File: `quiz.schema.ts` — Zod Validation Shapes

Define these Zod schemas for request body validation:

**createQuizSchema**
- `title`: string, min 1, max 255, required

**updateQuizSchema**
- `title`: string, min 1, max 255, optional

**createQuestionSchema**
- `text`: string, min 1, required
- `options`: array of option objects, min 2, max 6
  - Each option: `{ text: string (min 1), isCorrect: boolean }`
- Validation rule: at least one option must have `isCorrect: true`

**updateQuestionSchema**
- `text`: string, min 1, optional
- `options`: same array shape as above, optional
- Same isCorrect validation if options are provided

**reorderQuestionsSchema**
- `orderedIds`: array of UUID strings, min 1

**upsertRewardSchema**
- `attempt1Points`: number, int, min 0, required
- `attempt2Points`: number, int, min 0, required
- `attempt3Points`: number, int, min 0, required
- `attempt4PlusPoints`: number, int, min 0, required

**submitAttemptSchema**
- `answers`: array of answer objects, min 1
  - Each answer: `{ questionId: string (UUID), optionId: string (UUID) }`
- Validation: answers array length must match the quiz's question count (enforced in service, not schema)

---

### 3.3 File: `quiz.controller.ts` — Controller Layer

All functions follow the pattern: parse body with Zod → call service function → return JSON. All wrapped in try/catch with `next(e)`.

**listQuizzes**: Calls service, returns array. No special logic.

**createQuiz**: Parse createQuizSchema. Calls service. Returns 201 with created quiz.

**getQuiz**: Calls service with quizId. Returns full quiz object (questions + options + reward).

**updateQuiz**: Parse updateQuizSchema. Calls service. Returns updated quiz.

**deleteQuiz**: Calls service. Returns 204 No Content.

**addQuestion**: Parse createQuestionSchema. Calls service. Returns 201 with the created question including its options.

**updateQuestion**: Parse updateQuestionSchema. Calls service. Returns updated question with options.

**deleteQuestion**: Calls service. Returns 204.

**reorderQuestions**: Parse reorderQuestionsSchema. Calls service. Returns 200 with `{ success: true }`.

**upsertReward**: Parse upsertRewardSchema. Calls service. Returns the upserted reward object.

**submitAttempt**: Parse submitAttemptSchema. Calls service (scoring logic lives there). Returns the attempt object with `pointsEarned` and `attemptNumber`.

**getMyAttempts**: Calls service with `req.user.id` + `quizId`. Returns array of past attempts.

---

### 3.4 File: `quiz.service.ts` — Business Logic

#### `listQuizzes(courseId: string)`
- Query: `prisma.quiz.findMany` where `courseId = courseId`
- Include: `_count { select: { questions: true } }`, `reward`
- Order by: `createdAt asc`
- Returns array

#### `createQuiz(courseId: string, title: string)`
- Creates quiz record
- Also creates a default `QuizReward` in the same transaction (attempt1=10, attempt2=7, attempt3=5, attempt4Plus=2)
- Use a Prisma nested create: `reward: { create: { ... } }`
- Returns created quiz with reward included

#### `getQuiz(quizId: string)`
- `prisma.quiz.findUniqueOrThrow` where `id = quizId`
- Include: `reward`, `questions` ordered by `order asc`, each question includes `options` ordered by `order asc`
- Returns full object

#### `updateQuiz(quizId: string, title: string)`
- Simple `prisma.quiz.update`
- Returns updated quiz

#### `deleteQuiz(quizId: string)`
- `prisma.quiz.delete` — Prisma cascades handle questions, options, reward, attempts
- Returns void

#### `addQuestion(quizId: string, data: { text, options })`
- Find the current highest `order` for this quiz's questions
- Create question with `order = (maxOrder + 1)`
- Nested create options with their order index
- Validate: at least one option has `isCorrect: true` (throw AppError 400 if not)
- Returns created question with options

#### `updateQuestion(questionId: string, data: { text?, options? })`
- If `text` provided: update question text
- If `options` provided:
  - Validate at least one `isCorrect: true` (throw AppError 400 if not)
  - `prisma.questionOption.deleteMany` where `questionId = questionId`
  - `prisma.questionOption.createMany` with new options (assign order by array index)
- Returns updated question with fresh options

#### `deleteQuestion(questionId: string)`
- `prisma.question.delete` — cascades to options
- Returns void

#### `reorderQuestions(quizId: string, orderedIds: string[])`
- `Promise.all` of `prisma.question.update` calls, each setting `order = index`
- Use `where: { id, quizId }` to prevent cross-quiz tampering
- Returns void

#### `upsertReward(quizId: string, data: reward points object)`
- `prisma.quizReward.upsert` where `quizId = quizId`
- `create`: full reward object
- `update`: just the points fields
- Returns upserted reward

#### `submitAttempt(userId: string, quizId: string, answers: { questionId, optionId }[])`

This is the most complex service function. Steps:

1. Fetch the quiz with all questions and their correct option IDs:
   `prisma.quiz.findUniqueOrThrow` with full questions+options+reward included

2. Validate that the number of answers matches the number of questions. Throw 400 if mismatch.

3. Score the attempt:
   - For each answer, look up the corresponding `QuestionOption` by `optionId`
   - Check if `isCorrect === true`
   - Count total correct answers
   - Calculate `scorePercentage = (correctCount / totalQuestions) * 100`

4. Determine `attemptNumber`:
   - `prisma.quizAttempt.count` where `{ userId, quizId }`
   - `attemptNumber = existingCount + 1`

5. Determine `pointsEarned` from reward config:
   - attempt 1 → `reward.attempt1Points`
   - attempt 2 → `reward.attempt2Points`
   - attempt 3 → `reward.attempt3Points`
   - attempt 4+ → `reward.attempt4PlusPoints`
   - If no reward config exists, default to 0

6. Create the attempt with nested answers:
   ```
   prisma.quizAttempt.create({
     data: {
       userId, quizId, attemptNumber, pointsEarned,
       answers: { create: answers.map(a => ({ questionId: a.questionId, optionId: a.optionId })) }
     },
     include: { answers: true }
   })
   ```

7. Return: `{ id, attemptNumber, pointsEarned, scorePercentage, correctCount, totalQuestions, completedAt }`

#### `getMyAttempts(userId: string, quizId: string)`
- `prisma.quizAttempt.findMany` where `{ userId, quizId }`
- Include: `answers`
- Order by: `completedAt desc`
- Returns array

---

### 3.5 Access Guard Pattern

The course-scoped quiz routes must verify the requesting user owns or admins the course, using the same `guardCourseAccess` helper from `course.service.ts`. In the quiz service, before any mutation:

1. Fetch the quiz to get its `courseId`
2. Fetch the course to get `instructorId`
3. If `user.role !== 'ADMIN'` and `course.instructorId !== user.id` → throw AppError('Forbidden', 403)

Alternatively, accept `courseId` from the route param and do the ownership check there rather than re-fetching through the quiz. This is simpler and avoids an extra query.

---

## 4. Frontend — Quiz Builder UI

### 4.1 File: `lib/api/quiz.ts` — Typed Fetch Helpers

Implement these async functions, each wrapping a `fetch` call to the backend. All use `credentials: 'include'` (or however your existing API helpers pass auth). All throw on non-2xx responses.

| Function | Method + Path | Returns |
|----------|--------------|---------|
| `fetchQuizzes(courseId)` | GET `/api/quizzes/courses/:courseId/quizzes` | Quiz[] |
| `createQuiz(courseId, title)` | POST `/api/quizzes/courses/:courseId/quizzes` | Quiz |
| `fetchQuiz(courseId, quizId)` | GET `/api/quizzes/courses/:courseId/quizzes/:quizId` | FullQuiz |
| `updateQuiz(courseId, quizId, { title })` | PATCH | Quiz |
| `deleteQuiz(courseId, quizId)` | DELETE | void |
| `addQuestion(courseId, quizId, { text, options })` | POST `.../questions` | Question |
| `updateQuestion(courseId, quizId, questionId, data)` | PATCH `.../questions/:qId` | Question |
| `deleteQuestion(courseId, quizId, questionId)` | DELETE `.../questions/:qId` | void |
| `reorderQuestions(courseId, quizId, orderedIds)` | PATCH `.../questions/reorder` | void |
| `upsertReward(courseId, quizId, rewardData)` | PUT `.../reward` | QuizReward |

Define TypeScript interfaces in this file:

```typescript
interface QuizOption {
  id: string
  text: string
  isCorrect: boolean
  order: number
}

interface QuizQuestion {
  id: string
  text: string
  order: number
  options: QuizOption[]
}

interface QuizReward {
  id: string
  attempt1Points: number
  attempt2Points: number
  attempt3Points: number
  attempt4PlusPoints: number
}

interface FullQuiz {
  id: string
  title: string
  courseId: string
  questions: QuizQuestion[]
  reward: QuizReward | null
  _count?: { questions: number }
}
```

---

### 4.2 Page: `quiz/page.tsx` — A6 Quiz List Tab

This page is rendered inside the Course Form tab panel when the "Quiz" tab is active. It is at route `/backoffice/courses/[courseId]/edit/quiz`.

#### Layout & Behaviour:

**Header row:**
- Left: "Quizzes" heading with the count badge (e.g. "Quizzes (3)")
- Right: "+ Create Quiz" button — opens a small inline modal or inline form to enter a title and submit

**Quiz list:**
- Each quiz is shown as a card/row
- Card displays: quiz title, question count badge (e.g. "5 questions"), reward summary (e.g. "10 / 7 / 5 / 2 pts")
- Card actions: "Edit" button → navigates to `/backoffice/courses/:courseId/edit/quiz/:quizId`, "Delete" button → confirm dialog then delete
- Empty state: "No quizzes yet. Create your first quiz to get started." with the create button

**Create Quiz flow:**
- A small modal dialog (not a full-page navigation) appears
- Single input: "Quiz Title" — required, min 1 char
- Submit creates the quiz via API, then immediately navigates to the Quiz Builder page for the new quiz
- Cancel closes the modal without creating

**Data loading:**
- On mount: `fetchQuizzes(courseId)` → populate list
- After create: navigate away (no need to refresh list)
- After delete: refetch list

---

### 4.3 Page: `quiz/[quizId]/page.tsx` — A7 Quiz Builder

This is a full sub-page at `/backoffice/courses/[courseId]/edit/quiz/[quizId]`.

#### Overall Layout:

Split layout — fixed height, no page scroll:

```
┌────────────────────────────────────────────────────────────────────┐
│  HEADER: ← Back to Course  |  Quiz Title (editable inline)  |  Rewards button  │
├─────────────────┬──────────────────────────────────────────────────┤
│                 │                                                  │
│  LEFT SIDEBAR   │           RIGHT: QUESTION EDITOR                 │
│  (Question list)│                                                  │
│                 │                                                  │
│  Question 1     │  [Question N editor panel]                       │
│  Question 2 ◄── │                                                  │
│  Question 3     │                                                  │
│                 │                                                  │
│  + Add Question │                                                  │
│  [Rewards btn]  │                                                  │
└─────────────────┴──────────────────────────────────────────────────┘
```

#### Header row:
- "← Back" link → `/backoffice/courses/:courseId/edit` (opens on the quiz tab)
- Quiz title: displayed as plain text, clicking it switches to an inline `<input>` for editing, `onBlur` saves via `updateQuiz`
- "Rewards" button → opens the RewardsPanel as a side-drawer or modal overlay

#### Left sidebar — Question List:
- Scrollable list of question items
- Each item shows: "Q{n}" label + truncated question text (first 40 chars)
- Active question is highlighted with a blue left border or background
- Clicking a question item sets it as active → loads it in the right panel
- Drag-to-reorder: implement with mouse drag or use a simple up/down arrow button per item; on reorder, call `reorderQuestions` immediately
- "＋ Add Question" button at the bottom of the list:
  - Immediately calls `addQuestion` API with default text "New Question" and two default options: `[{ text: "Option A", isCorrect: false }, { text: "Option B", isCorrect: false }]`
  - Adds the returned question to local state
  - Sets it as the active question
- Question count displayed at top of sidebar: "3 Questions"

#### Right panel — Question Editor:

Rendered for the currently active question. If no questions exist, show a centred empty state with "Add your first question →".

**Question text field:**
- Large `<textarea>` at the top
- Placeholder: "Write your question here..."
- `onBlur` → calls `updateQuestion` with updated text + current options

**Options list:**
- Each option rendered as a row with:
  - Drag handle icon (optional: can skip for hackathon and use up/down arrows instead)
  - Text `<input>` for the option label
  - Checkbox / radio-style toggle for "Correct answer" — visually a green checkmark icon or a styled checkbox
  - Delete icon (×) — removes the option from local state; saving happens on blur
- Min 2 options enforced: if only 2 remain, hide the delete button
- Max 6 options enforced: hide "Add option" when 6 are reached

**"+ Add option" button:**
- Adds a new option to local state with empty text and `isCorrect: false`
- Does NOT call API immediately — the API call happens on any `onBlur` of the question editor

**Correct answer validation:**
- If user tries to save (blur fires) and no option has `isCorrect: true`, show an inline warning: "Mark at least one option as correct"
- Prevent the API call if validation fails

**Delete question button:**
- Placed in the top-right of the editor panel
- On click: show a small confirmation tooltip ("Delete this question?  [Cancel] [Delete]")
- On confirm: call `deleteQuestion`, remove from local state, select the previous question (or next if first)

**Auto-save pattern:**
- Do NOT use a manual "Save" button for the question editor
- Save triggers on: `onBlur` of question text field, `onChange` of correct-answer toggle, `onBlur` of any option text field
- Show a subtle "Saving…" / "Saved" status indicator in the editor header (fades in/out)
- Debounce text field saves by 600ms to avoid excessive API calls while typing

---

### 4.4 Component: `RewardsPanel.tsx`

Rendered as a modal overlay (not a page navigation). Opened from the Quiz Builder header.

#### Layout:
- Overlay backdrop (semi-transparent black)
- Centered card: 320px wide, white, rounded-xl, shadow-xl
- Title: "Quiz Rewards"
- Subtitle: "Points awarded based on attempt number"

#### Content:
- Four rows, one per attempt tier:
  - "1st attempt" → number input (default 10)
  - "2nd attempt" → number input (default 7)
  - "3rd attempt" → number input (default 5)
  - "4th attempt and beyond" → number input (default 2)
- Each input: type number, min 0, max 9999, step 1
- Visual design: label on left, input on right, with a "pts" suffix label

#### Actions:
- "Cancel" button: closes the panel without saving
- "Save" button: calls `upsertReward`, shows brief loading state, then closes panel
- On successful save: update the local quiz state's reward field so the header stats update immediately

---

### 4.5 Component: `QuizBuilder.tsx` (Wrapper)

This is an optional thin wrapper component that can be used to embed the quiz builder state into the Course Form's quiz tab without needing full page navigation. However, given the layout complexity, it is recommended to use the standalone page route (`quiz/[quizId]/page.tsx`) and navigate to it rather than embedding inline.

If you choose the embedded route, `QuizBuilder.tsx` should:
- Accept `courseId` and `quizId` as props
- Manage all local state (questions, activeQuestion, rewardsOpen)
- Render the split layout inline within the course form container
- Use `useEffect` on mount to fetch the quiz

For the hackathon, the standalone page approach is simpler and recommended.

---

### 4.6 Inline Quiz Tab Component (inside Course Form)

The "Quiz" tab rendered within `/backoffice/courses/[courseId]/edit/page.tsx` does NOT need to be a full quiz builder. It is the A6 list view:

- Renders the `QuizListTab` component (or inline JSX)
- Shows the list of quizzes for this course
- "Edit" button navigates to the quiz builder page
- "Create Quiz" button creates and navigates

This keeps the course form lightweight and the heavy builder UI on its own page.

---

## 5. Student Attempt API (Learner-side)

This section defines the API for when learners actually take quizzes. The instructor-side UI does not need to call these — they are for the learner-facing frontend (not in scope for this hackathon sprint, but the API must be ready).

### 5.1 POST `/api/quizzes/courses/:courseId/quizzes/:quizId/attempt`

**Auth:** Any authenticated user (not just ADMIN/INSTRUCTOR)

**Request body:**
```json
{
  "answers": [
    { "questionId": "uuid", "optionId": "uuid" },
    { "questionId": "uuid", "optionId": "uuid" }
  ]
}
```

**Validation:**
- Each `questionId` must belong to the quiz
- Each `optionId` must belong to its corresponding question
- One answer per question required (array length must equal question count)
- Reject if any questionId is duplicated

**Response:**
```json
{
  "id": "attempt-uuid",
  "attemptNumber": 2,
  "pointsEarned": 7,
  "scorePercentage": 80,
  "correctCount": 4,
  "totalQuestions": 5,
  "completedAt": "2025-03-21T10:30:00Z"
}
```

**Scoring logic** (already described in service section above):
- Score based on correct option selections
- Points based on attempt tier and reward config

### 5.2 GET `/api/quizzes/courses/:courseId/quizzes/:quizId/attempts`

**Auth:** Any authenticated user

**Query params:** none required (filters by `req.user.id` automatically)

**Response:** Array of past attempts, ordered newest first, each including:
- `id`, `attemptNumber`, `pointsEarned`, `completedAt`
- Does NOT include the full answers array (keep response lean)

---

## 6. Implementation Order

Follow this sequence. Each step is independently testable before moving to the next.

```
STEP 1 — Verify schema (~5 min)
  └─ Check prisma studio for: Quiz, QuizReward, Question, QuestionOption, QuizAttempt, QuizAnswer
  └─ If any are missing, add them and run: npx prisma db push && npx prisma generate
  └─ DO NOT recreate tables that already exist

STEP 2 — quiz.schema.ts (~10 min)
  └─ Implement all Zod schemas (createQuiz, updateQuiz, createQuestion, updateQuestion, reorderQuestions, upsertReward, submitAttempt)
  └─ Test: import the file and call .parse() with valid + invalid payloads in a scratch file

STEP 3 — quiz.service.ts core CRUD (~30 min)
  └─ Implement: listQuizzes, createQuiz, getQuiz, updateQuiz, deleteQuiz
  └─ Test via HTTP (use curl or Postman):
       POST /api/quizzes/courses/:courseId/quizzes
       GET  /api/quizzes/courses/:courseId/quizzes
       GET  /api/quizzes/courses/:courseId/quizzes/:quizId
       PATCH /api/quizzes/courses/:courseId/quizzes/:quizId
       DELETE /api/quizzes/courses/:courseId/quizzes/:quizId
  └─ Verify: creating a quiz also creates default QuizReward

STEP 4 — question CRUD in service (~20 min)
  └─ Implement: addQuestion, updateQuestion, deleteQuestion, reorderQuestions
  └─ Test:
       POST .../questions with 3 options, one correct
       PATCH .../questions/:id — change option text, verify old options deleted and new ones created
       DELETE .../questions/:id — verify options cascade deleted
       PATCH .../questions/reorder — verify order fields updated

STEP 5 — reward upsert in service (~10 min)
  └─ Implement upsertReward
  └─ Test: PUT .../reward with custom points → call GET quiz → verify reward is included

STEP 6 — submitAttempt and getMyAttempts (~20 min)
  └─ Implement scoring logic: fetch quiz, score answers, determine tier, create attempt
  └─ Test: submit attempt with all correct answers → verify scorePercentage = 100, pointsEarned = attempt1Points
  └─ Test: submit same quiz again → verify attemptNumber = 2, pointsEarned = attempt2Points
  └─ Test: submit with wrong questionId → verify 400 error

STEP 7 — quiz.controller.ts (~15 min)
  └─ Wire all service functions to controller handlers
  └─ Confirm: all routes return correct HTTP status codes (201 for creates, 204 for deletes, 200 for reads/updates)

STEP 8 — Frontend: lib/api/quiz.ts (~15 min)
  └─ Implement all typed fetch helpers
  └─ Test in browser console: import and call fetchQuizzes() for a known courseId

STEP 9 — Frontend: Quiz List Tab page (~30 min)
  └─ Build quiz/page.tsx: list view, create modal, delete with confirm
  └─ Test: create a quiz via UI → navigates to builder page
  └─ Test: delete a quiz → disappears from list

STEP 10 — Frontend: Quiz Builder page — Sidebar (~25 min)
  └─ Build the left sidebar: question list, active highlight, add question button
  └─ Wire to addQuestion API: clicking "Add Question" creates a question and selects it
  └─ Test: add 3 questions → verify all appear in sidebar

STEP 11 — Frontend: Quiz Builder page — Question Editor (~40 min)
  └─ Build the right panel: question textarea, options list, add option, correct toggle, delete
  └─ Wire auto-save on blur: updateQuestion called when user tabs away from any field
  └─ Wire correct-answer toggle: onChange immediately saves
  └─ Test: type question text → click away → refresh page → text persists
  └─ Test: mark option as correct → refresh → correct option preserved
  └─ Test: try to blur with no correct option → warning shown, API not called

STEP 12 — Frontend: RewardsPanel (~20 min)
  └─ Build the modal overlay with four number inputs
  └─ Wire to upsertReward API
  └─ Test: open rewards → change points → save → reopen → verify values persisted

STEP 13 — End-to-end smoke test (~15 min)
  └─ Create course → navigate to quiz tab → create quiz → add 5 questions → mark answers → set rewards
  └─ Via Postman: submit a student attempt → verify correct scoring
  └─ Verify: delete a question → question removed from sidebar, not selectable
  └─ Verify: reorder questions → order persists after page refresh
```

---

## 7. Edge Cases & Validation Rules

Document these cases — handle each explicitly in the service layer:

### Quiz creation
- A course can have multiple quizzes (no unique constraint on courseId in Quiz)
- Quiz title must not be empty after trim
- Creating a quiz always creates a default QuizReward — never leave a quiz without a reward record

### Question management
- Minimum 2 options per question enforced at service level (throw 400 if fewer)
- Maximum 6 options per question (throw 400 if more)
- At least 1 option must be `isCorrect: true` — throw 400 with message "At least one correct option is required"
- When updating options: the entire options array is replaced (delete all + recreate) — this is intentional for hackathon simplicity
- Question order values are 0-indexed integers — gaps are acceptable (reorder fixes them)

### Reordering
- `orderedIds` array must contain only IDs that belong to this quiz — filter and only update matching ones, ignore unknown IDs
- After reorder, the frontend should immediately update local state (optimistic update) rather than re-fetching

### Attempt submission
- A user can attempt the same quiz unlimited times — no cap
- Answers array must have exactly one answer per question (by questionId uniqueness)
- If a submitted `optionId` does not belong to the specified `questionId`, throw 400 "Invalid answer: option does not belong to question"
- `pointsEarned` is based on tier (attempt number), NOT on score — even a 0% score attempt earns tier-based points. This is intentional (rewards participation, not just performance). The `scorePercentage` is returned for display but does not affect points.

### Cascade deletes (Prisma handles these via schema):
- Deleting a Quiz cascades to: Questions → QuestionOptions, QuizReward, QuizAttempts → QuizAnswers
- Deleting a Question cascades to: QuestionOptions
- Deleting a Course (already handled in course module) cascades to all its quizzes

### Concurrency / Race conditions (hackathon scope: acknowledge, don't fully solve)
- Two instructors editing the same quiz simultaneously can cause order conflicts
- For hackathon: last-write-wins is acceptable
- Do NOT implement optimistic locking

### Empty quiz
- A quiz with 0 questions can exist (it was just created)
- Student cannot attempt a quiz with 0 questions — service should throw 400 "Quiz has no questions"
- The builder UI should show a clear empty state when no questions exist

---

*End of QUIZ_BUILDER_PLAN.md — Estimated implementation time: ~4.5 hours (backend ~2h, frontend ~2.5h)*