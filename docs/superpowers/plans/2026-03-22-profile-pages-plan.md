# Implementation Plan: Profile Pages
Date: 2026-03-22
Branch: feat/badge-system

## Overview
Add a My Profile page (`/profile`) and a Public Profile page (`/profile/[userId]`) to Learnova.
The public profile is accessible without login. Both show earned badges prominently.

---

## Phase 1: Backend — Public Profile API Endpoint

### What to implement

**File:** `server/src/modules/learner/learner.service.ts`
Add `getPublicProfile(userId: number)` after the existing `getProfile` function.
- Queries `User` selecting: `id, name, totalPoints, currentBadge, createdAt` (NO email — privacy)
- Counts `enrollment` (total) and enrollment with `status: 'COMPLETED'`
- Fetches `userBadge` rows for earned badges
- Returns `{ user: { id, name, createdAt }, totalPoints, currentBadge, enrollmentCount, completedCount, badges }`
- Throws `AppError(404, 'User not found', 'USER_NOT_FOUND')` if not found

**File:** `server/src/modules/learner/learner.controller.ts`
Add `getPublicProfile` handler:
```ts
export const getPublicProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const profile = await learnerService.getPublicProfile(userId);
    res.json(profile);
  } catch (err) { next(err); }
};
```

**File:** `server/src/modules/learner/learner.routes.ts`
Add route (NO authenticate, public):
```ts
router.get('/users/:userId/profile', ctrl.getPublicProfile);
```
Place this BEFORE the `/profile` authenticated route to avoid param collision.

### Pattern reference
- Copy service pattern from `learner.service.ts:399-432` (getProfile)
- Copy controller pattern from `learner.controller.ts:90-95`
- Copy route pattern from `learner.routes.ts` public routes (e.g. `router.get('/', optionalAuth, ctrl.listCourses)`)

### Verification
- `GET /api/learner/users/1/profile` returns 200 with `{ user: { id, name, createdAt }, totalPoints, ... }`
- Response does NOT contain `email` field
- `GET /api/learner/users/99999/profile` returns 404

---

## Phase 2: Client Types & API Function

### What to implement

**File:** `client/types/index.ts`
1. Update `UserProfile` — add `createdAt: string` to the `user` sub-object
2. Add new `PublicProfile` interface (no email):
```ts
export interface PublicProfile {
  user: { id: number; name: string | null; createdAt: string };
  totalPoints: number;
  currentBadge: string | null;
  enrollmentCount: number;
  completedCount: number;
  badges: EarnedBadge[];
}
```

**File:** `client/lib/api/learner.ts`
Add `fetchPublicProfile` function:
```ts
export const fetchPublicProfile = async (userId: number): Promise<PublicProfile> => {
  return api.get(`/learner/users/${userId}/profile`);
};
```
Also import `PublicProfile` in the type imports at the top.

### Pattern reference
- `fetchProfile` at `client/lib/api/learner.ts:68-70`
- `UserProfile` interface at `client/types/index.ts:174-181`

### Verification
- `fetchPublicProfile(1)` resolves correctly in browser
- TypeScript compiles with no errors: `npx tsc --noEmit`

---

## Phase 3: My Profile Page `/profile`

### What to implement

**New file:** `client/app/(website)/profile/page.tsx`

Full-page authenticated profile view. Pattern: follow `badges/page.tsx` for layout.

Layout sections (top to bottom):
1. **Hero banner** — gradient bg, large initials avatar (size-20), name, "Member since [month year]", role chip
2. **Stats row** — 3 cards: Total Points (amber), Courses Enrolled (primary), Completed (emerald)
3. **Earned Badges section** — heading + `<BadgesGrid badges={badgeList} />` (full mode, all 18 badges)

Data fetching:
- `useEffect` → `fetchProfile()` → store in `profile` state
- Second `useEffect` → `fetchBadges()` → store in `badgeList` state
- Use `isLoading` guard with Skeleton fallback
- If no auth (`!user` from `useAuth()`), redirect or show "Please log in"

Key imports: `useAuth`, `fetchProfile`, `fetchBadges`, `BadgesGrid`, `Skeleton`, lucide icons (`Trophy`, `BookOpen`, `CheckCircle2`, `User`).

### Pattern reference
- `client/app/(website)/badges/page.tsx` — full page layout, useEffect + setState pattern
- `client/components/learner/ProfilePanel.tsx` — two useEffects, stats display
- `client/app/(website)/layout.tsx:16-50` — initials computation pattern

### Verification
- `/profile` renders without errors
- Shows real user data (name, points, enrolled count, completed count)
- BadgesGrid renders all 18 badges with earned/locked state

---

## Phase 4: Public Profile Page `/profile/[userId]`

### What to implement

**New file:** `client/app/(website)/profile/[userId]/page.tsx`

Public profile view — no auth required, no email shown.

Props: `params: { userId: string }`

Layout sections (same visual structure as Phase 3, minus email):
1. **Hero banner** — initials avatar, name, "Member since [month year]", tier badge chip
2. **Stats row** — Total Points, Courses Enrolled, Completed
3. **Earned Badges** — show only earned badges using `BadgeIcon` in a flex-wrap row (no full BadgesGrid since we only have `EarnedBadge[]`, not `BadgeStatusItem[]`)

Data fetching:
- `useEffect` → `fetchPublicProfile(parseInt(userId))` → store in `profile` state
- Handle 404: show "User not found" message
- `isLoading` guard with Skeleton

Key imports: `fetchPublicProfile`, `BadgeIcon`, `Skeleton`, lucide icons.

### Pattern reference
- Phase 3 page as the primary pattern
- `BadgeIcon` component usage: `<BadgeIcon badgeKey={b.badgeKey} size="sm" showLabel />`

### Verification
- `/profile/1` renders without errors when not logged in
- Does NOT show email
- Shows correct earned badges
- `/profile/99999` shows "User not found" state

---

## Phase 5: Add "My Profile" to Navigation

### What to implement

**File:** `client/app/(website)/layout.tsx`

In the `UserMenu` component's dropdown, add a "My Profile" link:
```tsx
<Link
  href="/profile"
  onClick={() => setOpen(false)}
  className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors"
>
  <User className="size-4 text-muted-foreground" />
  My Profile
</Link>
```
Place it as the FIRST item in the dropdown (before Backoffice check).

Also add `User` to the existing lucide-react imports in the file.

### Pattern reference
- Existing dropdown links at `client/app/(website)/layout.tsx:60-88`
- Same className pattern as "My Learning" and "Leaderboard" links

### Verification
- User menu dropdown shows "My Profile" as first item
- Clicking it navigates to `/profile`
- Icon renders correctly

---

## Anti-Patterns to Avoid
- Do NOT use `req.user.id` in the public profile route (no auth middleware)
- Do NOT expose `email` in `getPublicProfile` response
- Do NOT import `authenticate` in the public route handler
- Do NOT use `BadgesGrid` in the public profile page (it requires `BadgeStatusItem[]`; public API only returns `EarnedBadge[]`)
- Do NOT add `createdAt` to the server's existing `getProfile` select without also updating the `UserProfile` client type

---

## Commit Strategy
- Phase 1: `feat: add public profile API endpoint`
- Phases 2-5: `feat: add profile pages and nav link`
