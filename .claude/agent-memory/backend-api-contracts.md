---
name: backend-api-contracts
description: All implemented backend API endpoints, module structure, and response shapes for Learnova server
type: project
---

# Learnova Backend — API Contracts

**Stack:** Express 5 + TypeScript + Prisma 7 + PostgreSQL
**Base URL:** `http://localhost:4000/api`
**Auth:** Bearer JWT in `Authorization` header
**Error shape:** `{ message: string, code: string, details?: unknown }`

**Why:** Frontend agent writes code against the same TASKS/*.md files. This document ensures both sides stay in sync on exact endpoint paths, request/response shapes, and access rules.

**How to apply:** When frontend agent needs to know an exact API contract, refer here first before reading the source.

---

## Implemented Modules

### Auth — `/api/auth`
| Method | Path | Access | Response |
|--------|------|--------|----------|
| POST | `/signup` | Public | `{ user: { id, name, email, role }, token }` |
| POST | `/login` | Public | `{ user: { id, name, email, role, totalPoints, currentBadge }, token }` |
| GET | `/me` | Authenticated | `{ user: { id, name, email, role, totalPoints, currentBadge, createdAt } }` |
| POST | `/logout` | Authenticated | `{ message: 'Logged out' }` |

### Users — `/api/users`
| Method | Path | Access | Notes |
|--------|------|--------|-------|
| GET | `/?role=INSTRUCTOR,ADMIN` | ADMIN, INSTRUCTOR | `{ users: { id, name, email, role }[] }` |

### Courses — `/api/courses`
| Method | Path | Access | Notes |
|--------|------|--------|-------|
| GET | `/` | ADMIN, INSTRUCTOR | Query: `?search=`. Returns `{ courses: [...] }` |
| POST | `/` | ADMIN, INSTRUCTOR | Body: `{ title }`. Returns `{ id, title }` |
| DELETE | `/:id` | ADMIN, INSTRUCTOR | 204 no content |
| POST | `/:id/share-link` | ADMIN, INSTRUCTOR | Returns `{ url }` |
| GET | `/:id` | ADMIN, INSTRUCTOR | Full course with lessons, quizzes, enrollmentCount |
| PATCH | `/:id` | ADMIN, INSTRUCTOR | Body: partial `{ title, tags, description, websiteUrl, courseAdminId }` |
| PATCH | `/:id/publish` | ADMIN, INSTRUCTOR | Body: `{ isPublished: boolean }`. 422 if publishing without websiteUrl |
| POST | `/:id/cover` | ADMIN, INSTRUCTOR | Multipart `cover` field. Returns `{ coverImage }` |
| POST | `/:id/attendees` | ADMIN, INSTRUCTOR | Body: `{ emails: string[] }`. Returns `{ enrolled, alreadyEnrolled, invited }` |
| POST | `/:id/contact` | ADMIN, INSTRUCTOR | Body: `{ subject, body }`. Returns `{ sent }` |

### Lessons — `/api/courses/:courseId/lessons`
| Method | Path | Access | Notes |
|--------|------|--------|-------|
| GET | `/` | ADMIN, INSTRUCTOR | Returns `{ lessons: [...] }` with attachmentsCount |
| POST | `/` | ADMIN, INSTRUCTOR | Body: `{ title, type, order? }` |
| PATCH | `/reorder` | ADMIN, INSTRUCTOR | Body: `{ lessonIds: number[] }` — ordered array |
| GET | `/:lessonId` | ADMIN, INSTRUCTOR | Full lesson object |
| PATCH | `/:lessonId` | ADMIN, INSTRUCTOR | Partial update |
| DELETE | `/:lessonId` | ADMIN, INSTRUCTOR | 204, re-sequences remaining |
| POST | `/:lessonId/file` | ADMIN, INSTRUCTOR | Multipart `file`. Returns `{ filePath }` |
| GET | `/:lessonId/attachments` | ADMIN, INSTRUCTOR | Returns `{ attachments: [...] }` |
| POST | `/:lessonId/attachments` | ADMIN, INSTRUCTOR | Multipart (file+label) OR JSON (`{ label, externalUrl }`) |
| DELETE | `/:lessonId/attachments/:attachmentId` | ADMIN, INSTRUCTOR | 204 |

---

## File Structure
```
server/src/
├── config/          AppError.ts, badges.ts
├── generated/       prisma client (auto-generated, do not edit)
├── lib/             prisma.ts, jwt.ts, hash.ts, mailer.ts, multer.ts
├── middleware/      authenticate.ts, authorize.ts, errorHandler.ts, notFound.ts, security.ts, validate.ts
├── modules/
│   ├── auth/        auth.schema.ts, auth.service.ts, auth.controller.ts, auth.routes.ts
│   ├── courses/     courses.schema.ts, courses.service.ts, courses.controller.ts, courses.routes.ts
│   ├── lessons/     lessons.schema.ts, lessons.service.ts, lessons.controller.ts, lessons.routes.ts
│   └── users/       users.controller.ts, users.routes.ts
├── routes/          index.ts (mounts all modules), health.route.ts
├── types/           express.d.ts (req.user augmentation)
└── server.ts
```

---

## Key Implementation Notes

- **RBAC:** `authenticate` sets `req.user`. `authorize('ADMIN', 'INSTRUCTOR')` guards routes.
- **Ownership:** INSTRUCTOR can only access their own courses. ADMIN sees all.
- **Multer:** Three typed uploaders in `lib/multer.ts` — `uploadCover`, `uploadLessonFile`, `uploadAttachment`. Dirs auto-created.
- **Static files:** Served at `/uploads/*` from `process.env.UPLOAD_DIR`.
- **Prisma client:** Generated to `src/generated/prisma`. Import from there, not `@prisma/client`.
- **Error handling:** Throw `new AppError(statusCode, message, code)` from services. Global handler in `middleware/errorHandler.ts`.
- **Seed:** `npm run db:seed` creates admin@learnova.dev (admin123), instructor@learnova.dev (inst123), learner@learnova.dev (learn123).

---

## Next Backend Tasks (not yet implemented)
- `src/modules/quizzes/` — Quiz CRUD, question management, rewards
- `src/modules/enrollments/` — Learner enrollment, progress tracking
- `src/modules/reviews/` — Course reviews
- `src/modules/reporting/` — Admin reporting dashboard
- Course options (visibility, accessRule, price) — covered by PATCH /courses/:id but needs CourseOptions UI counterpart
