# Task: B1 — Website Navbar & Courses Menu

**Location:** Global layout for all learner-facing pages
**Access:** All (guests and authenticated users)

## Overview
The global navigation bar present on all learner-facing pages. Shows the Courses menu item, login/signup links for guests, and user profile dropdown for authenticated users. Enforces visibility rules on the course listing.

---

## Backend

(No dedicated endpoints — navbar uses the same `GET /api/courses/public` from B2, filtered by visibility)

---

## Frontend

### Layout: `app/(website)/layout.tsx`

Wraps all learner-facing pages. Renders:
- `<Navbar />`
- `{children}` (page content)
- `<Footer />` (optional simple footer)

---

### Component: `components/website/Navbar.tsx`

#### Structure
```
[Logo]   [Courses]   [My Courses]              [Login] [Sign Up]   ← guest
[Logo]   [Courses]   [My Courses]              [Avatar ▼]          ← authenticated
```

---

### Navbar Items

#### Logo
- Text "Learnova" or SVG logo
- Links to `/` or `/courses`

#### "Courses" Nav Link
- Links to `/courses`
- Shows all published courses subject to visibility rules

#### "My Courses" Nav Link
- Shown only for authenticated learners
- Links to `/courses` (same page, but with enrolled courses filtered/highlighted)

#### Guest state (not logged in)
- **Login** button → `/login`
- **Sign Up** button → `/signup`

#### Authenticated state
- User **Avatar** (initials or profile picture)
- Dropdown menu (shadcn `DropdownMenu`):
  - User name + email (non-clickable header)
  - "My Courses" → `/courses`
  - Separator
  - "Logout" → clears token, redirects to `/`
  - If role is ADMIN or INSTRUCTOR: "Backoffice" → `/backoffice/courses`

---

### Visibility Enforcement
- The navbar "Courses" count/listing is driven by the same visibility rules as B2:
  - Guest users: only see `visibility = 'EVERYONE'` courses
  - Logged-in users: see all published courses (`EVERYONE` + `SIGNED_IN`)
- No special navbar-specific API call needed — this is enforced on the courses listing page

---

### Mobile Responsiveness
- On mobile (< md breakpoint): hamburger icon opens a full-width drawer/sheet
- Drawer contains: all nav links + auth buttons

---

### Active Link Styling
- Current route highlighted in navbar (e.g., bold or accent color underline)
- Use Next.js `usePathname()` to determine active route

---

### `hooks/useAuth.ts` Integration
- Navbar reads `isAuthenticated`, `user` from `useAuth` context
- Renders guest or authenticated state accordingly
- Shows user `name` initials in Avatar if no profile picture

---

### Avatar Component: `components/shared/UserAvatar.tsx`
```ts
interface UserAvatarProps {
  name: string
  size?: 'sm' | 'md'
}
// Renders a circle with initials (first letter of each word, max 2)
// e.g. "John Learner" → "JL"
```
