# Task: B4 — Ratings & Reviews Tab

**Location:** `/courses/:courseId` → Ratings & Reviews Tab
**Access:** View: All | Submit: Authenticated + enrolled learners

## Overview
Community reviews for a course, embedded as a tab inside the Course Detail Page. Shows aggregate star rating, review list, and an "Add Review" form for enrolled learners.

---

## Backend

### API Endpoints

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/courses/:courseId/reviews` | All | List reviews with aggregate rating |
| POST | `/api/courses/:courseId/reviews` | Authenticated (enrolled) | Submit a review |
| DELETE | `/api/courses/:courseId/reviews/:reviewId` | ADMIN or review owner | Delete a review |

---

### `GET /api/courses/:courseId/reviews`

**Logic:**
- Return all reviews for the course ordered by `createdAt DESC`
- Compute aggregate: `averageRating`, `reviewCount`, and distribution (count per 1–5 star)

**Response:**
```ts
{
  averageRating: number | null   // null if no reviews
  reviewCount: number
  distribution: {
    1: number, 2: number, 3: number, 4: number, 5: number
  }
  reviews: {
    id: number
    userId: number
    userName: string
    rating: number         // 1-5
    reviewText: string | null
    createdAt: string
    isOwn: boolean         // true if req.user.id === review.userId
  }[]
}
```

---

### `POST /api/courses/:courseId/reviews`

**Body:**
```ts
{
  rating: number     // 1-5, integer, required
  reviewText?: string
}
```

**Validation:**
- `rating` must be integer between 1 and 5 (zod: `z.int().min(1).max(5)`)
- User must be enrolled: check `Enrollment { userId, courseId }` exists → 403 if not

**Logic:**
- Upsert (one review per user per course — `@@unique([userId, courseId])`)
- Return created/updated review

---

### `DELETE /api/courses/:courseId/reviews/:reviewId`

**Logic:**
- ADMIN: can delete any
- Learner: can only delete own (`review.userId === req.user.id`) → 403 otherwise

---

## Frontend

### Component: `components/website/course-detail/RatingsReviewsTab.tsx`

Rendered inside the Ratings & Reviews tab.

#### Props
```ts
interface RatingsReviewsTabProps {
  courseId: number
  isEnrolled: boolean
  isAuthenticated: boolean
}
```

#### State
```ts
const [reviewData, setReviewData] = useState<ReviewData | null>(null)
const [isFormOpen, setIsFormOpen] = useState(false)
const [submitting, setSubmitting] = useState(false)
```

#### On mount
- `GET /api/courses/:courseId/reviews` → populate `reviewData`

---

### UI Sections

#### 1. Aggregate Rating Block

```
★★★★☆   4.2 / 5     (32 reviews)

★★★★★  ███████████  18
★★★★☆  ████████     10
★★★☆☆  ██           3
★★☆☆☆  █            1
★☆☆☆☆               0
```

- Star display component: renders filled/half/empty stars
- Rating distribution: horizontal bars (relative widths)

---

#### 2. Add Review Button

Conditions for showing:
- User is authenticated AND enrolled: show "Write a Review" button
- User is authenticated but not enrolled: show nothing (or muted "Enroll to leave a review")
- Guest: show "Login to leave a review" → links to `/login`

**"Write a Review" button** → expands `<AddReviewForm />`

---

#### 3. `components/website/course-detail/AddReviewForm.tsx`

A card/panel that expands when "Write a Review" is clicked.

**Fields:**
- **Star rating selector** — 5 clickable star icons
  - Hover effect: fills stars up to hovered position
  - Selected rating highlighted in yellow/gold
- **Review text** — optional `<textarea>` (placeholder: "Share your experience...")
- **Submit** button — disabled until a rating (1–5) is selected
- **Cancel** button — collapses the form

**On submit:**
1. `POST /api/courses/:courseId/reviews`
2. Refresh review list (or optimistic insert)
3. Show success toast: "Your review has been submitted"
4. Collapse form

---

#### 4. Reviews List: `components/website/course-detail/ReviewsList.tsx`

Each review card:
- **User avatar** (initials circle, colored by first letter)
- **User name** — bold
- **Star rating** — filled stars
- **Review text** — shown below
- **Date** — e.g., "March 15, 2026"
- **Delete** button — shown only if `isOwn = true` or user is ADMIN

Sort: newest first (server-side, already ordered by `createdAt DESC`)

---

### Star Rating Component: `components/shared/StarRating.tsx`
```ts
interface StarRatingProps {
  value: number          // 0-5, supports half stars for display
  interactive?: boolean  // if true: clickable for selection
  onChange?: (rating: number) => void
  size?: 'sm' | 'md' | 'lg'
}
```
