# Task: Project Setup & Shared Infrastructure

## Overview
Bootstrap both client and server with shared configuration, folder structure, environment variables, and cross-cutting concerns.

---

## Backend (Express + TypeScript + Prisma + PostgreSQL)

### Folder Structure
```
server/src/
├── config/          # env validation, constants
├── generated/       # prisma client (auto-generated)
├── lib/             # prisma client singleton, mailer, storage
├── middleware/      # auth, error handler, rate limiter, upload
├── modules/         # feature modules (each has routes, controller, service)
│   ├── auth/
│   ├── courses/
│   ├── lessons/
│   ├── quizzes/
│   ├── enrollments/
│   ├── reviews/
│   └── reporting/
├── routes/          # index router mounting all module routes
├── types/           # shared TypeScript types & request augmentation
└── server.ts        # Express app bootstrap
```

### Tasks
- [ ] Set up `src/config/env.ts` — use `zod` to parse and validate all env vars (`DATABASE_URL`, `JWT_SECRET`, `PORT`, `FRONTEND_URL`, `SMTP_*`, `UPLOAD_DIR`)
- [ ] Create `src/lib/prisma.ts` — singleton Prisma client export
- [ ] Create `src/lib/mailer.ts` — Nodemailer transport using SMTP config
- [ ] Create `src/middleware/errorHandler.ts` — global Express error handler with structured JSON errors `{ message, code, details }`
- [ ] Create `src/middleware/notFound.ts` — 404 catch-all
- [ ] Create `src/middleware/requestLogger.ts` — Morgan HTTP logging (dev/combined based on env)
- [ ] Create `src/types/express.d.ts` — augment `Request` with `user: { id, role, email }`
- [ ] Update `server.ts` to apply: helmet, cors, compression, rate-limiter, morgan, body parser, route mounting, error handler
- [ ] Create `.env.example` with all required keys documented

### Environment Variables
```env
DATABASE_URL=
PORT=4000
JWT_SECRET=
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=5242880
```

---

## Frontend (Next.js 16 + React 19 + Tailwind + shadcn/ui)

### Folder Structure
```
client/
├── app/
│   ├── (auth)/              # login, signup pages (no navbar)
│   ├── (backoffice)/        # admin/instructor layout + pages
│   │   └── backoffice/
│   │       ├── courses/
│   │       └── reporting/
│   └── (website)/           # learner-facing layout + pages
│       └── courses/
├── components/
│   ├── ui/                  # shadcn primitives
│   ├── shared/              # Avatar, Badge, ProgressBar, Modal, etc.
│   ├── backoffice/          # backoffice-specific components
│   └── website/             # learner-facing components
├── hooks/                   # useAuth, useDebounce, useToast, etc.
├── lib/
│   ├── api.ts               # axios/fetch base client with auth interceptor
│   ├── auth.ts              # token storage helpers
│   └── utils.ts             # cn(), formatDate(), etc.
└── types/
    └── index.ts             # shared TS types matching backend DTOs
```

### Tasks
- [ ] Set up `lib/api.ts` — fetch wrapper with `Authorization: Bearer <token>` header injection, error normalisation, base URL from `NEXT_PUBLIC_API_URL`
- [ ] Set up `lib/auth.ts` — `getToken()`, `setToken()`, `removeToken()` using `localStorage`
- [ ] Create `hooks/useAuth.ts` — React context + hook providing `user`, `login()`, `logout()`, `isAuthenticated`, `role`
- [ ] Create `app/(auth)/layout.tsx` — minimal centered layout for auth pages
- [ ] Create `app/(backoffice)/layout.tsx` — sidebar + topbar layout, guards access to `ADMIN` / `INSTRUCTOR` roles only
- [ ] Create `app/(website)/layout.tsx` — global learner navbar + footer layout
- [ ] Add `NEXT_PUBLIC_API_URL` to `.env.local`
- [ ] Configure Tailwind theme with brand colours
- [ ] Install and configure shadcn/ui components needed: Button, Input, Dialog, Tabs, Badge, Tooltip, Dropdown, Table, Progress, Avatar, Textarea, Switch, Select

---

## Shared Types (used across client and server)

```ts
// Roles
type Role = 'ADMIN' | 'INSTRUCTOR' | 'LEARNER'

// Lesson types
type LessonType = 'VIDEO' | 'DOCUMENT' | 'IMAGE' | 'QUIZ'

// Visibility & Access
type Visibility = 'EVERYONE' | 'SIGNED_IN'
type AccessRule = 'OPEN' | 'ON_INVITATION' | 'ON_PAYMENT'

// Enrollment status
type EnrollmentStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'

// Attachment types
type AttachmentType = 'FILE' | 'LINK'
```
