# Task: A5 — Course Options & Access Rules

**Location:** `/backoffice/courses/:courseId/edit` → Options Tab
**Access:** ADMIN, INSTRUCTOR (own course)

## Overview
Controls who can see (Visibility) and who can access (Access Rule) the course. These are independent settings. Options tab also lets you set a price and course admin.

---

## Backend

### API Endpoints

(Handled by the existing `PATCH /api/courses/:id` endpoint from A2)

**Body fields relevant to this section:**
```ts
{
  visibility?: 'EVERYONE' | 'SIGNED_IN'
  accessRule?: 'OPEN' | 'ON_INVITATION' | 'ON_PAYMENT'
  price?: number | null       // required when accessRule = ON_PAYMENT
  courseAdminId?: number | null
}
```

**Validation logic:**
- If `accessRule === 'ON_PAYMENT'` and `price` is null or undefined → 422 `{ message: "Price is required for paid courses" }`
- If `accessRule !== 'ON_PAYMENT'` → set `price = null` automatically
- `price` must be positive decimal if provided

---

### Business Rules Enforced at Backend

| Condition | Enforced rule |
|-----------|--------------|
| Course is published | Visibility and access rule changes still allowed |
| `ON_PAYMENT` selected | `price` field becomes mandatory |
| Switching away from `ON_PAYMENT` | Clear `price` to null |
| `visibility = SIGNED_IN` | Guests cannot see the course in listing (enforced in courses listing query) |

---

## Frontend

### Component: `components/backoffice/course-form/CourseOptions.tsx`

Rendered inside the Options Tab of the Course Form.

#### Props
```ts
interface CourseOptionsProps {
  courseId: number
  visibility: Visibility
  accessRule: AccessRule
  price: number | null
  courseAdminId: number | null
  onSave: (fields: Partial<Course>) => void
}
```

#### Auto-save behavior
- Any change triggers debounced `PATCH /api/courses/:id` (800ms)
- Show save indicator ("Saving…" / "Saved") in the tab header

---

### UI Sections

#### 1. Visibility Setting
Label: "Who can see this course?"

Radio group (shadcn `RadioGroup`):
- **Everyone** — "Course visible to all visitors, including guests"
- **Signed In** — "Course visible only to logged-in users"

---

#### 2. Access Rule Setting
Label: "Who can start learning?"

Radio group:
- **Open** — "Anyone who can see the course can start immediately"
- **On Invitation** — "Only users you've invited as attendees can access lessons"
- **On Payment** — "Users must purchase before accessing lessons" → reveals **Price** field

**Price field** (shown only when `accessRule === 'ON_PAYMENT'`):
- Number input with currency symbol prefix (e.g., `$`)
- Required validation before save
- Positive decimals only

---

#### 3. Course Admin
Label: "Course Administrator"
- User search/select (typeahead) fetching `GET /api/users?role=INSTRUCTOR,ADMIN&search={query}`
- Shows selected user's name + avatar
- Clear button to remove

---

### Visibility × Access Rule Matrix (display as info callout)

Show an informational banner that explains the combined effect:

```
Visibility: Everyone  +  Access: On Invitation
→ Any visitor can see this course, but only invited learners can start it.
```

Update dynamically as user changes the radio selections.

---

### Interaction Notes
- Switching from `ON_PAYMENT` to `OPEN` or `ON_INVITATION` should clear the price field and show a confirmation: "This will remove the price. Are you sure?"
- Price change should not trigger auto-save mid-typing; only save on blur or after debounce resolves
