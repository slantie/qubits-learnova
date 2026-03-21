# Task: Implement Quiz Marking System

## Context

Learnova LMS. Stack: Express + Prisma + PostgreSQL. Auth and RBAC already wired.
The `QuizAttempt` model exists. Extend it and implement the scoring logic inside `submitAttempt` in `apps/server/src/modules/quiz/quiz.service.ts`.

---

## Schema changes

Add these fields to the existing `QuizAttempt` model in `schema.prisma`. Do not remove or rename anything.

```
scorePct          Float    — correct answers / total questions, stored as 0.0–1.0
sfSnapshot        Float    — score factor at submission time
tfSnapshot        Float    — trajectory factor at submission time  
cfSnapshot        Float    — consistency factor at submission time
compositeSnapshot Float?   — null for attempt 1, composite value for attempt 2+
```

After editing: `npx prisma db push && npx prisma generate`

---

## Scoring logic

### Attempt 1 — direct scoring, no composite

```
scorePct    = correctCount / totalQuestions
pointsEarned = round(tierPoints[0] × scorePct)
sfSnapshot   = scorePct
tfSnapshot   = 0.5        ← stored as neutral, not used in calculation
cfSnapshot   = 1.0        ← stored as neutral, not used in calculation
compositeSnapshot = null
```

### Attempt 2+ — composite scoring

```
scorePct    = correctCount / totalQuestions

prevScorePct    = scorePct of the immediately preceding attempt (already in DB, frozen)
historicalAvg   = mean scorePct of ALL attempts before this one (already in DB, frozen)

sfSnapshot  = scorePct
tfSnapshot  = clamp((scorePct - prevScorePct + 1) / 2,  0, 1)
cfSnapshot  = clamp(1 - abs(scorePct - historicalAvg),  0, 1)

compositeSnapshot = (sfSnapshot × 0.55) + (tfSnapshot × 0.30) + (cfSnapshot × 0.15)

pointsEarned = max(1, round(tierMax × compositeSnapshot))
```

### Tier max points

```
attemptNumber 1 → 15
attemptNumber 2 → 10
attemptNumber 3 → 7
attemptNumber 4+ → 4
```

Use `attemptNumber = existingAttemptCount + 1` (count completed attempts for this userId + quizId before inserting).

---

## What to implement

### 1. `submitAttempt` in `quiz.service.ts`

Replace or fill in the existing stub. Steps in order:

1. Fetch quiz with all questions and their options (need correct option IDs for scoring)
2. Validate: answers array length equals question count — throw 400 if not
3. Validate: each `optionId` belongs to the specified `questionId` — throw 400 if not
4. Count `correctCount` by checking `QuestionOption.isCorrect` for each submitted optionId
5. Compute `scorePct = correctCount / totalQuestions`
6. Get `attemptNumber = (await prisma.quizAttempt.count({ where: { userId, quizId } })) + 1`
7. Get `tierMax` from the table above
8. If `attemptNumber === 1`: use direct scoring formula
9. If `attemptNumber >= 2`:
   - Fetch previous attempt (most recent by `completedAt desc`) → get `prevScorePct`
   - Fetch all previous attempts → compute `historicalAvg` as mean of their `scorePct` values
   - Compute tf, cf, composite as above
10. Create `QuizAttempt` with nested `QuizAnswer` records and all snapshot fields
11. Trigger badge check (fire-and-forget, do not await): sum all `pointsEarned` for this user across all quizzes, then upsert any newly crossed `BadgeDefinition` thresholds into `UserBadge`
12. Return:

```typescript
{
  id, attemptNumber, pointsEarned,
  scorePct, correctCount, totalQuestions,
  sfSnapshot, tfSnapshot, cfSnapshot, compositeSnapshot,
  completedAt
}
```

### 2. Add `scorePct` field to `QuizAttempt` select wherever it is returned in `getMyAttempts`

---

## Constraints

- Past attempt rows are never updated after creation — all snapshot fields are write-once
- `compositeSnapshot` is null for attempt 1 — handle this in any frontend display
- `pointsEarned` minimum is 1 (never zero) for attempt 2+; attempt 1 can be 0 if score is 0%
- Badge check must not block the attempt response — use `Promise` without `await` or push to a background queue
