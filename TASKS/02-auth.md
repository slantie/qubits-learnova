# Task: Authentication & Authorization

## Overview
JWT-based auth with role-based access control (RBAC). Covers signup, login, token refresh, and middleware guards for ADMIN, INSTRUCTOR, LEARNER roles.

---

## Backend

### API Endpoints

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/api/auth/signup` | Public | Register a new user (role defaults to LEARNER) |
| POST | `/api/auth/login` | Public | Login, returns JWT + user info |
| GET | `/api/auth/me` | Authenticated | Return current user profile |
| POST | `/api/auth/logout` | Authenticated | Client-side token removal (stateless) |

---

### Files to Create

#### `src/modules/auth/auth.routes.ts`
Mount at `/api/auth`. Wire to controller functions.

#### `src/modules/auth/auth.controller.ts`

**`signup`**
- Validate body: `name`, `email`, `password` (min 8 chars) via zod
- Check `User` table for duplicate email → 409 if exists
- Hash password with `bcryptjs` (saltRounds = 10)
- Create `User` with `role = LEARNER`
- Return `{ user: { id, name, email, role }, token }`

**`login`**
- Validate body: `email`, `password`
- Find user by email → 401 if not found
- Compare password hash → 401 if mismatch
- Sign JWT: `{ id, email, role }` payload, `JWT_SECRET`, `JWT_EXPIRES_IN`
- Return `{ user: { id, name, email, role, totalPoints, currentBadge }, token }`

**`me`**
- Read `req.user.id` (set by auth middleware)
- Return full user profile from DB (exclude `passwordHash`)

---

#### `src/middleware/authenticate.ts`
```ts
// Verifies Bearer token from Authorization header
// Attaches decoded payload to req.user
// Returns 401 if missing or invalid
```

#### `src/middleware/authorize.ts`
```ts
// Factory: authorize('ADMIN', 'INSTRUCTOR')
// Returns 403 if req.user.role is not in the allowed list
```

---

### Zod Schemas (`src/modules/auth/auth.schema.ts`)
```ts
const signupSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  password: z.string().min(8),
})

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})
```

---

### Route Protection Pattern (used across all modules)
```ts
// Public route
router.get('/courses', listPublishedCourses)

// Authenticated only
router.get('/me', authenticate, getMe)

// Instructor or Admin only
router.post('/courses', authenticate, authorize('ADMIN', 'INSTRUCTOR'), createCourse)

// Admin only
router.get('/users', authenticate, authorize('ADMIN'), listUsers)
```

---

## Frontend

### Pages

| Route | File | Description |
|-------|------|-------------|
| `/login` | `app/(auth)/login/page.tsx` | Login form |
| `/signup` | `app/(auth)/signup/page.tsx` | Signup form |

---

### Components

#### `app/(auth)/login/page.tsx`
- Email + password fields
- Calls `POST /api/auth/login`
- On success: stores token via `lib/auth.ts`, updates auth context, redirects:
  - `ADMIN` / `INSTRUCTOR` → `/backoffice/courses`
  - `LEARNER` → `/courses`
- Shows inline error on 401

#### `app/(auth)/signup/page.tsx`
- Name + email + password fields
- Client-side validation (min length, email format)
- On success: auto-login and redirect to `/courses`

---

### `hooks/useAuth.ts`
```ts
interface AuthContext {
  user: { id: number; name: string; email: string; role: Role; totalPoints: number; currentBadge: string | null } | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  isLoading: boolean
}
```
- On mount: calls `GET /api/auth/me` if token exists to hydrate user
- `logout()` clears token and redirects to `/login`

---

### Route Guards

#### `components/shared/ProtectedRoute.tsx`
- Wraps backoffice layout
- If not authenticated → redirect to `/login`
- If role is not `ADMIN` or `INSTRUCTOR` → redirect to `/courses`

#### Middleware (`client/middleware.ts`) — Next.js middleware
- Protect `/backoffice/*` routes: redirect to `/login` if no token cookie
- Redirect logged-in users away from `/login` and `/signup`

---

### `lib/api.ts` — Auth Integration
```ts
// Attach Authorization header from localStorage token
// On 401 response: call logout() and redirect to /login
```
