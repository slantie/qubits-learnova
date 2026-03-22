# Qubits Learnova

A full-stack eLearning platform built with Next.js, Express, and PostgreSQL. Learnova supports multi-role course management (admin, instructor, learner), rich content delivery across 13 lesson types, gamification via badges and points, Razorpay payment integration, and a dedicated video microservice for async HLS transcoding.

---

## Project Demo

> **Walkthrough video** — _link will be updated as the project progresses_
>
> 📹 **Demo:** [Watch on YouTube / Drive](#) _(coming soon)_

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Repository Structure](#repository-structure)
4. [Service: Client (Next.js Frontend)](#service-client-nextjs-frontend)
5. [Service: Server (Express API)](#service-server-express-api)
6. [Service: Video Microservice](#service-video-microservice)
7. [Database Schema](#database-schema)
8. [Authentication & Authorization](#authentication--authorization)
9. [Badge & Gamification System](#badge--gamification-system)
10. [Payment System](#payment-system)
11. [Environment Variables](#environment-variables)
12. [Running Locally](#running-locally)
13. [API Reference](#api-reference)

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│                       Browser                          │
│           Next.js App  (localhost:3000)                │
└──────────────────────────┬─────────────────────────────┘
                           │  REST (JWT Bearer)
                           ▼
┌────────────────────────────────────────────────────────┐
│           Express API Server  (localhost:4000)         │
│  Auth · Courses · Lessons · Sections · Quiz · Learner  │
│  Badges · Certificates · Payments · Coupons · Reports  │
└──────┬─────────────────────────────────────┬───────────┘
       │  Prisma ORM                         │  HTTP webhook callback
       ▼                                     ▼
┌─────────────┐               ┌──────────────────────────────┐
│  PostgreSQL │               │   Video Microservice          │
│  (Neon /    │               │   (localhost:4001)            │
│   local)    │               │   FFmpeg · BullMQ · Redis     │
└─────────────┘               │   S3 / MinIO object storage   │
                              └──────────────────────────────┘
```

The three services are independently deployable. The main API delegates video uploads to the video service and receives a webhook callback once transcoding completes. The frontend communicates exclusively with the main API over REST using JWT for authentication.

---

## Tech Stack


| Layer               | Technology                                    |
| ------------------- | --------------------------------------------- |
| Frontend framework  | Next.js 16 (App Router), React 19, TypeScript |
| Styling             | Tailwind CSS 4, `oklch` color tokens          |
| UI primitives       | shadcn/ui, Base UI, Radix UI                  |
| Icons               | Phosphor Icons                                |
| Rich text           | TipTap editor                                 |
| Video playback      | hls.js + custom `VideoPlayer` component       |
| Notifications       | Sonner (toast)                                |
| Backend framework   | Express.js 5, TypeScript                      |
| ORM                 | Prisma 7 (PostgreSQL adapter)                 |
| Database            | PostgreSQL (Neon in production)               |
| Auth                | JWT (jsonwebtoken), bcryptjs                  |
| Validation          | Zod                                           |
| Email               | Nodemailer (SMTP)                             |
| File / image upload | Multer + Cloudinary                           |
| Payments            | Razorpay                                      |
| Security            | Helmet, CORS, express-rate-limit              |
| Video processing    | fluent-ffmpeg, BullMQ, Redis, ioredis         |
| Video storage       | AWS S3 or MinIO (configurable)                |


---

## Repository Structure

```
qubits-learnova/
├── client/                    # Next.js 16 frontend
│   ├── app/                   # App Router pages
│   │   ├── (auth)/            # Login, signup, forgot-password, verify
│   │   ├── (website)/         # Learner-facing pages
│   │   ├── (backoffice)/      # Admin / instructor dashboard
│   │   ├── globals.css        # Tailwind base + CSS design tokens
│   │   └── layout.tsx         # Root layout (fonts, providers, SW)
│   ├── components/
│   │   ├── ui/                # Design-system primitives (button, badge, …)
│   │   ├── backoffice/        # Course builder, quiz builder, reporting UI
│   │   ├── learner/           # Course cards, lesson list, progress bar, …
│   │   └── badges/            # BadgeIcon, BadgesGrid
│   ├── hooks/                 # useAuth context, use-js-loaded
│   ├── lib/                   # api.ts client, formatDuration, utils
│   │   └── api/               # learner.ts, badges.ts helpers
│   ├── types/                 # Shared TypeScript interfaces & enums
│   └── public/                # Static assets, manifest, service worker
│
├── server/                    # Express API
│   ├── src/
│   │   ├── modules/           # Feature modules (one folder per domain)
│   │   │   ├── auth/
│   │   │   ├── courses/
│   │   │   ├── sections/
│   │   │   ├── lessons/
│   │   │   ├── quiz/
│   │   │   ├── learner/
│   │   │   ├── badges/
│   │   │   ├── certificates/
│   │   │   ├── payments/
│   │   │   ├── coupons/
│   │   │   ├── reporting/
│   │   │   ├── users/
│   │   │   └── webhooks/
│   │   ├── middleware/        # authenticate, authorize, validate, security, …
│   │   ├── lib/               # prisma, jwt, hash, mailer, cloudinary, multer
│   │   ├── config/            # AppError, badge definitions
│   │   ├── routes/            # Route aggregator (index.ts)
│   │   └── server.ts          # Express app entry point
│   └── prisma/
│       ├── schema.prisma      # All models and enums
│       └── migrations/        # SQL migration history
│
├── services/
│   └── video-service/         # Standalone transcoding microservice
│       ├── src/
│       ├── Dockerfile
│       └── docker-compose.yml
│
└── postman/                   # API collections (local, staging, production)
```

---

## Service: Client (Next.js Frontend)

The frontend runs on **port 3000** in development and uses the Next.js App Router with `'use client'` directives for all interactive components. Data fetching is exclusively client-side via the `lib/api.ts` wrapper.

### Route Groups

#### `(auth)/` — Public authentication pages


| Route              | Description                                                     |
| ------------------ | --------------------------------------------------------------- |
| `/login`           | Email + password login. On success stores JWT in localStorage.  |
| `/signup`          | Registers a new account and triggers an OTP verification email. |
| `/forgot-password` | Two-step flow: request OTP → enter OTP + new password.          |
| `/verify/[uid]`    | Email verification link handler.                                |


#### `(website)/` — Learner-facing pages


| Route                               | Description                                                                                                                                                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`                                 | Marketing homepage with hero, stats, and course CTA.                                                                                                                                                                           |
| `/courses`                          | Public course catalog with search and tag filter.                                                                                                                                                                              |
| `/courses/[courseId]`               | Course detail page. Left sidebar shows the lesson list with sections, completion state, and type icons. Main area renders the active lesson content (video, article, PDF, audio, quiz, iframe, etc.). Tabs: Overview, Reviews. |
| `/courses/[courseId]/quiz/[quizId]` | Quiz attempt page. Shows questions one at a time, submits answers, displays score and points earned.                                                                                                                           |
| `/my-courses`                       | Enrolled courses with progress bars.                                                                                                                                                                                           |
| `/profile`                          | Authenticated user profile: avatar, stats (points, enrollments, completions), member since date, earned badges.                                                                                                                |
| `/profile/[userId]`                 | Public read-only profile of any user.                                                                                                                                                                                          |
| `/badges`                           | Full badge collection grouped by category, with progress bars for unearned badges.                                                                                                                                             |
| `/leaderboard`                      | Points-based leaderboard table across all learners.                                                                                                                                                                            |


#### `(backoffice)/` — Admin & instructor dashboard


| Route                                                   | Description                                                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `/backoffice`                                           | Summary stats: total courses, learners, completions, active enrollments.                                      |
| `/backoffice/courses`                                   | Kanban view (columns: Draft, Published) and list view toggle. Compact course cards with hover-reveal actions. |
| `/backoffice/courses/[courseId]/edit`                   | Course editor with tabs: Content, Quiz, Attendees, Certificate.                                               |
| `/backoffice/courses/[courseId]/quiz/[quizId]`          | Quiz builder: question list + `QuestionEditor` + `RewardsPanel` for configuring per-attempt point awards.     |
| `/backoffice/courses/[courseId]/quiz/[quizId]/attempts` | Attempt analytics table for a quiz.                                                                           |
| `/backoffice/reporting`                                 | Enrollment reporting with per-course and per-participant views.                                               |
| `/backoffice/users`                                     | User table with role assignment.                                                                              |
| `/backoffice/coupons`                                   | Create, list, and deactivate discount coupons.                                                                |
| `/backoffice/settings`                                  | Platform-wide settings.                                                                                       |




---

## Service: Server (Express API)

The API server runs on **port 4000**. Every feature domain lives in its own module folder with a `routes`, `controller`, `service`, and `schema` file. The global route aggregator at `src/routes/index.ts` mounts all module routers under `/api`.

### Middleware Stack

Applied in this order for every request:

1. **Security** (`middleware/security.ts`) — Helmet (sets XSS, CSP, HSTS, referrer-policy headers), CORS (whitelisted origins from `CLIENT_URL`), `express-rate-limit` (100 requests per 15 min per IP), `compression`.
2. **Morgan** — HTTP request logging in `dev` or `combined` format.
3. **Body parsers** — `express.json()` and `express.urlencoded()` with a configurable size limit.
4. `**authenticate`** — Verifies the JWT from `Authorization: Bearer`. Attaches `req.user = { id, email, role }`. Returns 401 if missing or invalid.
5. `**optionalAuth**` — Same as `authenticate` but continues without a user on missing/invalid tokens. Used on public routes that have richer responses when logged in.
6. `**authorize(...roles)**` — Reads `req.user.role` and returns 403 if not in the allowed set.
7. `**validate(schema)**` — Runs a Zod schema against `req.body`. Returns 400 with per-field messages on failure.
8. `**errorHandler**` — Catches all errors propagated via `next(err)`. `AppError` instances become structured `{ message, code, statusCode }` JSON. All other errors become 500.
9. `**notFound**` — Returns 404 for unmatched routes.

### Module: `auth`

Handles user lifecycle from registration through password reset.

- `POST /auth/signup` — Hashes password with bcryptjs, creates `User` with `role: LEARNER`, generates a 6-digit OTP, stores its hash + 15-min expiry on the user record, and sends a verification email via Nodemailer.
- `POST /auth/login` — Looks up user by email, compares password hash, checks `isVerified`. Signs a JWT with `JWT_SECRET` and returns `{ token, user }`.
- `POST /auth/verify` — Accepts OTP from email link. Validates hash and expiry, sets `User.isVerified = true`.
- `POST /auth/forgot-password` — Generates a new OTP, stores hash + expiry, emails it.
- `POST /auth/reset-password` — Validates OTP, updates `User.passwordHash`.

### Module: `courses`

Full CRUD for courses with visibility and access-rule controls.

- `GET /courses` — Returns courses filtered by the caller's role. Learners see only published + visible courses. Instructors see their own courses. Includes `_count.lessons`, tags, cover image, and enrollment state for the caller.
- `POST /courses` — Admin/instructor only. Creates a course record. Accepts `title`, `description`, `tags`, `visibility`, `accessRule`, `price`, `earlyBirdPrice`, `earlyBirdLimit`, `certThreshold`.
- `GET /courses/:id` — Full course detail including sections → lessons tree. Uses `optionalAuth` to attach enrollment and lesson progress if the caller is enrolled.
- `PUT /courses/:id` — Update any course field. Handles cover image upload to Cloudinary.
- `DELETE /courses/:id` — Cascade deletes lessons, sections, enrollments, and quiz data.
- `POST /courses/:id/share-link` — Generates and returns a shareable URL for direct enrollment.
- `POST /courses/:id/enroll` — Enrolls the authenticated learner. Checks access rule (`OPEN` enrolls immediately; `ON_PAYMENT` requires a verified payment; `ON_INVITATION` requires a valid share token).
- `PUT /courses/:id/publish` — Toggles `isPublished`. ADMIN/INSTRUCTOR only.

### Module: `sections`

Ordered groupings of lessons within a course.

- `POST /courses/:courseId/sections` — Creates a new section at the end of the order.
- `PUT /courses/:courseId/sections/:id` — Updates `title`, `order`, `isLocked`, or `description`.
- `DELETE /courses/:courseId/sections/:id` — Deletes section; moves its lessons to unsectioned or deletes them.
- `POST /courses/:courseId/sections/reorder` — Accepts an ordered array of section IDs and updates `order` in bulk.

### Module: `lessons`

Content units within a course. The `type` field controls which fields are relevant.

- `GET /courses/:courseId/lessons` — Returns all lessons ordered by section then `order`. For authenticated learners, includes `isCompleted` per lesson.
- `POST /courses/:courseId/lessons` — Creates a lesson. For `VIDEO` type, delegates to the video service and sets `videoStatus: UPLOADING`.
- `PUT /courses/:courseId/lessons/:id` — Updates lesson content. For video lessons, accepts a new video upload.
- `DELETE /courses/:courseId/lessons/:id` — Removes lesson and its `LessonProgress` records.
- `POST /courses/:courseId/lessons/reorder` — Bulk reorder.
- `POST /courses/:courseId/lessons/:id/complete` — Marks `LessonProgress.isCompleted = true` for the calling learner. Updates `Enrollment.status` to `IN_PROGRESS` (or `COMPLETED` if all lessons done). Triggers `badgeService.evaluate()`.

### Module: `quiz`

Quiz definitions, question management, and attempt submission.

- `GET /courses/:courseId/quizzes` — Lists quizzes for a course with question count and reward config.
- `POST /courses/:courseId/quizzes` — Creates a quiz. Accepts `title` and optional `rewards` object.
- `PUT /courses/:courseId/quizzes/:quizId` — Updates title or rewards.
- `DELETE /courses/:courseId/quizzes/:quizId` — Deletes quiz and all attempts.
- `POST /courses/:courseId/quizzes/:quizId/questions` — Adds a question with `text`, `options[]`, `correctOptions[]` (zero-based indices), `order`.
- `PATCH /courses/:courseId/quizzes/:quizId/questions/:questionId` — Updates question fields.
- `DELETE /courses/:courseId/quizzes/:quizId/questions/:questionId` — Removes a question and re-indexes `correctOptions` on remaining questions.
- `POST /courses/:courseId/quizzes/:quizId/attempts` — Submits an attempt. Scores each answer against `correctOptions`, computes `scorePercent`, determines `pointsEarned` based on attempt number (1st attempt: max points, 4th+: minimum). Updates `User.totalPoints`, creates `QuizAttempt`, calls `badgeService.evaluate()`.
- `GET /courses/:courseId/quizzes/:quizId/attempts` — Returns all past attempts for the caller with score history.

### Module: `learner`

Learner-specific data endpoints.

- `GET /learner/courses` — Returns enrolled courses with `progressPct`, `completedLessons`, `incompleteLessons`, `totalLessons`, and enrollment `status`.
- `GET /learner/profile` — Returns the calling user's `totalPoints`, `currentBadge`, `enrollmentCount`, `completedCount`, and `badges` (earned badge keys with `earnedAt`).
- `GET /learner/users/:userId/profile` — Public version of the above, readable without authentication.

### Module: `badges`

- `GET /badges` — Returns all badge definitions enriched with the caller's earned/locked status, `earnedAt` timestamps, and progress counters for countable badges (e.g., courses completed, certificates earned, perfect quizzes, distinct learning days). Runs a set of parallel Prisma queries to assemble progress data in a single response.

Badge evaluation is triggered automatically from `lessons` and `quiz` modules — not as a direct API call. The service (`badge.service.ts`) runs all badge `check()` functions from `config/badges.ts` and batch-inserts newly earned `UserBadge` rows.

### Module: `certificates`

- `POST /courses/:courseId/certificate` — Checks the learner has completed the course and meets `certThreshold` (minimum quiz score). Generates a `Certificate` record with a UUID `uid` and the course's `templateKey`. Returns the certificate URL.
- `GET /certificates/:uid` — Public endpoint. Returns certificate metadata (learner name, course name, issued date, score) for the given UID — used for shareable certificate pages.
- `GET /courses/:courseId/my-certificate` — Returns the authenticated learner's certificate for a course if one exists.

### Module: `payments`

Razorpay integration for paid course access.

- `POST /payments/create-order` — Validates the course is `ON_PAYMENT`, optionally applies a coupon discount, creates a Razorpay order, stores a `Payment` record with `status: PENDING`, returns `{ orderId, amount, currency, key }`.
- `POST /payments/verify` — Receives `razorpayPaymentId`, `razorpayOrderId`, `razorpaySignature`. Verifies the HMAC-SHA256 signature using `RAZORPAY_KEY_SECRET`. On success: updates `Payment.status = COMPLETED`, creates the `Enrollment`, increments `Coupon.usedCount` if applicable.

### Module: `coupons`

Admin-only discount code management.

- `GET /coupons` — Lists all coupons with usage stats.
- `POST /coupons` — Creates a coupon: `code`, `courseId` (or global), `discountAmount`, `expiresAt`, `usageLimit`.
- `DELETE /coupons/:id` — Deactivates a coupon (`isActive = false`).
- `POST /coupons/validate` — Validates a coupon code for a given course. Returns the discount amount or an error if expired, exhausted, or invalid.

### Module: `reporting`

Analytics for backoffice dashboards.

- `GET /reporting/courses` — Per-course enrollment stats: total enrolled, in-progress, completed, and completion rate.
- `GET /reporting/courses/:courseId/participants` — Full participant table for a course: learner name, enrollment date, lessons completed, quiz scores, last activity.

### Module: `users`

- `GET /users` — Lists all users with id, name, email, role, and `createdAt`. Admin only.
- `PUT /users/:id/role` — Assigns a new role to a user. Admin only.

### Module: `webhooks`

- `POST /webhooks/video` — Receives transcoding result from the video microservice. Validates a shared `SERVICE_SECRET` header. Updates `Lesson.videoStatus`, `videoUrl` (HLS manifest path), `thumbnailUrl`, and `duration` on the corresponding lesson.

---

## Service: Video Microservice

An independent Express service (port **4001**) responsible for all video processing. It runs in Docker alongside Redis (job queue) and MinIO or S3 (object storage).

### Flow

```
Client uploads video
       │
       ▼
POST /upload  ─►  Multer saves raw file to disk temp
                        │
                        ▼
               BullMQ job pushed to Redis queue
                        │
                        ▼
              BullMQ Worker picks up job
                        │
                 ┌──────┴──────┐
                 │   FFmpeg    │
                 │  ─ Thumbnail (frame at 5s)
                 │  ─ HLS 360p segments + manifest
                 │  ─ HLS 720p segments + manifest
                 │  ─ HLS 1080p (if source allows)
                 │  ─ Master manifest (.m3u8)
                 └──────┬──────┘
                        │
              Upload all artifacts to S3 / MinIO
                        │
                        ▼
              POST /api/webhooks/video  ──►  Main API
              { lessonId, videoUrl, thumbnailUrl, duration, status }
```

The frontend polls `GET /courses/:courseId/lessons/:lessonId/video-status` on the main API to show a "Processing…" badge next to the lesson until `videoStatus` transitions to `READY`.

### Docker Compose (development)

```yaml
services:
  video-service:   # Node.js app + FFmpeg binary
  postgres:        # Can share the main DB or use a separate one
  redis:           # BullMQ job queue
  minio:           # S3-compatible local object storage
```

---

## Database Schema

All models are defined in `server/prisma/schema.prisma`.


| Model            | Key Fields                                                                                                                                                    | Purpose                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `User`           | `id`, `email`, `name`, `passwordHash`, `role`, `totalPoints`, `currentBadge`, `otpHash`, `otpExpiry`, `isVerified`                                            | All platform users across all roles                   |
| `Course`         | `id`, `title`, `tags[]`, `isPublished`, `visibility`, `accessRule`, `price`, `earlyBirdPrice`, `instructorId`, `certThreshold`                                | Course metadata and access control                    |
| `Section`        | `id`, `courseId`, `title`, `order`, `isLocked`                                                                                                                | Ordered, lockable groupings of lessons                |
| `Lesson`         | `id`, `courseId`, `sectionId`, `type`, `order`, `videoUrl`, `videoStatus`, `filePath`, `richContent`, `iframeUrl`, `quizBlockId`, `allowDownload`, `duration` | A single content unit; active fields depend on `type` |
| `Attachment`     | `id`, `lessonId`, `type` (`FILE`/`LINK`), `label`, `filePath`, `externalUrl`                                                                                  | Downloadable resources linked to a lesson             |
| `Quiz`           | `id`, `courseId`, `title`                                                                                                                                     | Quiz definition attached to a course                  |
| `Question`       | `id`, `quizId`, `text`, `options[]`, `correctOptions[]`, `order`                                                                                              | MCQ with multiple correct answers supported           |
| `QuizReward`     | `id`, `quizId`, `attempt1Points` … `attempt4PlusPoints`                                                                                                       | Per-attempt point awards for a quiz                   |
| `Enrollment`     | `id`, `userId`, `courseId`, `status`, `startedAt`, `completedAt`, `timeSpent`                                                                                 | Learner ↔ course relationship                         |
| `LessonProgress` | `id`, `enrollmentId`, `lessonId`, `userId`, `isCompleted`, `completedAt`                                                                                      | Per-lesson completion tracking                        |
| `QuizAttempt`    | `id`, `userId`, `quizId`, `attemptNumber`, `answers`, `scorePercent`, `pointsEarned`                                                                          | One row per quiz submission                           |
| `Review`         | `id`, `userId`, `courseId`, `rating`, `reviewText`                                                                                                            | Learner review; one per learner per course            |
| `Certificate`    | `id`, `uid`, `userId`, `courseId`, `templateKey`, `scorePercent`, `pointsEarned`, `issuedAt`                                                                  | Completion certificate with shareable UUID            |
| `UserBadge`      | `id`, `userId`, `badgeKey`, `category`, `earnedAt`                                                                                                            | Earned badge record; unique per user + key            |
| `Coupon`         | `id`, `code`, `courseId`, `discountAmount`, `expiresAt`, `usageLimit`, `usedCount`                                                                            | Discount codes for paid courses                       |
| `Payment`        | `id`, `userId`, `courseId`, `razorpayOrderId`, `razorpayPaymentId`, `amount`, `status`                                                                        | Razorpay transaction records                          |
| `Video`          | `id`, `status`, `rawKey`, `hlsKey`, `thumbnailKey`, `duration`, `resolutions`                                                                                 | Managed by the video microservice                     |


### Enums


| Enum               | Values                                                                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `Role`             | `ADMIN`, `INSTRUCTOR`, `LEARNER`                                                                                                               |
| `LessonType`       | `VIDEO`, `DOCUMENT`, `IMAGE`, `QUIZ`, `ARTICLE`, `PDF`, `AUDIO`, `QUIZ_BLOCK`, `ASSIGNMENT`, `LINK_BLOCK`, `IFRAME`, `SURVEY`, `FEEDBACK_GATE` |
| `Visibility`       | `EVERYONE`, `SIGNED_IN`                                                                                                                        |
| `AccessRule`       | `OPEN`, `ON_INVITATION`, `ON_PAYMENT`                                                                                                          |
| `EnrollmentStatus` | `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`                                                                                                      |
| `VideoStatus`      | `UPLOADING`, `UPLOADED`, `PROCESSING`, `READY`, `FAILED`                                                                                       |
| `BadgeCategory`    | `TIER`, `COURSE_MILESTONE`, `QUIZ_EXCELLENCE`, `SPEED`, `CERTIFICATION`, `DEDICATION`                                                          |


---

## Authentication & Authorization

The platform uses stateless JWT authentication. No sessions or refresh tokens in the current implementation.

1. On successful login the server signs `{ id, email, role }` with `JWT_SECRET` (default expiry: 7 days) and returns it.
2. The client stores the token in `localStorage` and sends it as `Authorization: Bearer <token>` on every API call.
3. `authenticate` middleware verifies the signature and expiry on protected routes. `authorize(...roles)` further gates by role.
4. Email verification and password reset both use a server-generated 6-digit OTP whose bcrypt hash and expiry are stored directly on the `User` record — no separate OTP table needed.

**Role capabilities summary:**


| Capability                 | LEARNER | INSTRUCTOR  | ADMIN |
| -------------------------- | ------- | ----------- | ----- |
| Browse / enroll in courses | ✓       | ✓           | ✓     |
| Create / edit own courses  | —       | ✓           | ✓     |
| Publish courses            | —       | ✓           | ✓     |
| View attendees & reporting | —       | own courses | all   |
| Manage users & roles       | —       | —           | ✓     |
| Manage coupons             | —       | —           | ✓     |


---

## Badge & Gamification System

Badges are defined statically in `server/src/config/badges.ts`. Each entry is a `BadgeDefinition` with a `key`, `name`, `category`, `description`, `trigger` label, and an async `check(userId, prisma, context)` function.

### Tier Badges (point thresholds)


| Badge Key         | Points Required |
| ----------------- | --------------- |
| `tier:newbie`     | 20              |
| `tier:explorer`   | 40              |
| `tier:achiever`   | 60              |
| `tier:specialist` | 80              |
| `tier:expert`     | 100             |
| `tier:master`     | 120             |


### Achievement Badges


| Category           | Badge         | Trigger                   |
| ------------------ | ------------- | ------------------------- |
| `COURSE_MILESTONE` | First Step    | Complete 1 course         |
| `COURSE_MILESTONE` | On Fire       | Complete 5 courses        |
| `COURSE_MILESTONE` | Scholar       | Complete 10 courses       |
| `COURSE_MILESTONE` | Collector     | Complete 25 courses       |
| `QUIZ_EXCELLENCE`  | Quiz Master   | 1 perfect quiz score      |
| `QUIZ_EXCELLENCE`  | Perfect Run   | 3 perfect quiz scores     |
| `SPEED`            | Speed Learner | Complete a course quickly |
| `CERTIFICATION`    | Certified     | Earn 1 certificate        |
| `CERTIFICATION`    | Multi-Cert    | Earn 3 certificates       |
| `DEDICATION`       | Early Bird    | Complete a lesson early   |
| `DEDICATION`       | Dedicated     | Learn on 7 distinct days  |
| `DEDICATION`       | Reviewer      | Submit 5 reviews          |


### Evaluation Flow

1. A learner completes a lesson or submits a quiz attempt.
2. The service handler calls `badgeService.evaluate(userId, context)`.
3. `evaluate()` loads all already-earned badge keys from `UserBadge`, runs all `check()` functions for unearned badges, and batch-inserts newly earned rows via `createMany({ skipDuplicates: true })`.
4. If any newly earned badge has `category === TIER`, the service calls `computeBadge(user.totalPoints)` to determine the highest reached tier and updates `User.currentBadge`.

---

## Payment System

Paid courses (`accessRule: ON_PAYMENT`) use Razorpay as the gateway.

1. Learner clicks **Buy** on the course page.
2. Frontend calls `POST /payments/create-order` with `{ courseId, couponCode? }`.
3. Server validates the coupon (if any), calculates final amount, calls `razorpay.orders.create()`, stores a `Payment` row (`status: PENDING`), returns `{ orderId, amount, currency, key }`.
4. Frontend initialises the Razorpay checkout widget with these values.
5. On user payment success, Razorpay returns `{ razorpayPaymentId, razorpayOrderId, razorpaySignature }` client-side.
6. Frontend calls `POST /payments/verify` with those three values.
7. Server reconstructs the signature as `HMAC-SHA256(orderId + "|" + paymentId, RAZORPAY_KEY_SECRET)` and compares to the provided signature.
8. On match: sets `Payment.status = COMPLETED`, creates the `Enrollment`, increments `Coupon.usedCount` if a coupon was used.

---

## Environment Variables

### Server (`server/.env`)

```env
NODE_ENV=development
PORT=4000
CLIENT_URL=http://localhost:3000

DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

BCRYPT_SALT_ROUNDS=10

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@example.com
SMTP_PASS=app_password
SMTP_FROM=Learnova <you@example.com>

MAX_FILE_SIZE=10485760

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

VIDEO_SERVICE_URL=http://localhost:4001
VIDEO_SERVICE_SECRET=shared_secret_between_services
```

### Client (`client/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_VIDEO_SERVICE_URL=http://localhost:4001/api
NEXT_PUBLIC_CLIENT_URL=http://localhost:3000
```

### Video Service (`services/video-service/.env`)

```env
PORT=4001
DATABASE_URL=postgresql://user:password@host/dbname
REDIS_URL=redis://localhost:6379
STORAGE_PROVIDER=minio
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=learnova-videos
MAIN_API_WEBHOOK_URL=http://localhost:4000/api/webhooks/video
SERVICE_SECRET=shared_secret_between_services
```

---

## Running Locally

### Prerequisites

- Node.js 20+
- PostgreSQL database (local or [Neon](https://neon.tech) free tier)
- Redis — only required for the video microservice
- FFmpeg — only required for the video microservice

### 1. Clone and install

```bash
git clone <repo-url>
cd qubits-learnova

cd server && npm install
cd ../client && npm install
```

### 2. Configure the server

```bash
cd server
cp .env.example .env
# Edit .env: set DATABASE_URL, JWT_SECRET, SMTP_*, CLOUDINARY_*, RAZORPAY_*
```

### 3. Run database migrations

```bash
cd server
npx prisma migrate dev      # apply all migrations
npx prisma generate         # regenerate the Prisma client
npx prisma db seed          # optional: seed demo data
```

### 4. Start the API server

```bash
cd server
npm run dev                 # ts-node-dev, hot-reloads on port 4000
```

### 5. Start the frontend

```bash
cd client
npm run dev                 # Next.js + Turbopack on port 3000
```

### 6. (Optional) Start the video microservice

```bash
cd services/video-service
cp .env.example .env        # configure Redis, MinIO/S3, SERVICE_SECRET
docker compose up           # starts video-service + Redis + MinIO
```

### Useful server scripts

```bash
npm run db:studio           # Prisma Studio GUI at localhost:5555
npm run db:push             # Push schema without creating migration files
npm run typecheck           # TypeScript type check without emitting
```

---

## API Reference

All endpoints are prefixed with `/api`. Full collection available in `postman/Learnova.postman_collection.json`.


| Group        | Base Path               | Auth                | Role              |
| ------------ | ----------------------- | ------------------- | ----------------- |
| Auth         | `/auth`                 | Public              | —                 |
| Courses      | `/courses`              | Optional / Required | varies            |
| Sections     | `/courses/:id/sections` | Required            | ADMIN, INSTRUCTOR |
| Lessons      | `/courses/:id/lessons`  | Required            | varies            |
| Quiz         | `/courses/:id/quizzes`  | Required            | varies            |
| Learner      | `/learner`              | Required            | LEARNER           |
| Badges       | `/badges`               | Required            | Any               |
| Certificates | `/certificates`         | Required            | Any               |
| Payments     | `/payments`             | Required            | LEARNER           |
| Coupons      | `/coupons`              | Required            | ADMIN             |
| Reporting    | `/reporting`            | Required            | ADMIN, INSTRUCTOR |
| Users        | `/users`                | Required            | ADMIN             |
| Webhooks     | `/webhooks`             | Service secret      | Internal          |
| Health       | `/health`               | Public              | —                 |


Error responses follow a consistent shape:

```json
{
  "message": "Human-readable description",
  "code": "MACHINE_READABLE_CODE",
  "statusCode": 400
}
```

Validation errors (400) include a `details` array with per-field messages from Zod.

---

## Team Details

| Name | GitHub |
|------|--------|
| Kandarp Gajjar | [@slantie](https://github.com/slantie) |
| Harsh Dodiya | [@HarshDodiya1](https://github.com/HarshDodiya1) |
| Ridham Patel | [@ridh21](https://github.com/ridh21) |
