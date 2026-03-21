# Task: B7 — Points Popup & Course Completion

**Location:** Overlay on `/courses/:courseId/lessons/:lessonId`
**Access:** Authenticated learners (triggered after quiz completion or course completion)

## Overview
Two related UI moments:
1. **Points Popup** — shown immediately after a quiz is completed. Celebrates points earned and shows badge progress.
2. **Course Completion** — shown when ALL lessons (including quizzes) are done. Shows a completion banner with a "Complete This Course" button.

---

## Backend

(No new endpoints — uses the response from `POST /api/courses/:courseId/quizzes/:quizId/attempt` in B6 and `POST /api/courses/:courseId/lessons/:lessonId/progress` in B5)

The API response for quiz attempt already returns:
```ts
{
  pointsEarned: number
  attemptNumber: number
  totalPoints: number
  currentBadge: string | null
  nextBadge: string | null
  badgeProgressPercent: number
  courseCompleted: boolean
}
```

The API response for lesson progress returns:
```ts
{
  completionPercent: number
  courseCompleted: boolean
}
```

---

## Frontend

### Component: `components/website/lesson-player/PointsPopup.tsx`

Triggered by `QuizView.onComplete(result)` in the lesson player page.

#### Props
```ts
interface PointsPopupProps {
  isOpen: boolean
  pointsEarned: number
  totalPoints: number
  currentBadge: string | null
  nextBadge: string | null
  badgeProgressPercent: number
  onClose: () => void
}
```

---

### Points Popup UI

Rendered as a centered modal overlay (shadcn `Dialog` without close-on-outside-click).

**Layout:**
```
🎉  You earned 10 points!

[Animated number counter: 0 → 10]

Total Points: 142

Current Badge: ● Expert
Progress to Master:
[████████████████░░░░]  142 / 120 ← wait this shows remaining

"Keep learning to unlock the next badge!"

[Continue] button
```

**Details:**
- **Points earned number** — animated count-up using a simple `useEffect` + `requestAnimationFrame`
- **Badge display** — colored circle + badge name (use badge color from B2)
- **Progress bar** — shadcn `Progress` with `badgeProgressPercent` value
- If at max badge (Master): "🎉 You've reached the highest badge — Master!" with confetti or star icon
- **"Continue" button** → calls `onClose()` which dismisses the popup

---

### Animation Notes
- Popup entrance: fade-in + slight scale-up (CSS keyframe or Tailwind `animate-in`)
- Points counter: 600ms count-up animation
- Progress bar: transition from 0 → actual value over 800ms on mount

---

### Component: `components/website/lesson-player/CourseCompletionBanner.tsx`

Shown **in the main lesson area** (below content) when ALL lessons are completed.

This is NOT a popup — it's an in-page banner/card.

#### Props
```ts
interface CourseCompletionBannerProps {
  courseId: number
  enrollmentId: number
  isVisible: boolean
  onComplete: () => void
}
```

#### UI
```
🏆  You've completed all lessons!

[Complete This Course] button
```

**"Complete This Course" button behavior:**
1. Calls `POST /api/courses/:courseId/lessons/:lessonId/progress { isCompleted: true }` (already done for the last lesson — this is just the enrollment-level completion, which the API handles automatically)
2. Actually, this button triggers a dedicated endpoint or simply updates UI state since completion is already tracked server-side
3. Shows a success state: "Course Completed ✓" with green checkmark

**After clicking:**
- Button changes to "Course Completed ✓" (disabled, green)
- Enrollment `status` is already `COMPLETED` on the server (set when all lessons were marked complete)
- This is reflected immediately in the Reporting Dashboard (B8)

---

### Dedicated Course Completion Endpoint

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/api/enrollments/:enrollmentId/complete` | Enrolled learner | Explicitly mark course as complete |

**`POST /api/enrollments/:enrollmentId/complete`**

**Logic:**
- Verify enrollment belongs to `req.user.id`
- Check all lessons are completed (all `LessonProgress.isCompleted = true`)
- If not all complete → 422 "Not all lessons are completed"
- Update `Enrollment { status: 'COMPLETED', completedAt: now() }`
- Return `{ completedAt: string }`

---

### Integration in Lesson Player (`B5`)

In `app/(website)/courses/[courseId]/lessons/[lessonId]/page.tsx`:

```tsx
const [quizResult, setQuizResult] = useState<QuizResult | null>(null)
const [courseCompleted, setCourseCompleted] = useState(false)

// After mark-complete API call:
// if (response.courseCompleted) setCourseCompleted(true)

// After quiz completion:
// setQuizResult(result)
// if (result.courseCompleted) setCourseCompleted(true)

return (
  <>
    <LessonContent ... />
    {courseCompleted && <CourseCompletionBanner ... />}
    {quizResult && (
      <PointsPopup
        isOpen={!!quizResult}
        onClose={() => setQuizResult(null)}
        {...quizResult}
      />
    )}
  </>
)
```

---

### Badge Upgrade Notification

If `currentBadge` returned from the quiz attempt API is **different** from the badge before the attempt (i.e., user levelled up), show an additional celebratory message in the Points Popup:

```
🆕 You've earned a new badge: Explorer!
```

To detect this: compare `prevBadge` (stored before API call) with `result.currentBadge`. If they differ and `result.currentBadge` is not null → badge upgrade occurred.
