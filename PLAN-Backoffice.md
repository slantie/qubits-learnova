# Learnova — Backoffice Core: Complete Implementation Plan

> **Scope:** A1 Courses Dashboard → A2 Course Form → A3+A4 Content Management + Lesson Editor → A5 Options Tab → A6+A7 Quiz Builder → A8 Reporting Dashboard
>
> **Auth:** Already done. RBAC middleware assumed wired.
> **Video Streaming:** Already built as a separate microservice (`services/video-service`, port 4001). This plan references it — do NOT rebuild it.
> **Rule:** Never break existing schema. Schema additions only, no destructive changes.

---

## Table of Contents

1. [Monorepo / Folder Structure](#1-monorepo--folder-structure)
2. [Database Schema — Additions Only](#2-database-schema--additions-only)
3. [Backend — API Routes & Services](#3-backend--api-routes--services)
4. [Frontend — Pages & Components](#4-frontend--pages--components)
5. [Video Service Integration (Webhook + JWT)](#5-video-service-integration-webhook--jwt)
6. [Implementation Order](#6-implementation-order)

---

## 1. Monorepo / Folder Structure

Your existing project is a monolith (port 4000) alongside the video service (port 4001). New files are marked `[NEW]`. Existing files that need additions are marked `[MODIFY]`.

```
learnova/
├── apps/
│   └── server/                          ← Main monolith (Express / Fastify, port 4000)
│       ├── src/
│       │   ├── config/
│       │   │   └── env.ts               [MODIFY] add VIDEO_SERVICE_URL, SERVICE_AUTH_SECRET
│       │   ├── middleware/
│       │   │   ├── auth.ts              [EXISTS] session/JWT user auth — keep as-is
│       │   │   └── rbac.ts              [EXISTS] role guard — keep as-is
│       │   ├── modules/
│       │   │   ├── auth/                [EXISTS] — untouched
│       │   │   ├── course/
│       │   │   │   ├── course.router.ts         [NEW]
│       │   │   │   ├── course.controller.ts     [NEW]
│       │   │   │   ├── course.service.ts        [NEW]
│       │   │   │   └── course.schema.ts         [NEW] Zod validation
│       │   │   ├── lesson/
│       │   │   │   ├── lesson.router.ts         [NEW]
│       │   │   │   ├── lesson.controller.ts     [NEW]
│       │   │   │   ├── lesson.service.ts        [NEW]
│       │   │   │   └── lesson.schema.ts         [NEW]
│       │   │   ├── section/
│       │   │   │   ├── section.router.ts        [NEW]
│       │   │   │   ├── section.controller.ts    [NEW]
│       │   │   │   └── section.service.ts       [NEW]
│       │   │   ├── quiz/
│       │   │   │   ├── quiz.router.ts           [NEW]
│       │   │   │   ├── quiz.controller.ts       [NEW]
│       │   │   │   ├── quiz.service.ts          [NEW]
│       │   │   │   └── quiz.schema.ts           [NEW]
│       │   │   ├── reporting/
│       │   │   │   ├── reporting.router.ts      [NEW]
│       │   │   │   ├── reporting.controller.ts  [NEW]
│       │   │   │   └── reporting.service.ts     [NEW]
│       │   │   └── webhook/
│       │   │       ├── webhook.router.ts        [NEW] receives video.ready / video.failed
│       │   │       └── webhook.controller.ts    [NEW]
│       │   ├── lib/
│       │   │   ├── prisma.ts            [EXISTS] — singleton, untouched
│       │   │   ├── videoServiceClient.ts        [NEW] JWT + axios wrapper for video service
│       │   │   └── uploadMiddleware.ts          [NEW] multer for image/doc/attachment uploads
│       │   └── routes/
│       │       └── index.ts             [MODIFY] mount new routers
│       └── prisma/
│           └── schema.prisma            [MODIFY] additions only — see Section 2
│
├── apps/
│   └── web/                             ← Next.js frontend (port 3000)
│       ├── app/
│       │   └── (backoffice)/
│       │       ├── layout.tsx                   [NEW] backoffice shell + nav
│       │       ├── courses/
│       │       │   ├── page.tsx                 [NEW] A1 — Dashboard
│       │       │   └── [courseId]/
│       │       │       └── edit/
│       │       │           ├── page.tsx         [NEW] A2 — Course Form shell
│       │       │           ├── content/
│       │       │           │   └── page.tsx     [NEW] A3 — Content tab
│       │       │           ├── description/
│       │       │           │   └── page.tsx     [NEW] Description tab
│       │       │           ├── options/
│       │       │           │   └── page.tsx     [NEW] A5 — Options tab
│       │       │           └── quiz/
│       │       │               ├── page.tsx     [NEW] A6 — Quiz list
│       │       │               └── [quizId]/
│       │       │                   └── page.tsx [NEW] A7 — Quiz Builder
│       │       └── reporting/
│       │           └── page.tsx                 [NEW] A8 — Reporting
│       ├── components/
│       │   └── backoffice/
│       │       ├── CourseCard.tsx               [NEW]
│       │       ├── KanbanBoard.tsx              [NEW]
│       │       ├── CourseListView.tsx           [NEW]
│       │       ├── CreateCourseModal.tsx        [NEW]
│       │       ├── LessonEditorModal.tsx        [NEW]
│       │       ├── SectionModal.tsx             [NEW]
│       │       ├── AttendeeWizard.tsx           [NEW]
│       │       ├── ContactAttendeesWizard.tsx   [NEW]
│       │       ├── QuizBuilder.tsx              [NEW]
│       │       ├── RewardsPanel.tsx             [NEW]
│       │       └── ReportingTable.tsx           [NEW]
│       └── lib/
│           └── api/
│               ├── courses.ts                   [NEW] typed fetch helpers
│               ├── lessons.ts                   [NEW]
│               ├── quiz.ts                      [NEW]
│               └── reporting.ts                 [NEW]
│
└── services/
    └── video-service/                   [EXISTS] — DO NOT TOUCH
```

---

## 2. Database Schema — Additions Only

> Open `apps/server/prisma/schema.prisma`. Add everything below. Do **not** remove or rename any existing field.

```prisma
// ─────────────────────────────────────────────
// EXISTING: User model (assumed — DO NOT change)
// Add only the relations shown with [ADD RELATION]
// ─────────────────────────────────────────────

model User {
  // ... your existing fields ...

  // [ADD RELATIONS]
  coursesOwned       Course[]       @relation("CourseInstructor")
  courseAdminOf      Course[]       @relation("CourseAdmin")
  enrollments        Enrollment[]
  quizAttempts       QuizAttempt[]
  reviews            Review[]
  lessonProgresses   LessonProgress[]
}

// ─────────────────────────────────────────────
// NEW MODELS
// ─────────────────────────────────────────────

enum CourseVisibility {
  EVERYONE
  SIGNED_IN
}

enum AccessRule {
  OPEN
  ON_INVITATION
  ON_PAYMENT
}

enum EnrollmentStatus {
  YET_TO_START
  IN_PROGRESS
  COMPLETED
}

enum LessonType {
  VIDEO
  DOCUMENT
  IMAGE
  QUIZ
}

enum AttachmentType {
  FILE
  LINK
}

// ── Course ────────────────────────────────────
model Course {
  id              String           @id @default(uuid())
  title           String
  description     String?          // Rich text (HTML string)
  coverImageUrl   String?
  isPublished     Boolean          @default(false)
  websiteUrl      String?          // The website slug/URL where course is accessible
  visibility      CourseVisibility @default(EVERYONE)
  accessRule      AccessRule       @default(OPEN)
  price           Float?           // Only when accessRule = ON_PAYMENT
  tags            String[]         // Postgres text[]
  viewCount       Int              @default(0)

  // Relations
  instructorId    String
  instructor      User             @relation("CourseInstructor", fields: [instructorId], references: [id])
  courseAdminId   String?
  courseAdmin     User?            @relation("CourseAdmin", fields: [courseAdminId], references: [id])

  sections        Section[]
  lessons         Lesson[]
  quizzes         Quiz[]
  enrollments     Enrollment[]
  reviews         Review[]

  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  @@index([isPublished])
  @@index([visibility])
}

// ── Section (content grouping) ────────────────
model Section {
  id        String   @id @default(uuid())
  title     String
  order     Int      @default(0)

  courseId  String
  course    Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  lessons   Lesson[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// ── Lesson ────────────────────────────────────
model Lesson {
  id              String      @id @default(uuid())
  title           String
  type            LessonType
  order           Int         @default(0)
  description     String?     // Rich text (HTML)
  durationSeconds Int?        // HH:MM stored as total seconds; display converts back

  // Video-type fields
  // videoId references the video-service's Video.id (UUID) — stored as plain string
  // The monolith does NOT have a foreign key into the video-service DB
  videoServiceId  String?     // UUID from video-service DB
  videoStatus     String?     // mirrors VideoStatus enum from video-service: UPLOADING | UPLOADED | PROCESSING | READY | FAILED
  streamUrl       String?     // filled by webhook when video is READY
  thumbnailUrl    String?     // filled by webhook

  // Document / Image fields
  fileUrl         String?     // S3/storage URL of uploaded file
  fileKey         String?     // storage key for deletion
  allowDownload   Boolean     @default(false)

  // Responsible person
  responsibleId   String?
  responsible     User?       @relation(fields: [responsibleId], references: [id])

  courseId        String
  course          Course      @relation(fields: [courseId], references: [id], onDelete: Cascade)
  sectionId       String?
  section         Section?    @relation(fields: [sectionId], references: [id], onDelete: SetNull)

  attachments     Attachment[]
  lessonProgresses LessonProgress[]
  quizLesson      Quiz?       @relation("QuizLesson")  // if type = QUIZ, points to quiz

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

// ── Attachment ────────────────────────────────
model Attachment {
  id        String         @id @default(uuid())
  type      AttachmentType
  label     String?
  fileUrl   String?        // FILE type
  fileKey   String?        // for deletion
  linkUrl   String?        // LINK type

  lessonId  String
  lesson    Lesson         @relation(fields: [lessonId], references: [id], onDelete: Cascade)

  createdAt DateTime       @default(now())
}

// ── Quiz ──────────────────────────────────────
model Quiz {
  id        String     @id @default(uuid())
  title     String

  courseId  String
  course    Course     @relation(fields: [courseId], references: [id], onDelete: Cascade)

  // Optional: a quiz can be attached to a specific lesson of type QUIZ
  lessonId  String?    @unique
  lesson    Lesson?    @relation("QuizLesson", fields: [lessonId], references: [id], onDelete: SetNull)

  questions  Question[]
  reward     QuizReward?
  attempts   QuizAttempt[]

  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}

// ── QuizReward ────────────────────────────────
model QuizReward {
  id                String @id @default(uuid())
  attempt1Points    Int    @default(10)
  attempt2Points    Int    @default(7)
  attempt3Points    Int    @default(5)
  attempt4PlusPoints Int   @default(2)

  quizId  String @unique
  quiz    Quiz   @relation(fields: [quizId], references: [id], onDelete: Cascade)
}

// ── Question ──────────────────────────────────
model Question {
  id        String   @id @default(uuid())
  text      String
  order     Int      @default(0)

  quizId    String
  quiz      Quiz     @relation(fields: [quizId], references: [id], onDelete: Cascade)

  options   QuestionOption[]
}

// ── QuestionOption ────────────────────────────
model QuestionOption {
  id         String   @id @default(uuid())
  text       String
  isCorrect  Boolean  @default(false)
  order      Int      @default(0)

  questionId String
  question   Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
}

// ── Enrollment ────────────────────────────────
model Enrollment {
  id           String           @id @default(uuid())
  status       EnrollmentStatus @default(YET_TO_START)
  enrolledAt   DateTime         @default(now())
  startedAt    DateTime?
  completedAt  DateTime?
  timeSpentSec Int              @default(0)  // stored as seconds; display as HH:MM

  userId    String
  user      User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  courseId  String
  course    Course @relation(fields: [courseId], references: [id], onDelete: Cascade)

  lessonProgresses LessonProgress[]

  @@unique([userId, courseId])
  @@index([courseId])
  @@index([status])
}

// ── LessonProgress ────────────────────────────
model LessonProgress {
  id          String    @id @default(uuid())
  isCompleted Boolean   @default(false)
  completedAt DateTime?

  enrollmentId String
  enrollment   Enrollment @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)
  lessonId     String
  lesson       Lesson     @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  userId       String
  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([enrollmentId, lessonId])
}

// ── QuizAttempt ───────────────────────────────
model QuizAttempt {
  id            String   @id @default(uuid())
  attemptNumber Int
  pointsEarned  Int
  completedAt   DateTime @default(now())

  userId  String
  user    User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  quizId  String
  quiz    Quiz   @relation(fields: [quizId], references: [id], onDelete: Cascade)

  answers QuizAnswer[]
}

// ── QuizAnswer ────────────────────────────────
model QuizAnswer {
  id         String @id @default(uuid())
  questionId String
  optionId   String

  attemptId String
  attempt   QuizAttempt @relation(fields: [attemptId], references: [id], onDelete: Cascade)
}

// ── Review ────────────────────────────────────
model Review {
  id         String   @id @default(uuid())
  rating     Int      // 1–5
  reviewText String?
  createdAt  DateTime @default(now())

  userId   String
  user     User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  courseId String
  course   Course @relation(fields: [courseId], references: [id], onDelete: Cascade)

  @@unique([userId, courseId])
}
```

### After editing schema.prisma

```bash
cd apps/server
npx prisma migrate dev --name backoffice_core
# or if using push for hackathon speed:
npx prisma db push
npx prisma generate
```

---

## 3. Backend — API Routes & Services

### 3.1 Mount new routers in `routes/index.ts`

```typescript
// apps/server/src/routes/index.ts  [MODIFY — add these lines]

import courseRouter    from '../modules/course/course.router'
import lessonRouter    from '../modules/lesson/lesson.router'
import sectionRouter   from '../modules/section/section.router'
import quizRouter      from '../modules/quiz/quiz.router'
import reportingRouter from '../modules/reporting/reporting.router'
import webhookRouter   from '../modules/webhook/webhook.router'

// Mount (all under /api)
app.use('/api/courses',   courseRouter)
app.use('/api/lessons',   lessonRouter)
app.use('/api/sections',  sectionRouter)
app.use('/api/quizzes',   quizRouter)
app.use('/api/reporting', reportingRouter)
app.use('/api/webhooks',  webhookRouter)  // public — no auth middleware here
```

---

### 3.2 Video Service Client

```typescript
// apps/server/src/lib/videoServiceClient.ts  [NEW]

import axios from 'axios'
import jwt from 'jsonwebtoken'

const VIDEO_SERVICE_URL = process.env.VIDEO_SERVICE_URL ?? 'http://localhost:4001/api'
const SERVICE_AUTH_SECRET = process.env.SERVICE_AUTH_SECRET!

function generateServiceToken(): string {
  return jwt.sign({ service: 'learnova-server' }, SERVICE_AUTH_SECRET, { expiresIn: '5m' })
}

function videoServiceClient() {
  return axios.create({
    baseURL: VIDEO_SERVICE_URL,
    headers: { Authorization: `Bearer ${generateServiceToken()}` },
  })
}

// Call video service to get a presigned upload URL
export async function requestPresignedUpload(fileName: string, mimeType: string) {
  const client = videoServiceClient()
  const res = await client.post('/videos/upload-url', { fileName, mimeType })
  return res.data as { videoId: string; uploadUrl: string }
}

// Trigger transcoding after client PUT to presigned URL
export async function triggerTranscode(videoId: string, callbackUrl: string) {
  const client = videoServiceClient()
  await client.post(`/videos/${videoId}/process`, { callbackUrl })
}

// Get stream URL for a ready video
export async function getVideoMeta(videoId: string) {
  const client = videoServiceClient()
  const res = await client.get(`/videos/${videoId}`)
  return res.data
}
```

---

### 3.3 Upload Middleware

```typescript
// apps/server/src/lib/uploadMiddleware.ts  [NEW]
// Used for course cover images, lesson documents/images, and attachments
// These go to YOUR own storage (not the video service)

import multer from 'multer'
import path from 'path'
import fs from 'fs'

const TMP_DIR = path.join(process.cwd(), 'tmp', 'uploads')
fs.mkdirSync(TMP_DIR, { recursive: true })

export const diskUpload = multer({
  storage: multer.diskStorage({
    destination: TMP_DIR,
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB for docs/images
})

// Then in each controller, after multer runs, upload file.path to your S3/storage
// and delete the temp file. Use the same minio client pattern from video-service.
```

---

### 3.4 Course Module

#### `course.router.ts`

```typescript
import { Router } from 'express'
import { requireAuth } from '../../middleware/auth'
import { requireRole } from '../../middleware/rbac'
import { diskUpload } from '../../lib/uploadMiddleware'
import * as C from './course.controller'

const r = Router()

// All backoffice routes require auth + instructor or admin role
r.use(requireAuth, requireRole(['ADMIN', 'INSTRUCTOR']))

r.get('/',                           C.listCourses)         // GET  /api/courses
r.post('/',                          C.createCourse)        // POST /api/courses
r.get('/:courseId',                  C.getCourse)           // GET  /api/courses/:courseId
r.patch('/:courseId',                C.updateCourse)        // PATCH /api/courses/:courseId
r.delete('/:courseId',               C.deleteCourse)        // DELETE /api/courses/:courseId
r.post('/:courseId/publish',         C.togglePublish)       // POST /api/courses/:courseId/publish
r.post('/:courseId/cover',           diskUpload.single('image'), C.uploadCoverImage)
r.get('/:courseId/share-link',       C.getShareLink)        // GET share link
r.post('/:courseId/attendees',       C.addAttendees)        // POST add attendees by email
r.post('/:courseId/contact',         C.contactAttendees)    // POST send bulk email

export default r
```

#### `course.controller.ts`

```typescript
import { Request, Response, NextFunction } from 'express'
import * as courseService from './course.service'
import { createCourseSchema, updateCourseSchema } from './course.schema'

export async function listCourses(req: Request, res: Response, next: NextFunction) {
  try {
    // Admin sees all; Instructor sees own only
    const isAdmin = req.user!.role === 'ADMIN'
    const courses = await courseService.listCourses(isAdmin ? undefined : req.user!.id)
    res.json(courses)
  } catch (e) { next(e) }
}

export async function createCourse(req: Request, res: Response, next: NextFunction) {
  try {
    const body = createCourseSchema.parse(req.body)
    const course = await courseService.createCourse(req.user!.id, body.title)
    res.status(201).json(course)
  } catch (e) { next(e) }
}

export async function getCourse(req: Request, res: Response, next: NextFunction) {
  try {
    const course = await courseService.getCourseById(req.params.courseId, req.user!)
    res.json(course)
  } catch (e) { next(e) }
}

export async function updateCourse(req: Request, res: Response, next: NextFunction) {
  try {
    const body = updateCourseSchema.parse(req.body)
    const course = await courseService.updateCourse(req.params.courseId, req.user!, body)
    res.json(course)
  } catch (e) { next(e) }
}

export async function deleteCourse(req: Request, res: Response, next: NextFunction) {
  try {
    await courseService.deleteCourse(req.params.courseId, req.user!)
    res.status(204).send()
  } catch (e) { next(e) }
}

export async function togglePublish(req: Request, res: Response, next: NextFunction) {
  try {
    const course = await courseService.togglePublish(req.params.courseId, req.user!)
    res.json(course)
  } catch (e) { next(e) }
}

export async function uploadCoverImage(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' })
    const course = await courseService.updateCoverImage(req.params.courseId, req.user!, req.file)
    res.json(course)
  } catch (e) { next(e) }
}

export async function getShareLink(req: Request, res: Response, next: NextFunction) {
  try {
    const link = await courseService.getShareLink(req.params.courseId)
    res.json({ link })
  } catch (e) { next(e) }
}

export async function addAttendees(req: Request, res: Response, next: NextFunction) {
  try {
    const { emails } = req.body as { emails: string[] }
    await courseService.addAttendees(req.params.courseId, req.user!, emails)
    res.json({ message: 'Attendees added' })
  } catch (e) { next(e) }
}

export async function contactAttendees(req: Request, res: Response, next: NextFunction) {
  try {
    const { subject, message } = req.body as { subject: string; message: string }
    await courseService.contactAttendees(req.params.courseId, req.user!, subject, message)
    res.json({ message: 'Emails sent' })
  } catch (e) { next(e) }
}
```

#### `course.service.ts`

```typescript
import prisma from '../../lib/prisma'
import { AppError } from '../../middleware/errorHandler'
import { uploadFileToBucket, deleteFileFromBucket } from '../../lib/storage' // your own S3 helper

// ── List courses ─────────────────────────────────────────────────────────────
export async function listCourses(instructorId?: string) {
  return prisma.course.findMany({
    where: instructorId ? { instructorId } : undefined,
    include: {
      _count: { select: { lessons: true, enrollments: true } },
      sections: { orderBy: { order: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

// ── Create course ─────────────────────────────────────────────────────────────
export async function createCourse(instructorId: string, title: string) {
  return prisma.course.create({
    data: { title, instructorId },
  })
}

// ── Get single course with full data ─────────────────────────────────────────
export async function getCourseById(courseId: string, user: Express.User) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            include: { attachments: true },
          },
        },
      },
      lessons: {
        where: { sectionId: null },   // lessons not in any section
        orderBy: { order: 'asc' },
        include: { attachments: true },
      },
      quizzes: { include: { questions: { include: { options: true } }, reward: true } },
      instructor: { select: { id: true, name: true } },
      courseAdmin: { select: { id: true, name: true } },
      _count: { select: { enrollments: true, reviews: true } },
    },
  })
  if (!course) throw new AppError('Course not found', 404)
  guardCourseAccess(course, user)
  return course
}

// ── Update course fields ──────────────────────────────────────────────────────
export async function updateCourse(courseId: string, user: Express.User, data: Partial<{
  title: string; description: string; tags: string[]; websiteUrl: string;
  courseAdminId: string; visibility: string; accessRule: string; price: number;
}>) {
  const course = await prisma.course.findUniqueOrThrow({ where: { id: courseId } })
  guardCourseAccess(course, user)
  return prisma.course.update({ where: { id: courseId }, data })
}

// ── Publish toggle ────────────────────────────────────────────────────────────
export async function togglePublish(courseId: string, user: Express.User) {
  const course = await prisma.course.findUniqueOrThrow({ where: { id: courseId } })
  guardCourseAccess(course, user)
  return prisma.course.update({
    where: { id: courseId },
    data: { isPublished: !course.isPublished },
  })
}

// ── Delete course ─────────────────────────────────────────────────────────────
export async function deleteCourse(courseId: string, user: Express.User) {
  const course = await prisma.course.findUniqueOrThrow({ where: { id: courseId } })
  guardCourseAccess(course, user)
  // Delete cover image from storage if exists
  if (course.coverImageUrl) await deleteFileFromBucket(course.coverImageUrl).catch(() => {})
  await prisma.course.delete({ where: { id: courseId } })
}

// ── Cover image ───────────────────────────────────────────────────────────────
export async function updateCoverImage(courseId: string, user: Express.User, file: Express.Multer.File) {
  const course = await prisma.course.findUniqueOrThrow({ where: { id: courseId } })
  guardCourseAccess(course, user)
  if (course.coverImageUrl) await deleteFileFromBucket(course.coverImageUrl).catch(() => {})
  const { url } = await uploadFileToBucket(`courses/${courseId}/cover`, file)
  return prisma.course.update({ where: { id: courseId }, data: { coverImageUrl: url } })
}

// ── Share link ────────────────────────────────────────────────────────────────
export async function getShareLink(courseId: string) {
  const course = await prisma.course.findUniqueOrThrow({
    where: { id: courseId },
    select: { websiteUrl: true, id: true },
  })
  const base = process.env.WEB_BASE_URL ?? 'http://localhost:3000'
  return course.websiteUrl ? `${base}/${course.websiteUrl}` : `${base}/courses/${courseId}`
}

// ── Add attendees (by email) ──────────────────────────────────────────────────
export async function addAttendees(courseId: string, user: Express.User, emails: string[]) {
  const course = await prisma.course.findUniqueOrThrow({ where: { id: courseId } })
  guardCourseAccess(course, user)
  const users = await prisma.user.findMany({ where: { email: { in: emails } } })
  // Upsert enrollments
  await Promise.all(users.map(u =>
    prisma.enrollment.upsert({
      where: { userId_courseId: { userId: u.id, courseId } },
      create: { userId: u.id, courseId },
      update: {},
    })
  ))
}

// ── Contact attendees ─────────────────────────────────────────────────────────
export async function contactAttendees(courseId: string, user: Express.User, subject: string, message: string) {
  const course = await prisma.course.findUniqueOrThrow({ where: { id: courseId } })
  guardCourseAccess(course, user)
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId },
    include: { user: { select: { email: true, name: true } } },
  })
  // TODO: wire to your email service (nodemailer / Resend / SendGrid)
  // For hackathon: log emails and return 200
  console.log(`[contactAttendees] Sending "${subject}" to ${enrollments.length} users`)
  // await emailService.sendBulk(enrollments.map(e => e.user.email), subject, message)
}

// ── Guard helper ──────────────────────────────────────────────────────────────
function guardCourseAccess(course: { instructorId: string }, user: Express.User) {
  if (user.role === 'ADMIN') return
  if (course.instructorId !== user.id) throw new AppError('Forbidden', 403)
}
```

#### `course.schema.ts`

```typescript
import { z } from 'zod'

export const createCourseSchema = z.object({
  title: z.string().min(1).max(255),
})

export const updateCourseSchema = z.object({
  title:         z.string().min(1).max(255).optional(),
  description:   z.string().optional(),
  tags:          z.array(z.string()).optional(),
  websiteUrl:    z.string().optional(),
  courseAdminId: z.string().uuid().optional().nullable(),
  visibility:    z.enum(['EVERYONE', 'SIGNED_IN']).optional(),
  accessRule:    z.enum(['OPEN', 'ON_INVITATION', 'ON_PAYMENT']).optional(),
  price:         z.number().positive().optional().nullable(),
})
```

---

### 3.5 Section Module

#### `section.router.ts`

```typescript
import { Router } from 'express'
import { requireAuth } from '../../middleware/auth'
import { requireRole } from '../../middleware/rbac'
import * as C from './section.controller'

const r = Router()
r.use(requireAuth, requireRole(['ADMIN', 'INSTRUCTOR']))

r.post('/courses/:courseId/sections',          C.createSection)   // POST   /api/sections/courses/:courseId/sections
r.patch('/courses/:courseId/sections/:id',     C.updateSection)   // PATCH
r.delete('/courses/:courseId/sections/:id',    C.deleteSection)   // DELETE
r.patch('/courses/:courseId/sections/reorder', C.reorderSections) // PATCH  (reorder)

export default r
```

#### `section.service.ts`

```typescript
import prisma from '../../lib/prisma'

export async function createSection(courseId: string, title: string) {
  const last = await prisma.section.findFirst({ where: { courseId }, orderBy: { order: 'desc' } })
  return prisma.section.create({ data: { courseId, title, order: (last?.order ?? -1) + 1 } })
}

export async function updateSection(id: string, title: string) {
  return prisma.section.update({ where: { id }, data: { title } })
}

export async function deleteSection(id: string) {
  // Lessons under deleted section become section-less (sectionId → null via SetNull)
  return prisma.section.delete({ where: { id } })
}

export async function reorderSections(courseId: string, orderedIds: string[]) {
  await Promise.all(orderedIds.map((id, order) =>
    prisma.section.update({ where: { id, courseId }, data: { order } })
  ))
}
```

---

### 3.6 Lesson Module

#### `lesson.router.ts`

```typescript
import { Router } from 'express'
import { requireAuth } from '../../middleware/auth'
import { requireRole } from '../../middleware/rbac'
import { diskUpload } from '../../lib/uploadMiddleware'
import * as C from './lesson.controller'

const r = Router()
r.use(requireAuth, requireRole(['ADMIN', 'INSTRUCTOR']))

// Lessons are nested under a course
r.post('/courses/:courseId/lessons',                   C.createLesson)
r.patch('/courses/:courseId/lessons/:lessonId',        C.updateLesson)
r.delete('/courses/:courseId/lessons/:lessonId',       C.deleteLesson)
r.patch('/courses/:courseId/lessons/reorder',          C.reorderLessons)

// File upload for document/image lesson
r.post('/courses/:courseId/lessons/:lessonId/file',
  diskUpload.single('file'), C.uploadLessonFile)

// Attachments
r.post('/courses/:courseId/lessons/:lessonId/attachments',         C.addAttachment)
r.delete('/courses/:courseId/lessons/:lessonId/attachments/:attId', C.deleteAttachment)

// Video lesson: get presigned URL from video-service
r.post('/courses/:courseId/lessons/:lessonId/video/init',          C.initVideoUpload)
// Video lesson: trigger transcode after browser PUT to presigned URL
r.post('/courses/:courseId/lessons/:lessonId/video/process',       C.processVideo)

export default r
```

#### `lesson.service.ts`

```typescript
import prisma from '../../lib/prisma'
import { AppError } from '../../middleware/errorHandler'
import { uploadFileToBucket, deleteFileFromBucket } from '../../lib/storage'
import { requestPresignedUpload, triggerTranscode } from '../../lib/videoServiceClient'

// ── Create lesson ─────────────────────────────────────────────────────────────
export async function createLesson(courseId: string, data: {
  title: string; type: string; sectionId?: string; order?: number;
  responsibleId?: string;
}) {
  const last = await prisma.lesson.findFirst({
    where: { courseId, sectionId: data.sectionId ?? null },
    orderBy: { order: 'desc' },
  })
  return prisma.lesson.create({
    data: {
      courseId,
      title: data.title,
      type: data.type as any,
      sectionId: data.sectionId ?? null,
      responsibleId: data.responsibleId ?? null,
      order: data.order ?? (last?.order ?? -1) + 1,
    },
  })
}

// ── Update lesson (fields only — no file) ─────────────────────────────────────
export async function updateLesson(lessonId: string, data: Partial<{
  title: string; description: string; durationSeconds: number;
  allowDownload: boolean; responsibleId: string; sectionId: string;
}>) {
  return prisma.lesson.update({ where: { id: lessonId }, data })
}

// ── Delete lesson ─────────────────────────────────────────────────────────────
export async function deleteLesson(lessonId: string) {
  const lesson = await prisma.lesson.findUniqueOrThrow({
    where: { id: lessonId },
    include: { attachments: true },
  })
  // Clean up files from storage
  if (lesson.fileKey) await deleteFileFromBucket(lesson.fileKey).catch(() => {})
  for (const att of lesson.attachments) {
    if (att.fileKey) await deleteFileFromBucket(att.fileKey).catch(() => {})
  }
  await prisma.lesson.delete({ where: { id: lessonId } })
}

// ── Reorder lessons ───────────────────────────────────────────────────────────
export async function reorderLessons(courseId: string, orderedIds: string[]) {
  await Promise.all(orderedIds.map((id, order) =>
    prisma.lesson.update({ where: { id, courseId }, data: { order } })
  ))
}

// ── Upload doc/image file ─────────────────────────────────────────────────────
export async function uploadLessonFile(lessonId: string, file: Express.Multer.File) {
  const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } })
  // Delete old file if exists
  if (lesson.fileKey) await deleteFileFromBucket(lesson.fileKey).catch(() => {})
  const { url, key } = await uploadFileToBucket(`lessons/${lessonId}/file`, file)
  return prisma.lesson.update({
    where: { id: lessonId },
    data: { fileUrl: url, fileKey: key },
  })
}

// ── Attachment: add ───────────────────────────────────────────────────────────
export async function addAttachment(lessonId: string, data: {
  type: 'FILE' | 'LINK'; label?: string; linkUrl?: string; file?: Express.Multer.File;
}) {
  let fileUrl: string | undefined
  let fileKey: string | undefined
  if (data.type === 'FILE' && data.file) {
    const result = await uploadFileToBucket(`lessons/${lessonId}/attachments`, data.file)
    fileUrl = result.url
    fileKey = result.key
  }
  return prisma.attachment.create({
    data: {
      lessonId,
      type: data.type,
      label: data.label,
      fileUrl,
      fileKey,
      linkUrl: data.linkUrl,
    },
  })
}

// ── Attachment: delete ────────────────────────────────────────────────────────
export async function deleteAttachment(attId: string) {
  const att = await prisma.attachment.findUniqueOrThrow({ where: { id: attId } })
  if (att.fileKey) await deleteFileFromBucket(att.fileKey).catch(() => {})
  await prisma.attachment.delete({ where: { id: attId } })
}

// ── Video: init upload (returns presigned URL to client) ──────────────────────
// This uses Flow 2 (presigned URL) from the video service architecture
export async function initVideoUpload(lessonId: string, fileName: string, mimeType: string) {
  const { videoId, uploadUrl } = await requestPresignedUpload(fileName, mimeType)
  // Store the videoServiceId so we can call /process later
  await prisma.lesson.update({
    where: { id: lessonId },
    data: { videoServiceId: videoId, videoStatus: 'UPLOADING' },
  })
  return { videoId, uploadUrl }
}

// ── Video: trigger transcode after client has PUT to presigned URL ────────────
export async function processVideo(lessonId: string) {
  const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } })
  if (!lesson.videoServiceId) throw new AppError('No video upload initiated', 400)
  const callbackUrl = `${process.env.SERVER_BASE_URL}/api/webhooks/video`
  await triggerTranscode(lesson.videoServiceId, callbackUrl)
  await prisma.lesson.update({
    where: { id: lessonId },
    data: { videoStatus: 'PROCESSING' },
  })
}
```

---

### 3.7 Quiz Module

#### `quiz.router.ts`

```typescript
import { Router } from 'express'
import { requireAuth } from '../../middleware/auth'
import { requireRole } from '../../middleware/rbac'
import * as C from './quiz.controller'

const r = Router()
r.use(requireAuth, requireRole(['ADMIN', 'INSTRUCTOR']))

r.get('/courses/:courseId/quizzes',               C.listQuizzes)
r.post('/courses/:courseId/quizzes',              C.createQuiz)
r.get('/courses/:courseId/quizzes/:quizId',       C.getQuiz)
r.patch('/courses/:courseId/quizzes/:quizId',     C.updateQuiz)      // title + reward
r.delete('/courses/:courseId/quizzes/:quizId',    C.deleteQuiz)

// Questions
r.post('/courses/:courseId/quizzes/:quizId/questions',              C.addQuestion)
r.patch('/courses/:courseId/quizzes/:quizId/questions/:questionId', C.updateQuestion)
r.delete('/courses/:courseId/quizzes/:quizId/questions/:questionId', C.deleteQuestion)
r.patch('/courses/:courseId/quizzes/:quizId/questions/reorder',     C.reorderQuestions)

// Reward
r.put('/courses/:courseId/quizzes/:quizId/reward',                  C.upsertReward)

export default r
```

#### `quiz.service.ts`

```typescript
import prisma from '../../lib/prisma'

// ── List quizzes for course ───────────────────────────────────────────────────
export async function listQuizzes(courseId: string) {
  return prisma.quiz.findMany({
    where: { courseId },
    include: {
      _count: { select: { questions: true } },
      reward: true,
    },
    orderBy: { createdAt: 'asc' },
  })
}

// ── Create quiz ───────────────────────────────────────────────────────────────
export async function createQuiz(courseId: string, title: string) {
  return prisma.quiz.create({
    data: {
      courseId,
      title,
      reward: {          // Create default reward config
        create: { attempt1Points: 10, attempt2Points: 7, attempt3Points: 5, attempt4PlusPoints: 2 },
      },
    },
    include: { reward: true, questions: true },
  })
}

// ── Get full quiz (builder view) ──────────────────────────────────────────────
export async function getQuiz(quizId: string) {
  return prisma.quiz.findUniqueOrThrow({
    where: { id: quizId },
    include: {
      reward: true,
      questions: {
        orderBy: { order: 'asc' },
        include: { options: { orderBy: { order: 'asc' } } },
      },
    },
  })
}

// ── Update quiz title ─────────────────────────────────────────────────────────
export async function updateQuiz(quizId: string, title: string) {
  return prisma.quiz.update({ where: { id: quizId }, data: { title } })
}

// ── Delete quiz ───────────────────────────────────────────────────────────────
export async function deleteQuiz(quizId: string) {
  await prisma.quiz.delete({ where: { id: quizId } })
}

// ── Add question with options ─────────────────────────────────────────────────
export async function addQuestion(quizId: string, data: {
  text: string;
  options: Array<{ text: string; isCorrect: boolean }>;
}) {
  const last = await prisma.question.findFirst({ where: { quizId }, orderBy: { order: 'desc' } })
  return prisma.question.create({
    data: {
      quizId,
      text: data.text,
      order: (last?.order ?? -1) + 1,
      options: {
        create: data.options.map((o, i) => ({ text: o.text, isCorrect: o.isCorrect, order: i })),
      },
    },
    include: { options: true },
  })
}

// ── Update question ───────────────────────────────────────────────────────────
export async function updateQuestion(questionId: string, data: {
  text?: string;
  options?: Array<{ id?: string; text: string; isCorrect: boolean }>;
}) {
  if (data.text) {
    await prisma.question.update({ where: { id: questionId }, data: { text: data.text } })
  }
  if (data.options) {
    // Delete all existing options and recreate (simpler for hackathon)
    await prisma.questionOption.deleteMany({ where: { questionId } })
    await prisma.questionOption.createMany({
      data: data.options.map((o, i) => ({
        questionId, text: o.text, isCorrect: o.isCorrect, order: i,
      })),
    })
  }
  return prisma.question.findUniqueOrThrow({
    where: { id: questionId },
    include: { options: { orderBy: { order: 'asc' } } },
  })
}

// ── Delete question ───────────────────────────────────────────────────────────
export async function deleteQuestion(questionId: string) {
  await prisma.question.delete({ where: { id: questionId } })
}

// ── Reorder questions ─────────────────────────────────────────────────────────
export async function reorderQuestions(quizId: string, orderedIds: string[]) {
  await Promise.all(orderedIds.map((id, order) =>
    prisma.question.update({ where: { id, quizId }, data: { order } })
  ))
}

// ── Upsert reward config ──────────────────────────────────────────────────────
export async function upsertReward(quizId: string, data: {
  attempt1Points: number; attempt2Points: number;
  attempt3Points: number; attempt4PlusPoints: number;
}) {
  return prisma.quizReward.upsert({
    where: { quizId },
    create: { quizId, ...data },
    update: data,
  })
}
```

---

### 3.8 Webhook Handler (Video Service → Monolith)

```typescript
// apps/server/src/modules/webhook/webhook.router.ts  [NEW]
import { Router } from 'express'
import * as C from './webhook.controller'

const r = Router()
// No requireAuth — but we verify the JWT from the video service internally
r.post('/video', C.handleVideoWebhook)

export default r
```

```typescript
// apps/server/src/modules/webhook/webhook.controller.ts  [NEW]
import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../../lib/prisma'

export async function handleVideoWebhook(req: Request, res: Response) {
  // Verify JWT from video-service (shared secret)
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ message: 'No token' })
  try {
    jwt.verify(token, process.env.SERVICE_AUTH_SECRET!)
  } catch {
    return res.status(401).json({ message: 'Invalid token' })
  }

  const { event, videoId, status, streamUrl, thumbnailUrl, duration } = req.body

  if (event === 'video.ready') {
    // Find lesson with this videoServiceId and update it
    await prisma.lesson.updateMany({
      where: { videoServiceId: videoId },
      data: {
        videoStatus: 'READY',
        streamUrl,
        thumbnailUrl,
        // Convert duration (seconds float) to integer seconds
        durationSeconds: duration ? Math.round(duration) : undefined,
      },
    })
  }

  if (event === 'video.failed') {
    await prisma.lesson.updateMany({
      where: { videoServiceId: videoId },
      data: { videoStatus: 'FAILED' },
    })
  }

  res.json({ received: true })
}
```

---

### 3.9 Reporting Module

#### `reporting.service.ts`

```typescript
import prisma from '../../lib/prisma'

// Summary counts for a given course (or all courses for admin)
export async function getReportingSummary(courseId?: string, instructorId?: string) {
  const where = {
    ...(courseId ? { courseId } : {}),
    ...(instructorId ? { course: { instructorId } } : {}),
  }

  const [total, yetToStart, inProgress, completed] = await Promise.all([
    prisma.enrollment.count({ where }),
    prisma.enrollment.count({ where: { ...where, status: 'YET_TO_START' } }),
    prisma.enrollment.count({ where: { ...where, status: 'IN_PROGRESS' } }),
    prisma.enrollment.count({ where: { ...where, status: 'COMPLETED' } }),
  ])

  return { total, yetToStart, inProgress, completed }
}

// Paginated learner table
export async function getEnrollmentTable(options: {
  courseId?: string;
  instructorId?: string;
  status?: string;
  page: number;
  limit: number;
}) {
  const { courseId, instructorId, status, page, limit } = options
  const skip = (page - 1) * limit

  const where = {
    ...(courseId ? { courseId } : {}),
    ...(status ? { status: status as any } : {}),
    ...(instructorId ? { course: { instructorId } } : {}),
  }

  const [rows, total] = await Promise.all([
    prisma.enrollment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { enrolledAt: 'desc' },
      include: {
        user:   { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
        lessonProgresses: { select: { isCompleted: true } },
      },
    }),
    prisma.enrollment.count({ where }),
  ])

  // Compute completion % from lessonProgresses
  const data = rows.map(e => {
    const totalLessons = e.lessonProgresses.length
    const doneLessons  = e.lessonProgresses.filter(lp => lp.isCompleted).length
    const completionPct = totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0
    const timeSpentHHMM = secondsToHHMM(e.timeSpentSec)
    return {
      id:              e.id,
      courseName:      e.course.title,
      participantName: e.user.name,
      enrolledDate:    e.enrolledAt,
      startDate:       e.startedAt,
      timeSpent:       timeSpentHHMM,
      completionPct,
      completedDate:   e.completedAt,
      status:          e.status,
    }
  })

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
}

// List courses with their enrollment counts (for the course-card panel)
export async function getCourseReportCards(instructorId?: string) {
  return prisma.course.findMany({
    where: instructorId ? { instructorId } : undefined,
    select: {
      id: true, title: true,
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

function secondsToHHMM(totalSec: number): string {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
```

#### `reporting.router.ts`

```typescript
import { Router } from 'express'
import { requireAuth } from '../../middleware/auth'
import { requireRole } from '../../middleware/rbac'
import * as C from './reporting.controller'

const r = Router()
r.use(requireAuth, requireRole(['ADMIN', 'INSTRUCTOR']))

r.get('/summary',  C.getSummary)        // GET /api/reporting/summary?courseId=...
r.get('/table',    C.getTable)          // GET /api/reporting/table?courseId=...&status=...&page=1
r.get('/courses',  C.getCourseCards)    // GET /api/reporting/courses

export default r
```

---

## 4. Frontend — Pages & Components

### 4.1 Backoffice Layout

```tsx
// apps/web/app/(backoffice)/layout.tsx  [NEW]
// Wraps all backoffice pages with the top nav: App Logo | Courses | Reporting | Settings

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from '../lib/auth'  // your existing session helper

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession()
  if (!session || !['ADMIN', 'INSTRUCTOR'].includes(session.user.role)) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navigation */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-8">
        <Link href="/backoffice/courses" className="font-semibold text-lg">
          Learnova
        </Link>
        <Link href="/backoffice/courses"   className="text-sm text-gray-600 hover:text-gray-900">Courses</Link>
        <Link href="/backoffice/reporting" className="text-sm text-gray-600 hover:text-gray-900">Reporting</Link>
        <Link href="/backoffice/settings"  className="text-sm text-gray-600 hover:text-gray-900">Settings</Link>
        <div className="ml-auto text-sm text-gray-500">{session.user.name}</div>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  )
}
```

---

### 4.2 A1 — Courses Dashboard (`/backoffice/courses`)

**Key state:** `view: 'kanban' | 'list'`, `search: string`, `courses: Course[]`

```tsx
// apps/web/app/(backoffice)/courses/page.tsx  [NEW]
'use client'

import { useState, useEffect } from 'react'
import { KanbanBoard }       from '@/components/backoffice/KanbanBoard'
import { CourseListView }    from '@/components/backoffice/CourseListView'
import { CreateCourseModal } from '@/components/backoffice/CreateCourseModal'
import { fetchCourses, createCourse } from '@/lib/api/courses'

export default function CoursesPage() {
  const [view,         setView]         = useState<'kanban' | 'list'>('kanban')
  const [search,       setSearch]       = useState('')
  const [courses,      setCourses]      = useState([])
  const [showCreate,   setShowCreate]   = useState(false)

  useEffect(() => { fetchCourses().then(setCourses) }, [])

  const filtered = courses.filter((c: any) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  )

  async function handleCreate(title: string) {
    const newCourse = await createCourse(title)
    setCourses(prev => [newCourse, ...prev] as any)
    setShowCreate(false)
  }

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-6">
        <input
          placeholder="Search courses..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-64"
        />
        {/* View toggle */}
        <div className="flex border rounded-lg overflow-hidden ml-auto">
          <button
            onClick={() => setView('kanban')}
            className={`px-3 py-2 text-sm ${view === 'kanban' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600'}`}
          >Kanban</button>
          <button
            onClick={() => setView('list')}
            className={`px-3 py-2 text-sm ${view === 'list' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600'}`}
          >List</button>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >+ Create Course</button>
      </div>

      {/* View */}
      {view === 'kanban'
        ? <KanbanBoard courses={filtered} onRefresh={() => fetchCourses().then(setCourses)} />
        : <CourseListView courses={filtered} onRefresh={() => fetchCourses().then(setCourses)} />
      }

      {/* Create modal */}
      {showCreate && (
        <CreateCourseModal
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  )
}
```

#### `CourseCard.tsx`

```tsx
// apps/web/components/backoffice/CourseCard.tsx  [NEW]
import Link from 'next/link'

interface Props {
  course: {
    id: string; title: string; tags: string[]; isPublished: boolean;
    viewCount: number; _count: { lessons: number }; totalDuration?: string;
  }
  onShare: () => void
  onTogglePublish: () => void
}

export function CourseCard({ course, onShare, onTogglePublish }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 w-64 flex-shrink-0">
      {/* Published badge */}
      {course.isPublished && (
        <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full mb-2 font-medium">
          Published
        </span>
      )}

      <h3 className="font-medium text-sm mb-2 line-clamp-2">{course.title}</h3>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-3">
        {course.tags.map(tag => (
          <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tag}</span>
        ))}
      </div>

      {/* Stats */}
      <div className="text-xs text-gray-500 space-y-1 mb-4">
        <div>Views: {course.viewCount}</div>
        <div>Contents: {course._count.lessons}</div>
        {course.totalDuration && <div>Duration: {course.totalDuration}</div>}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Link
            href={`/backoffice/courses/${course.id}/edit`}
            className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md"
          >Edit</Link>
          <button
            onClick={onShare}
            className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md"
          >Share</button>
        </div>
        {/* Publish toggle */}
        <button
          onClick={onTogglePublish}
          className={`w-10 h-5 rounded-full transition-colors ${course.isPublished ? 'bg-green-500' : 'bg-gray-300'}`}
        >
          <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${course.isPublished ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>
    </div>
  )
}
```

#### `KanbanBoard.tsx`

```tsx
// apps/web/components/backoffice/KanbanBoard.tsx  [NEW]
import { CourseCard } from './CourseCard'
import { togglePublish, getShareLink } from '@/lib/api/courses'

export function KanbanBoard({ courses, onRefresh }: { courses: any[]; onRefresh: () => void }) {
  const drafts     = courses.filter(c => !c.isPublished)
  const published  = courses.filter(c =>  c.isPublished)

  async function handleShare(courseId: string) {
    const { link } = await getShareLink(courseId)
    await navigator.clipboard.writeText(link)
    alert('Link copied to clipboard!')
  }

  async function handleTogglePublish(courseId: string) {
    await togglePublish(courseId)
    onRefresh()
  }

  const Column = ({ title, items }: { title: string; items: any[] }) => (
    <div className="min-w-[280px]">
      <h2 className="font-medium text-sm text-gray-500 mb-3 uppercase tracking-wide">
        {title} ({items.length})
      </h2>
      <div className="flex flex-col gap-3">
        {items.map(c => (
          <CourseCard
            key={c.id}
            course={c}
            onShare={() => handleShare(c.id)}
            onTogglePublish={() => handleTogglePublish(c.id)}
          />
        ))}
      </div>
    </div>
  )

  return (
    <div className="flex gap-6 overflow-x-auto pb-4">
      <Column title="Draft"     items={drafts}    />
      <Column title="Published" items={published} />
    </div>
  )
}
```

---

### 4.3 A2 — Course Form (`/backoffice/courses/[courseId]/edit`)

```tsx
// apps/web/app/(backoffice)/courses/[courseId]/edit/page.tsx  [NEW]
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { fetchCourse, updateCourse, togglePublish, getShareLink } from '@/lib/api/courses'
import { AttendeeWizard } from '@/components/backoffice/AttendeeWizard'
import { ContactAttendeesWizard } from '@/components/backoffice/ContactAttendeesWizard'

type Tab = 'content' | 'description' | 'options' | 'quiz'

export default function CourseEditPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const router = useRouter()

  const [course,          setCourse]          = useState<any>(null)
  const [activeTab,       setActiveTab]       = useState<Tab>('content')
  const [showAttendees,   setShowAttendees]   = useState(false)
  const [showContact,     setShowContact]     = useState(false)
  const [saving,          setSaving]          = useState(false)

  useEffect(() => { fetchCourse(courseId).then(setCourse) }, [courseId])

  async function handleSave(field: string, value: any) {
    setSaving(true)
    const updated = await updateCourse(courseId, { [field]: value })
    setCourse(updated)
    setSaving(false)
  }

  async function handleTogglePublish() {
    const updated = await togglePublish(courseId)
    setCourse(updated)
  }

  async function handleShare() {
    const { link } = await getShareLink(courseId)
    await navigator.clipboard.writeText(link)
    alert('Link copied!')
  }

  if (!course) return <div className="p-8 text-gray-500">Loading...</div>

  const tabs: { key: Tab; label: string }[] = [
    { key: 'content',     label: 'Content'     },
    { key: 'description', label: 'Description' },
    { key: 'options',     label: 'Options'     },
    { key: 'quiz',        label: 'Quiz'        },
  ]

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {/* Publish toggle */}
        <button
          onClick={handleTogglePublish}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            course.isPublished
              ? 'bg-green-50 border-green-300 text-green-700'
              : 'bg-gray-50 border-gray-300 text-gray-600'
          }`}
        >
          <span className={`w-8 h-4 rounded-full transition-colors inline-flex items-center ${course.isPublished ? 'bg-green-500' : 'bg-gray-300'}`}>
            <span className={`w-3 h-3 bg-white rounded-full shadow transition-transform mx-0.5 ${course.isPublished ? 'translate-x-4' : ''}`} />
          </span>
          {course.isPublished ? 'Published' : 'Unpublished'}
        </button>

        <a
          href={`/courses/${courseId}`}
          target="_blank"
          className="px-3 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-50"
        >Preview</a>

        <button
          onClick={() => setShowAttendees(true)}
          className="px-3 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-50"
        >Add Attendees</button>

        <button
          onClick={() => setShowContact(true)}
          className="px-3 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-50"
        >Contact Attendees</button>

        <button
          onClick={handleShare}
          className="px-3 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-50"
        >Share on Web</button>

        <button
          onClick={() => router.push(`/backoffice/courses/${courseId}/edit`)}
          className="px-3 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-50 ml-auto"
        >+ New</button>
      </div>

      {/* Course Fields */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Cover image */}
          <div className="col-span-2 flex items-center gap-4">
            {course.coverImageUrl && (
              <img src={course.coverImageUrl} className="w-20 h-20 object-cover rounded-lg" alt="" />
            )}
            <label className="cursor-pointer text-sm border rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-50">
              Upload Course Image
              <input
                type="file" accept="image/*" className="hidden"
                onChange={async e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const form = new FormData()
                  form.append('image', file)
                  const res = await fetch(`/api/courses/${courseId}/cover`, { method: 'POST', body: form })
                  const data = await res.json()
                  setCourse((prev: any) => ({ ...prev, coverImageUrl: data.coverImageUrl }))
                }}
              />
            </label>
          </div>

          {/* Title */}
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Course Title *</label>
            <input
              defaultValue={course.title}
              onBlur={e => handleSave('title', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. Basics of Odoo CRM"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Tags</label>
            <TagInput
              tags={course.tags}
              onChange={tags => handleSave('tags', tags)}
            />
          </div>

          {/* Website URL */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Website URL</label>
            <input
              defaultValue={course.websiteUrl ?? ''}
              onBlur={e => handleSave('websiteUrl', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. basics-odoo-crm"
            />
          </div>

          {/* Course Admin */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Responsible / Course Admin</label>
            {/* UserSelect component — fetch /api/users and render a dropdown */}
            <UserSelect
              value={course.courseAdminId}
              onChange={id => handleSave('courseAdminId', id)}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex border-b border-gray-200">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-5 py-3 text-sm font-medium transition-colors ${
                activeTab === t.key
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >{t.label}</button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'content'     && <ContentTab     courseId={courseId} course={course} onRefresh={() => fetchCourse(courseId).then(setCourse)} />}
          {activeTab === 'description' && <DescriptionTab courseId={courseId} course={course} onSave={val => handleSave('description', val)} />}
          {activeTab === 'options'     && <OptionsTab     courseId={courseId} course={course} onSave={handleSave} />}
          {activeTab === 'quiz'        && <QuizTab        courseId={courseId} course={course} />}
        </div>
      </div>

      {/* Wizards */}
      {showAttendees && <AttendeeWizard courseId={courseId} onClose={() => setShowAttendees(false)} />}
      {showContact   && <ContactAttendeesWizard courseId={courseId} onClose={() => setShowContact(false)} />}
    </div>
  )
}
```

---

### 4.4 Content Tab — Lesson Editor Modal

```tsx
// apps/web/components/backoffice/LessonEditorModal.tsx  [NEW]
// Used for both creating and editing a lesson. All 3 tabs in one modal.
'use client'

import { useState } from 'react'

type LessonType = 'VIDEO' | 'DOCUMENT' | 'IMAGE'
type EditorTab  = 'content' | 'description' | 'attachments'

interface Props {
  courseId: string
  lesson?: any      // undefined = create mode
  onSave: (data: any) => void
  onClose: () => void
}

export function LessonEditorModal({ courseId, lesson, onSave, onClose }: Props) {
  const [tab,           setTab]           = useState<EditorTab>('content')
  const [title,         setTitle]         = useState(lesson?.title ?? '')
  const [type,          setType]          = useState<LessonType>(lesson?.type ?? 'VIDEO')
  const [description,   setDescription]   = useState(lesson?.description ?? '')
  const [videoUrl,      setVideoUrl]      = useState('')   // for external YouTube/Drive URL (not used in video-service flow)
  const [durationHH,    setDurationHH]    = useState('00')
  const [durationMM,    setDurationMM]    = useState('00')
  const [allowDownload, setAllowDownload] = useState(lesson?.allowDownload ?? false)
  const [docFile,       setDocFile]       = useState<File | null>(null)
  const [imgFile,       setImgFile]       = useState<File | null>(null)
  const [attachments,   setAttachments]   = useState<any[]>(lesson?.attachments ?? [])
  const [newLinkUrl,    setNewLinkUrl]    = useState('')
  const [newAttFile,    setNewAttFile]    = useState<File | null>(null)
  const [saving,        setSaving]        = useState(false)

  // Duration: HH:MM → seconds
  function durationToSeconds() {
    return parseInt(durationHH) * 3600 + parseInt(durationMM) * 60
  }

  async function handleSave() {
    setSaving(true)
    await onSave({
      title, type, description, allowDownload,
      durationSeconds: type === 'VIDEO' ? durationToSeconds() : undefined,
      docFile: type === 'DOCUMENT' ? docFile : undefined,
      imgFile: type === 'IMAGE'    ? imgFile : undefined,
      newLinkUrl, newAttFile,
    })
    setSaving(false)
  }

  const tabs: { key: EditorTab; label: string }[] = [
    { key: 'content',     label: 'Content'               },
    { key: 'description', label: 'Description'           },
    { key: 'attachments', label: 'Additional Attachment' },
  ]

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        {/* Modal header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-sm">{lesson ? 'Edit Lesson' : 'Add Content'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-4">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-2.5 text-xs font-medium transition-colors ${
                tab === t.key ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'
              }`}
            >{t.label}</button>
          ))}
        </div>

        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">

          {/* ── TAB 1: CONTENT ─────────────────────────────── */}
          {tab === 'content' && (
            <>
              {/* Title */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Content Title *</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. Introduction to CRM"
                />
              </div>

              {/* Type selector */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Content Category</label>
                <div className="flex gap-2">
                  {(['VIDEO', 'DOCUMENT', 'IMAGE'] as LessonType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        type === t ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600'
                      }`}
                    >{t.charAt(0) + t.slice(1).toLowerCase()}</button>
                  ))}
                </div>
              </div>

              {/* VIDEO: show upload-to-video-service flow */}
              {type === 'VIDEO' && (
                <VideoUploadField courseId={courseId} lessonId={lesson?.id} />
              )}

              {/* VIDEO: duration */}
              {type === 'VIDEO' && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Duration (HH:MM)</label>
                  <div className="flex gap-2 items-center">
                    <input value={durationHH} onChange={e => setDurationHH(e.target.value)}
                      className="w-16 border rounded-lg px-2 py-2 text-sm text-center" placeholder="00" />
                    <span className="text-gray-500">:</span>
                    <input value={durationMM} onChange={e => setDurationMM(e.target.value)}
                      className="w-16 border rounded-lg px-2 py-2 text-sm text-center" placeholder="00" />
                    <span className="text-xs text-gray-400">hours</span>
                  </div>
                </div>
              )}

              {/* DOCUMENT: file upload + allow download */}
              {type === 'DOCUMENT' && (
                <>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Document File</label>
                    <label className="cursor-pointer inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                      {docFile ? docFile.name : 'Upload file'}
                      <input type="file" className="hidden" onChange={e => setDocFile(e.target.files?.[0] ?? null)} />
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-500">Allow Download</span>
                    <ToggleSwitch value={allowDownload} onChange={setAllowDownload} />
                  </div>
                </>
              )}

              {/* IMAGE: file upload + allow download */}
              {type === 'IMAGE' && (
                <>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Image File</label>
                    <label className="cursor-pointer inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                      {imgFile ? imgFile.name : 'Upload image'}
                      <input type="file" accept="image/*" className="hidden" onChange={e => setImgFile(e.target.files?.[0] ?? null)} />
                    </label>
                    {imgFile && <img src={URL.createObjectURL(imgFile)} className="mt-2 w-full max-h-32 object-cover rounded-lg" alt="" />}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-500">Allow Download</span>
                    <ToggleSwitch value={allowDownload} onChange={setAllowDownload} />
                  </div>
                </>
              )}
            </>
          )}

          {/* ── TAB 2: DESCRIPTION ─────────────────────────── */}
          {tab === 'description' && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Lesson Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={8}
                className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                placeholder="Write your content description here..."
              />
            </div>
          )}

          {/* ── TAB 3: ADDITIONAL ATTACHMENTS ──────────────── */}
          {tab === 'attachments' && (
            <div className="space-y-4">
              {/* Existing attachments */}
              {attachments.map((att: any) => (
                <div key={att.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                  <span>{att.type === 'LINK' ? att.linkUrl : att.label ?? 'File'}</span>
                  <button className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                </div>
              ))}

              {/* Add external link */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Link</label>
                <input
                  value={newLinkUrl}
                  onChange={e => setNewLinkUrl(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. www.google.com"
                />
              </div>

              {/* Add file */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">File</label>
                <label className="cursor-pointer inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  {newAttFile ? newAttFile.name : 'Upload your file'}
                  <input type="file" className="hidden" onChange={e => setNewAttFile(e.target.files?.[0] ?? null)} />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-4 py-3 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

#### `VideoUploadField.tsx` (inside LessonEditorModal — video service integration)

```tsx
// This sub-component handles the presigned URL flow:
// 1. POST /api/lessons/courses/:cId/lessons/:lId/video/init  → { videoId, uploadUrl }
// 2. Browser PUT file directly to uploadUrl (presigned S3 URL)
// 3. POST /api/lessons/courses/:cId/lessons/:lId/video/process  → starts transcoding
// 4. UI polls lesson.videoStatus until READY (or shows "Processing...")

function VideoUploadField({ courseId, lessonId }: { courseId: string; lessonId?: string }) {
  const [status,   setStatus]   = useState<'idle' | 'uploading' | 'processing' | 'ready' | 'failed'>('idle')
  const [progress, setProgress] = useState(0)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !lessonId) return

    setStatus('uploading')

    // Step 1: Get presigned URL
    const initRes = await fetch(`/api/lessons/courses/${courseId}/lessons/${lessonId}/video/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, mimeType: file.type }),
    })
    const { uploadUrl } = await initRes.json()

    // Step 2: PUT directly to presigned URL (XMLHttpRequest for progress)
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
      }
      xhr.onload  = () => { resolve() }
      xhr.onerror = () => { reject() }
      xhr.open('PUT', uploadUrl)
      xhr.setRequestHeader('Content-Type', file.type)
      xhr.send(file)
    })

    // Step 3: Trigger transcoding
    await fetch(`/api/lessons/courses/${courseId}/lessons/${lessonId}/video/process`, { method: 'POST' })

    setStatus('processing')
    // Step 4: Poll for status (every 5s)
    const poll = setInterval(async () => {
      const res = await fetch(`/api/courses/${courseId}`)
      const data = await res.json()
      const lesson = data.lessons?.find((l: any) => l.id === lessonId)
      if (lesson?.videoStatus === 'READY') {
        setStatus('ready')
        clearInterval(poll)
      } else if (lesson?.videoStatus === 'FAILED') {
        setStatus('failed')
        clearInterval(poll)
      }
    }, 5000)
  }

  return (
    <div>
      <label className="text-xs font-medium text-gray-500 mb-1 block">Video File</label>
      {status === 'idle' && (
        <label className="cursor-pointer inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
          Upload video (MP4, MOV, AVI)
          <input type="file" accept="video/*" className="hidden" onChange={handleFile} />
        </label>
      )}
      {status === 'uploading'   && <div className="text-sm text-blue-600">Uploading… {progress}%</div>}
      {status === 'processing'  && <div className="text-sm text-amber-600">Processing (transcoding)… this may take a few minutes</div>}
      {status === 'ready'       && <div className="text-sm text-green-600">✓ Video ready</div>}
      {status === 'failed'      && <div className="text-sm text-red-600">✗ Processing failed — try again</div>}
    </div>
  )
}
```

---

### 4.5 A5 — Options Tab

```tsx
// Inline component rendered inside the Course Form tab panel

function OptionsTab({ courseId, course, onSave }: { courseId: string; course: any; onSave: (k: string, v: any) => void }) {
  return (
    <div className="space-y-6 max-w-md">
      {/* Show course to */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">Show course to</label>
        <div className="flex flex-col gap-2">
          {[
            { value: 'EVERYONE',  label: 'Everyone',  desc: 'Visible to all visitors including guests' },
            { value: 'SIGNED_IN', label: 'Signed In', desc: 'Visible only to logged-in users' },
          ].map(opt => (
            <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio" name="visibility"
                checked={course.visibility === opt.value}
                onChange={() => onSave('visibility', opt.value)}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm font-medium">{opt.label}</div>
                <div className="text-xs text-gray-500">{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Access rules */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">Access rules</label>
        <div className="flex flex-col gap-2">
          {[
            { value: 'OPEN',          label: 'Open',          desc: 'Anyone who can see the course can start' },
            { value: 'ON_INVITATION', label: 'On Invitation', desc: 'Only invited attendees can access' },
            { value: 'ON_PAYMENT',    label: 'On Payment',    desc: 'User must pay before accessing' },
          ].map(opt => (
            <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio" name="accessRule"
                checked={course.accessRule === opt.value}
                onChange={() => onSave('accessRule', opt.value)}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm font-medium">{opt.label}</div>
                <div className="text-xs text-gray-500">{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Price field — only when ON_PAYMENT */}
      {course.accessRule === 'ON_PAYMENT' && (
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Price (INR)</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">INR</span>
            <input
              type="number" min="0"
              defaultValue={course.price ?? ''}
              onBlur={e => onSave('price', parseFloat(e.target.value))}
              className="border rounded-lg px-3 py-2 text-sm w-32"
              placeholder="500"
            />
          </div>
        </div>
      )}

      {/* Course Admin */}
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Course Admin</label>
        <UserSelect
          value={course.courseAdminId}
          onChange={id => onSave('courseAdminId', id)}
        />
      </div>
    </div>
  )
}
```

---

### 4.6 A7 — Quiz Builder

```tsx
// apps/web/app/(backoffice)/courses/[courseId]/edit/quiz/[quizId]/page.tsx  [NEW]
'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { fetchQuiz, addQuestion, updateQuestion, deleteQuestion, upsertReward } from '@/lib/api/quiz'
import { RewardsPanel } from '@/components/backoffice/RewardsPanel'

export default function QuizBuilderPage() {
  const { courseId, quizId } = useParams<{ courseId: string; quizId: string }>()
  const [quiz,            setQuiz]            = useState<any>(null)
  const [activeQuestion,  setActiveQuestion]  = useState<number>(0)
  const [showRewards,     setShowRewards]     = useState(false)

  useEffect(() => { fetchQuiz(courseId, quizId).then(setQuiz) }, [quizId])

  async function handleAddQuestion() {
    const q = await addQuestion(courseId, quizId, {
      text: 'Write your question here',
      options: [
        { text: 'Answer 1', isCorrect: false },
        { text: 'Answer 2', isCorrect: false },
        { text: 'Answer 3', isCorrect: false },
      ],
    })
    setQuiz((prev: any) => ({ ...prev, questions: [...prev.questions, q] }))
    setActiveQuestion(quiz.questions.length)
  }

  if (!quiz) return <div className="p-8 text-gray-500">Loading...</div>

  const question = quiz.questions[activeQuestion]

  return (
    <div className="flex h-[calc(100vh-140px)]">
      {/* LEFT: question list */}
      <aside className="w-56 border-r border-gray-200 flex flex-col bg-white">
        <div className="p-4 border-b font-medium text-sm">Question List</div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {quiz.questions.map((q: any, i: number) => (
            <button
              key={q.id}
              onClick={() => setActiveQuestion(i)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                i === activeQuestion ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Question {i + 1}
            </button>
          ))}
        </div>
        <div className="p-3 border-t space-y-2">
          <button
            onClick={handleAddQuestion}
            className="w-full text-sm bg-blue-600 text-white px-3 py-2 rounded-lg"
          >+ Add Question</button>
          <button
            onClick={() => setShowRewards(true)}
            className="w-full text-sm border border-gray-300 px-3 py-2 rounded-lg text-gray-600"
          >Rewards</button>
        </div>
      </aside>

      {/* RIGHT: question editor */}
      <main className="flex-1 p-6 overflow-y-auto bg-gray-50">
        {question ? (
          <QuestionEditor
            question={question}
            index={activeQuestion}
            onUpdate={async (data) => {
              const updated = await updateQuestion(courseId, quizId, question.id, data)
              setQuiz((prev: any) => ({
                ...prev,
                questions: prev.questions.map((q: any, i: number) => i === activeQuestion ? updated : q),
              }))
            }}
            onDelete={async () => {
              await deleteQuestion(courseId, quizId, question.id)
              setQuiz((prev: any) => ({
                ...prev,
                questions: prev.questions.filter((_: any, i: number) => i !== activeQuestion),
              }))
              setActiveQuestion(Math.max(0, activeQuestion - 1))
            }}
          />
        ) : (
          <div className="text-center text-gray-400 mt-20">
            <p className="text-sm">No questions yet.</p>
            <button onClick={handleAddQuestion} className="mt-3 text-sm text-blue-600">Add your first question →</button>
          </div>
        )}
      </main>

      {/* Rewards panel */}
      {showRewards && (
        <RewardsPanel
          reward={quiz.reward}
          onSave={async (data) => {
            await upsertReward(courseId, quizId, data)
            setShowRewards(false)
          }}
          onClose={() => setShowRewards(false)}
        />
      )}
    </div>
  )
}

function QuestionEditor({ question, index, onUpdate, onDelete }: any) {
  const [text,    setText]    = useState(question.text)
  const [options, setOptions] = useState(question.options)

  async function save() {
    await onUpdate({ text, options: options.map((o: any) => ({ text: o.text, isCorrect: o.isCorrect })) })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-500">{index + 1}.</span>
        <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-600">Delete question</button>
      </div>

      {/* Question text */}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={save}
        rows={2}
        className="w-full border rounded-lg px-3 py-2 text-sm mb-4 resize-none"
        placeholder="Write your question here"
      />

      {/* Choices */}
      <div className="space-y-2 mb-4">
        <div className="grid grid-cols-[1fr_auto] gap-2 text-xs font-medium text-gray-500 px-1 mb-1">
          <span>Choices</span><span>Correct</span>
        </div>
        {options.map((opt: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={opt.text}
              onChange={e => {
                const updated = options.map((o: any, j: number) => j === i ? { ...o, text: e.target.value } : o)
                setOptions(updated)
              }}
              onBlur={save}
              className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
              placeholder={`Answer ${i + 1}`}
            />
            <input
              type="checkbox"
              checked={opt.isCorrect}
              onChange={e => {
                const updated = options.map((o: any, j: number) => j === i ? { ...o, isCorrect: e.target.checked } : o)
                setOptions(updated)
                onUpdate({ text, options: updated.map((o: any) => ({ text: o.text, isCorrect: o.isCorrect })) })
              }}
              className="w-4 h-4"
            />
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          const updated = [...options, { text: `Answer ${options.length + 1}`, isCorrect: false }]
          setOptions(updated)
        }}
        className="text-xs text-blue-600 hover:underline"
      >+ Add choice</button>
    </div>
  )
}
```

#### `RewardsPanel.tsx`

```tsx
// apps/web/components/backoffice/RewardsPanel.tsx  [NEW]
export function RewardsPanel({ reward, onSave, onClose }: any) {
  const [pts, setPts] = useState({
    attempt1Points:     reward?.attempt1Points     ?? 10,
    attempt2Points:     reward?.attempt2Points     ?? 7,
    attempt3Points:     reward?.attempt3Points     ?? 5,
    attempt4PlusPoints: reward?.attempt4PlusPoints ?? 2,
  })

  const rows = [
    { key: 'attempt1Points',     label: 'First try'            },
    { key: 'attempt2Points',     label: 'Second try'           },
    { key: 'attempt3Points',     label: 'Third try'            },
    { key: 'attempt4PlusPoints', label: 'Fourth try and more'  },
  ]

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-80 p-6">
        <h3 className="font-semibold mb-4">Rewards</h3>
        <div className="space-y-3">
          {rows.map(row => (
            <div key={row.key} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{row.label}:</span>
              <div className="flex items-center gap-2">
                <input
                  type="number" min="0"
                  value={(pts as any)[row.key]}
                  onChange={e => setPts(p => ({ ...p, [row.key]: parseInt(e.target.value) }))}
                  className="w-16 border rounded-lg px-2 py-1 text-sm text-center"
                />
                <span className="text-xs text-gray-400">points</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose}        className="flex-1 border rounded-lg py-2 text-sm text-gray-600">Cancel</button>
          <button onClick={() => onSave(pts)} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm">Save</button>
        </div>
      </div>
    </div>
  )
}
```

---

### 4.7 A8 — Reporting Dashboard

```tsx
// apps/web/app/(backoffice)/reporting/page.tsx  [NEW]
'use client'

import { useState, useEffect } from 'react'
import { fetchReportingSummary, fetchReportingTable, fetchReportingCourses } from '@/lib/api/reporting'

const COLUMNS = [
  { key: 'courseName',      label: 'Course Name'           },
  { key: 'participantName', label: 'Participant Name'       },
  { key: 'enrolledDate',    label: 'Enrolled Date'         },
  { key: 'startDate',       label: 'Start Date'            },
  { key: 'timeSpent',       label: 'Time Spent'            },
  { key: 'completionPct',   label: 'Completion %'          },
  { key: 'completedDate',   label: 'Completed Date'        },
  { key: 'status',          label: 'Status'                },
]

export default function ReportingPage() {
  const [courses,        setCourses]        = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string | undefined>(undefined)
  const [summary,        setSummary]        = useState<any>(null)
  const [table,          setTable]          = useState<any>(null)
  const [statusFilter,   setStatusFilter]   = useState<string | undefined>(undefined)
  const [visibleCols,    setVisibleCols]    = useState<Set<string>>(new Set(COLUMNS.map(c => c.key)))
  const [showColPanel,   setShowColPanel]   = useState(false)
  const [page,           setPage]           = useState(1)

  useEffect(() => { fetchReportingCourses().then(setCourses) }, [])

  useEffect(() => {
    fetchReportingSummary(selectedCourse).then(setSummary)
    fetchReportingTable({ courseId: selectedCourse, status: statusFilter, page }).then(setTable)
  }, [selectedCourse, statusFilter, page])

  const statCards = [
    { key: 'total',      label: 'Total Participants', value: summary?.total      ?? 0 },
    { key: 'yetToStart', label: 'Yet to Start',       value: summary?.yetToStart ?? 0, filter: 'YET_TO_START' },
    { key: 'inProgress', label: 'In Progress',        value: summary?.inProgress ?? 0, filter: 'IN_PROGRESS' },
    { key: 'completed',  label: 'Completed',          value: summary?.completed  ?? 0, filter: 'COMPLETED' },
  ]

  function formatDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
      YET_TO_START: 'bg-gray-100 text-gray-600',
      IN_PROGRESS:  'bg-blue-100 text-blue-700',
      COMPLETED:    'bg-green-100 text-green-700',
    }
    const labels: Record<string, string> = {
      YET_TO_START: 'Yet to Start',
      IN_PROGRESS:  'In Progress',
      COMPLETED:    'Completed',
    }
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status]}`}>
        {labels[status] ?? status}
      </span>
    )
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Reporting</h1>

      {/* Course cards (click to filter) */}
      <div className="flex gap-3 overflow-x-auto pb-2 mb-6">
        <button
          onClick={() => setSelectedCourse(undefined)}
          className={`flex-shrink-0 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
            !selectedCourse ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
          }`}
        >All Courses</button>
        {courses.map((c: any) => (
          <button
            key={c.id}
            onClick={() => setSelectedCourse(c.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl border text-sm transition-colors ${
              selectedCourse === c.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            {c.title}
            <span className="ml-2 bg-white/20 text-xs px-1.5 rounded-full">{c._count.enrollments}</span>
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {statCards.map(card => (
          <button
            key={card.key}
            onClick={() => setStatusFilter(prev => prev === card.filter ? undefined : card.filter)}
            className={`bg-white border rounded-xl p-4 text-left transition-all ${
              statusFilter === card.filter ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-2xl font-semibold">{card.value}</div>
            <div className="text-xs text-gray-500 mt-1">{card.label}</div>
          </button>
        ))}
      </div>

      {/* Table header */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-700">
            Participants {table?.total ? `(${table.total})` : ''}
          </span>
          <button
            onClick={() => setShowColPanel(!showColPanel)}
            className="text-xs border rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50"
          >Customize columns</button>
        </div>

        {/* Column customizer panel */}
        {showColPanel && (
          <div className="border-b border-gray-100 px-4 py-3 bg-gray-50 flex flex-wrap gap-3">
            {COLUMNS.map(col => (
              <label key={col.key} className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleCols.has(col.key)}
                  onChange={e => {
                    const next = new Set(visibleCols)
                    if (e.target.checked) next.add(col.key); else next.delete(col.key)
                    setVisibleCols(next)
                  }}
                />
                {col.label}
              </label>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-10">S.No.</th>
                {COLUMNS.filter(c => visibleCols.has(c.key)).map(col => (
                  <th key={col.key} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table?.data?.map((row: any, i: number) => (
                <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400 text-xs">{(page - 1) * 20 + i + 1}</td>
                  {visibleCols.has('courseName')      && <td className="px-4 py-3">{row.courseName}</td>}
                  {visibleCols.has('participantName') && <td className="px-4 py-3 font-medium">{row.participantName}</td>}
                  {visibleCols.has('enrolledDate')    && <td className="px-4 py-3 text-gray-500">{formatDate(row.enrolledDate)}</td>}
                  {visibleCols.has('startDate')       && <td className="px-4 py-3 text-gray-500">{formatDate(row.startDate)}</td>}
                  {visibleCols.has('timeSpent')       && <td className="px-4 py-3 text-gray-500">{row.timeSpent}</td>}
                  {visibleCols.has('completionPct')   && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden w-16">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${row.completionPct}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{row.completionPct}%</span>
                      </div>
                    </td>
                  )}
                  {visibleCols.has('completedDate')   && <td className="px-4 py-3 text-gray-500">{formatDate(row.completedDate)}</td>}
                  {visibleCols.has('status')          && <td className="px-4 py-3"><StatusBadge status={row.status} /></td>}
                </tr>
              ))}
              {(!table?.data?.length) && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400 text-sm">No data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {table?.totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 text-xs border rounded-lg disabled:opacity-40"
            >← Prev</button>
            <span className="text-xs text-gray-500">{page} / {table.totalPages}</span>
            <button
              disabled={page === table.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 text-xs border rounded-lg disabled:opacity-40"
            >Next →</button>
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## 5. Video Service Integration (Webhook + JWT)

This summarises the 3-step flow in one place for reference during implementation:

```
┌─────────────────┐        ┌───────────────────┐        ┌───────────────────────┐
│  Next.js Browser │        │  Monolith (4000)   │        │  Video Service (4001)  │
│  (instructor)    │        │                   │        │                       │
│                  │        │                   │        │                       │
│  1. Clicks       │        │                   │        │                       │
│  "Upload video"  │──────►│ POST /lessons/.../│──────►│ POST /videos/upload-url│
│                  │        │ video/init         │        │ → { videoId, uploadUrl}│
│                  │◄──────│ returns uploadUrl  │◄──────│                       │
│                  │        │                   │        │                       │
│  2. PUT file     │──────────────────────────────────►│ S3/MinIO (presigned)  │
│  to uploadUrl    │        │                   │        │                       │
│                  │        │                   │        │                       │
│  3. After PUT,   │──────►│ POST /lessons/.../│──────►│ POST /videos/:id/process│
│  trigger process │        │ video/process      │        │ (starts BullMQ job)   │
│                  │        │                   │        │                       │
│  4. Polls lesson │──────►│ GET /courses/:id  │        │   ··· FFmpeg working ···│
│  videoStatus     │◄──────│ (lesson.videoStatus│        │                       │
│  (every 5s)      │        │  = PROCESSING)    │        │                       │
│                  │        │                   │        │                       │
│  5. Webhook fires│        │ POST /webhooks/   │◄──────│ POST {event:video.ready│
│  (when READY)    │        │ video              │        │ streamUrl, thumbnailUrl│
│                  │        │ updates lesson in  │        │                       │
│                  │        │ DB (videoStatus=   │        │                       │
│                  │        │ READY, streamUrl)  │        │                       │
│                  │        │                   │        │                       │
│  6. Polls again  │──────►│ GET /courses/:id  │        │                       │
│  videoStatus=READY│◄─────│ (lesson.videoStatus│        │                       │
│  → shows "ready" │        │  = READY)         │        │                       │
└─────────────────┘        └───────────────────┘        └───────────────────────┘
```

**Required env vars in monolith `.env`:**

```bash
# Must match services/video-service/.env
SERVICE_AUTH_SECRET=<same 48-byte secret>
VIDEO_SERVICE_URL=http://localhost:4001/api

# Used in webhook callback URL
SERVER_BASE_URL=http://localhost:4000

# Your own storage (for course images, lesson docs, attachments)
# Can reuse MinIO or a separate bucket
STORAGE_BUCKET=learnova-main
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false

# Frontend URL (for share links)
WEB_BASE_URL=http://localhost:3000
```

---

## 6. Implementation Order

Follow this exact sequence. Each step is independently testable.

```
STEP 1 — Schema  (~15 min)
  └─ Add all new models to schema.prisma
  └─ Run: npx prisma db push && npx prisma generate
  └─ Verify: npx prisma studio — confirm all tables created

STEP 2 — Course CRUD  (~30 min)
  └─ course.router + controller + service + schema
  └─ Test: POST /api/courses → GET /api/courses → PATCH → DELETE
  └─ Test: POST /api/courses/:id/publish (toggle)

STEP 3 — Section CRUD  (~15 min)
  └─ section.router + service
  └─ Test: POST section → GET course (sections included) → DELETE section

STEP 4 — Lesson CRUD (no files)  (~20 min)
  └─ lesson.router + service (skip file upload functions for now)
  └─ Test: create VIDEO lesson → update title → delete

STEP 5 — Webhook receiver  (~10 min)
  └─ webhook.router + controller
  └─ Test: POST /api/webhooks/video with a fake payload → confirm lesson updated

STEP 6 — Video upload flow  (~20 min)
  └─ videoServiceClient.ts
  └─ initVideoUpload + processVideo in lesson.service
  └─ Test: init → get uploadUrl → confirm videoServiceId saved in DB

STEP 7 — File uploads (doc/image + attachments)  (~20 min)
  └─ uploadMiddleware + storage helper
  └─ uploadLessonFile + addAttachment + deleteAttachment
  └─ Test: upload a PDF → confirm fileUrl saved

STEP 8 — Quiz CRUD  (~20 min)
  └─ quiz.router + service
  └─ Test: create quiz → add 2 questions → set rewards → get full quiz

STEP 9 — Reporting  (~20 min)
  └─ reporting.router + service
  └─ Seed 2–3 enrollments manually via prisma studio
  └─ Test: GET /api/reporting/summary → GET /api/reporting/table

STEP 10 — Frontend: A1 Dashboard  (~45 min)
  └─ CoursesPage + KanbanBoard + CourseCard + CreateCourseModal
  └─ Wire to API helpers in lib/api/courses.ts
  └─ Test: create course via UI → appears in kanban → publish toggle works

STEP 11 — Frontend: A2 Course Form  (~45 min)
  └─ CourseEditPage with header actions and all 4 tabs
  └─ Test: edit title → save → publish → share link

STEP 12 — Frontend: A3+A4 Content Tab + LessonEditorModal  (~60 min)
  └─ ContentTab + LessonEditorModal (all 3 inner tabs)
  └─ VideoUploadField with presigned URL flow
  └─ Test: add VIDEO lesson → upload file → confirm processing state

STEP 13 — Frontend: A5 Options Tab  (~20 min)
  └─ OptionsTab inline component
  └─ Test: switch to ON_PAYMENT → price field appears → save

STEP 14 — Frontend: A6+A7 Quiz Builder  (~40 min)
  └─ QuizListTab + QuizBuilderPage + RewardsPanel
  └─ Test: add 3 questions → mark correct answers → set rewards

STEP 15 — Frontend: A8 Reporting  (~30 min)
  └─ ReportingPage
  └─ Test: click course card → table filters → click stat card → table filters
```

---

*End of BACKOFFICE_CORE_PLAN.md — Total estimated backend + frontend: ~7 hours as per build plan.*