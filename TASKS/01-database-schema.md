# Task: Database Schema (Prisma)

## Overview
Define all Prisma models for Learnova based on the Data Entities in the PRD. All models live in `server/prisma/schema.prisma`.

---

## Tasks
- [ ] Replace the stub `schema.prisma` with the full schema below
- [ ] Run `npm run db:migrate` to generate and apply the first migration
- [ ] Run `npm run db:generate` to regenerate the Prisma client
- [ ] Seed file `server/prisma/seed.ts` — create 1 admin user, 1 instructor, 1 learner for dev

---

## Full Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ────────────────────────────────────────────────────────────────────

enum Role {
  ADMIN
  INSTRUCTOR
  LEARNER
}

enum LessonType {
  VIDEO
  DOCUMENT
  IMAGE
  QUIZ
}

enum Visibility {
  EVERYONE
  SIGNED_IN
}

enum AccessRule {
  OPEN
  ON_INVITATION
  ON_PAYMENT
}

enum EnrollmentStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
}

enum AttachmentType {
  FILE
  LINK
}

// ─── Models ───────────────────────────────────────────────────────────────────

model User {
  id           Int      @id @default(autoincrement())
  email        String   @unique
  name         String
  passwordHash String
  role         Role     @default(LEARNER)
  totalPoints  Int      @default(0)
  currentBadge String?  // Newbie | Explorer | Achiever | Specialist | Expert | Master
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // Relations
  ownedCourses     Course[]      @relation("CourseInstructor")
  adminCourses     Course[]      @relation("CourseAdmin")
  enrollments      Enrollment[]
  quizAttempts     QuizAttempt[]
  reviews          Review[]
  lessonProgresses LessonProgress[]
}

model Course {
  id           Int        @id @default(autoincrement())
  title        String
  tags         String[]
  description  String?    // rich text HTML stored as string
  coverImage   String?    // file path or URL
  isPublished  Boolean    @default(false)
  visibility   Visibility @default(EVERYONE)
  accessRule   AccessRule @default(OPEN)
  price        Decimal?   @db.Decimal(10, 2)
  websiteUrl   String?

  instructorId Int
  instructor   User   @relation("CourseInstructor", fields: [instructorId], references: [id])
  courseAdminId Int?
  courseAdmin   User?  @relation("CourseAdmin", fields: [courseAdminId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  lessons     Lesson[]
  quizzes     Quiz[]
  enrollments Enrollment[]
  reviews     Review[]
}

model Lesson {
  id            Int        @id @default(autoincrement())
  courseId      Int
  course        Course     @relation(fields: [courseId], references: [id], onDelete: Cascade)
  title         String
  type          LessonType
  order         Int
  description   String?    // rich text HTML
  videoUrl      String?    // YouTube / Drive URL (VIDEO type)
  duration      Int?       // seconds (VIDEO type)
  filePath      String?    // uploaded file path (DOCUMENT / IMAGE type)
  allowDownload Boolean    @default(false)
  responsibleId Int?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  attachments     Attachment[]
  lessonProgresses LessonProgress[]

  @@index([courseId, order])
}

model Attachment {
  id          Int            @id @default(autoincrement())
  lessonId    Int
  lesson      Lesson         @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  type        AttachmentType
  label       String
  filePath    String?        // FILE type
  externalUrl String?        // LINK type
  createdAt   DateTime       @default(now())
}

model Quiz {
  id       Int    @id @default(autoincrement())
  courseId Int
  course   Course @relation(fields: [courseId], references: [id], onDelete: Cascade)
  title    String

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  questions   Question[]
  rewards     QuizReward?
  attempts    QuizAttempt[]
}

model Question {
  id             Int      @id @default(autoincrement())
  quizId         Int
  quiz           Quiz     @relation(fields: [quizId], references: [id], onDelete: Cascade)
  text           String
  options        String[] // array of option texts
  correctOptions Int[]    // indices of correct options (0-based)
  order          Int

  @@index([quizId, order])
}

model QuizReward {
  id               Int  @id @default(autoincrement())
  quizId           Int  @unique
  quiz             Quiz @relation(fields: [quizId], references: [id], onDelete: Cascade)
  attempt1Points   Int  @default(10)
  attempt2Points   Int  @default(7)
  attempt3Points   Int  @default(4)
  attempt4PlusPoints Int @default(1)
}

model Enrollment {
  id          Int              @id @default(autoincrement())
  userId      Int
  user        User             @relation(fields: [userId], references: [id])
  courseId    Int
  course      Course           @relation(fields: [courseId], references: [id])
  enrolledAt  DateTime         @default(now())
  startedAt   DateTime?
  completedAt DateTime?
  status      EnrollmentStatus @default(NOT_STARTED)
  timeSpent   Int              @default(0) // seconds

  // Relations
  lessonProgresses LessonProgress[]

  @@unique([userId, courseId])
}

model LessonProgress {
  id           Int        @id @default(autoincrement())
  enrollmentId Int
  enrollment   Enrollment @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)
  lessonId     Int
  lesson       Lesson     @relation(fields: [lessonId], references: [id])
  userId       Int
  user         User       @relation(fields: [userId], references: [id])
  isCompleted  Boolean    @default(false)
  completedAt  DateTime?

  @@unique([enrollmentId, lessonId])
}

model QuizAttempt {
  id            Int      @id @default(autoincrement())
  userId        Int
  user          User     @relation(fields: [userId], references: [id])
  quizId        Int
  quiz          Quiz     @relation(fields: [quizId], references: [id])
  attemptNumber Int
  answers       Json     // { questionId: selectedOptionIndex }[]
  pointsEarned  Int      @default(0)
  completedAt   DateTime @default(now())

  @@index([userId, quizId])
}

model Review {
  id         Int      @id @default(autoincrement())
  userId     Int
  user       User     @relation(fields: [userId], references: [id])
  courseId   Int
  course     Course   @relation(fields: [courseId], references: [id])
  rating     Int      // 1-5
  reviewText String?
  createdAt  DateTime @default(now())

  @@unique([userId, courseId])
}
```

---

## Seed Data (`server/prisma/seed.ts`)

```ts
import { PrismaClient } from '../src/generated/prisma'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hash = (pw: string) => bcrypt.hash(pw, 10)

  await prisma.user.upsert({
    where: { email: 'admin@learnova.dev' },
    update: {},
    create: { email: 'admin@learnova.dev', name: 'Admin', passwordHash: await hash('admin123'), role: 'ADMIN' },
  })

  await prisma.user.upsert({
    where: { email: 'instructor@learnova.dev' },
    update: {},
    create: { email: 'instructor@learnova.dev', name: 'Jane Instructor', passwordHash: await hash('inst123'), role: 'INSTRUCTOR' },
  })

  await prisma.user.upsert({
    where: { email: 'learner@learnova.dev' },
    update: {},
    create: { email: 'learner@learnova.dev', name: 'John Learner', passwordHash: await hash('learn123'), role: 'LEARNER' },
  })

  console.log('Seed complete')
}

main().finally(() => prisma.$disconnect())
```

---

## Badge Thresholds (application-level constant)

```ts
// server/src/config/badges.ts
export const BADGE_THRESHOLDS = [
  { name: 'Newbie',     min: 20  },
  { name: 'Explorer',   min: 40  },
  { name: 'Achiever',   min: 60  },
  { name: 'Specialist', min: 80  },
  { name: 'Expert',     min: 100 },
  { name: 'Master',     min: 120 },
] as const

export function computeBadge(totalPoints: number): string | null {
  const earned = [...BADGE_THRESHOLDS].reverse().find(b => totalPoints >= b.min)
  return earned?.name ?? null
}
```
