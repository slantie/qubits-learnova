# Task: B6 — Quiz Flow (Learner Side)

**Location:** Inside the Lesson Player at `/courses/:courseId/lessons/:lessonId` (when `lesson.type = QUIZ`)
**Access:** Authenticated + enrolled learners

## Overview
The quiz-taking experience embedded inside the full-screen lesson player. Shows an intro screen, then one question per page with answer selection, and completes with points awarded and a popup.

---

## Backend

### API Endpoints

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/courses/:courseId/quizzes/:quizId` | Enrolled learner | Get quiz questions + rewards + previous attempt count |
| POST | `/api/courses/:courseId/quizzes/:quizId/attempt` | Enrolled learner | Submit a completed quiz attempt |

---

### `GET /api/courses/:courseId/quizzes/:quizId`

**Note:** This endpoint is used by the learner. The question's `correctOptions` must NOT be returned to the client (to prevent cheating). Only return the options array without marking correct ones.

**Response:**
```ts
{
  id: number
  title: string
  questions: {
    id: number
    text: string
    options: string[]    // NO correctOptions field
    order: number
  }[]
  rewards: {
    attempt1Points: number
    attempt2Points: number
    attempt3Points: number
    attempt4PlusPoints: number
  }
  previousAttempts: number   // how many times this user has attempted this quiz
}
```

---

### `POST /api/courses/:courseId/quizzes/:quizId/attempt`

**Body:**
```ts
{
  answers: {
    questionId: number
    selectedOption: number   // 0-based index into options[]
  }[]
}
```

**Logic:**
1. Fetch all `Question` records with `correctOptions` from DB (server-side only)
2. Count how many answers match correct options
3. Determine `attemptNumber`:
   - Count existing `QuizAttempt` records for `{ userId, quizId }` → `attemptNumber = count + 1`
4. Look up points from `QuizReward` based on `attemptNumber`:
   ```ts
   const points =
     attemptNumber === 1 ? rewards.attempt1Points :
     attemptNumber === 2 ? rewards.attempt2Points :
     attemptNumber === 3 ? rewards.attempt3Points :
                           rewards.attempt4PlusPoints
   ```
5. Create `QuizAttempt` record
6. Update `User.totalPoints += pointsEarned`
7. Recompute and update `User.currentBadge` using `computeBadge(totalPoints)`
8. Mark the quiz lesson as completed:
   - Upsert `LessonProgress { enrollmentId, lessonId, isCompleted: true }`
   - Check if all course lessons now complete → update enrollment status
9. Return:

```ts
{
  pointsEarned: number
  attemptNumber: number
  totalPoints: number         // user's new total
  currentBadge: string | null
  nextBadge: string | null
  badgeProgressPercent: number
  courseCompleted: boolean    // true if this was the last lesson
}
```

---

## Frontend

### Component: `components/website/lesson-player/QuizView.tsx`

Rendered inside `<LessonContent />` when `lesson.type === 'QUIZ'`.

This component manages the entire quiz flow with local state. It does NOT navigate away — the quiz runs in-place inside the player.

#### Props
```ts
interface QuizViewProps {
  courseId: number
  quizId: number
  lessonId: number
  onComplete: (result: QuizResult) => void  // called after quiz completes; triggers PointsPopup
}
```

#### State machine
```ts
type QuizPhase = 'intro' | 'question' | 'completed'

const [phase, setPhase] = useState<QuizPhase>('intro')
const [quizData, setQuizData] = useState<QuizData | null>(null)
const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
const [answers, setAnswers] = useState<{ questionId: number; selectedOption: number }[]>([])
const [selectedOption, setSelectedOption] = useState<number | null>(null)
const [isSubmitting, setIsSubmitting] = useState(false)
```

#### On mount
- `GET /api/courses/:courseId/quizzes/:quizId` → populate `quizData`

---

### Quiz Phases

#### Phase 1 — Intro Screen (`phase === 'intro'`)

Displays:
- Quiz title
- Total number of questions: "This quiz has **X questions**"
- Attempt info: "Multiple attempts are allowed"
- Previous attempt notice (if `previousAttempts > 0`): "You have attempted this quiz **N** time(s)"
- Points info: "Points decrease with each attempt — do your best on the first try!"
- **Start Quiz** button → `setPhase('question')`

---

#### Phase 2 — Question Pages (`phase === 'question'`)

Shows one question at a time.

**Layout:**
- Progress indicator: "Question 3 of 8" (top)
- Question text (large, readable)
- Answer options as clickable option cards (A, B, C, D style):
  - Default: outlined card
  - Selected: filled/highlighted card (accent border)
  - Only one option selectable at a time
- **Proceed** button (or "Proceed and Complete Quiz" on last question):
  - Disabled until an option is selected
  - On click:
    - Append `{ questionId, selectedOption }` to `answers`
    - Reset `selectedOption` to null
    - If not last question: `setCurrentQuestionIndex(i + 1)`
    - If last question: submit quiz

**Submit logic (last question):**
```ts
setIsSubmitting(true)
const result = await api.post(`/courses/${courseId}/quizzes/${quizId}/attempt`, { answers })
setPhase('completed')
onComplete(result)  // triggers PointsPopup in parent
```

---

#### Phase 3 — Completed

Briefly shows:
- "Quiz Completed ✓" with checkmark
- "You earned **X points**"

Then the `onComplete` callback triggers the `<PointsPopup />` (see B7), which overlays the entire player.

The sidebar should update to show a blue checkmark on this quiz lesson.

---

### Answer Option Card: `components/website/lesson-player/AnswerOption.tsx`
```ts
interface AnswerOptionProps {
  index: number         // 0-3 → 'A', 'B', 'C', 'D'
  text: string
  isSelected: boolean
  onSelect: () => void
  disabled?: boolean    // true while submitting
}
```

Shows: prefix letter (A/B/C/D in a circle) + option text.

---

### Re-attempt
After the popup closes (see B7), the quiz view should reset to `phase === 'intro'` so the learner can attempt again. The intro screen will now show the updated `previousAttempts` count (refetch quiz data on re-open).
