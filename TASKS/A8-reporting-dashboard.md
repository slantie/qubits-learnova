# Task: A8 — Reporting Dashboard

**Route:** `/backoffice/reporting`
**Access:** ADMIN (all courses), INSTRUCTOR (own courses only)

## Overview
Course-wise learner progress analytics. Overview stat cards that filter the table below, a detailed learner progress table, and customisable column visibility.

---

## Backend

### API Endpoints

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/reporting/summary` | ADMIN, INSTRUCTOR | Aggregate stats (card counts) |
| GET | `/api/reporting/learners` | ADMIN, INSTRUCTOR | Paginated learner progress table |

---

### `GET /api/reporting/summary`

**Logic:**
- INSTRUCTOR: filter by `course.instructorId = req.user.id`
- ADMIN: all courses

**Response:**
```ts
{
  totalParticipants: number   // total unique enrolled learners
  yetToStart: number          // status = NOT_STARTED
  inProgress: number          // status = IN_PROGRESS
  completed: number           // status = COMPLETED
}
```

**Prisma query:**
```ts
const enrollments = await prisma.enrollment.groupBy({
  by: ['status'],
  _count: { _all: true },
  where: {
    course: instructorFilter  // { instructorId: req.user.id } or {}
  }
})
```

---

### `GET /api/reporting/learners`

**Query params:**
```ts
{
  status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'  // filter from card click
  search?: string      // search by participant name or course name
  page?: number        // default 1
  pageSize?: number    // default 20
  sortBy?: 'enrolledAt' | 'startedAt' | 'completedAt' | 'completionPercent' | 'timeSpent'
  sortOrder?: 'asc' | 'desc'
}
```

**Logic:**
- INSTRUCTOR: `where { course: { instructorId: req.user.id } }`
- ADMIN: no filter
- Compute `completionPercent` per enrollment:
  ```
  completed lessons / total lessons in course × 100
  ```
- Compute `timeSpent` from `enrollment.timeSpent` (seconds → formatted)

**Response:**
```ts
{
  data: {
    srNo: number
    courseName: string
    participantName: string
    enrolledAt: string
    startedAt: string | null
    timeSpent: number        // seconds
    completionPercent: number
    completedAt: string | null
    status: EnrollmentStatus
  }[]
  total: number
  page: number
  pageSize: number
}
```

---

## Frontend

### Page: `app/(backoffice)/backoffice/reporting/page.tsx`

#### State
```ts
const [summary, setSummary] = useState<Summary | null>(null)
const [statusFilter, setStatusFilter] = useState<EnrollmentStatus | null>(null)
const [search, setSearch] = useState('')
const [visibleColumns, setVisibleColumns] = useState<Set<string>>(ALL_COLUMNS)
const [isColumnPanelOpen, setIsColumnPanelOpen] = useState(false)
const [sortBy, setSortBy] = useState('enrolledAt')
const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
const [page, setPage] = useState(1)
```

---

### Components

#### `components/backoffice/reporting/SummaryCards.tsx`

Four stat cards in a row:

| Card | Icon | Value | Filter applied |
|------|------|-------|----------------|
| Total Participants | Users | `totalParticipants` | Clear filter |
| Yet to Start | Clock | `yetToStart` | `NOT_STARTED` |
| In Progress | TrendingUp | `inProgress` | `IN_PROGRESS` |
| Completed | CheckCircle | `completed` | `COMPLETED` |

- Clicking a card sets `statusFilter` and re-fetches table
- Active card highlighted with accent border
- Cards fetch from `GET /api/reporting/summary`

---

#### `components/backoffice/reporting/LearnerTable.tsx`

shadcn `Table` with:

**All available columns:**
| Key | Label | Sortable |
|-----|-------|---------|
| `srNo` | Sr. No. | No |
| `courseName` | Course Name | No |
| `participantName` | Participant Name | No |
| `enrolledAt` | Enrolled Date | Yes |
| `startedAt` | Start Date | Yes |
| `timeSpent` | Time Spent | Yes |
| `completionPercent` | Completion % | Yes |
| `completedAt` | Completed Date | Yes |
| `status` | Status | No |

**Status badge colors:**
- `NOT_STARTED` → gray "Yet to Start"
- `IN_PROGRESS` → blue "In Progress"
- `COMPLETED` → green "Completed"

**Time Spent** formatted as "2h 15m" or "45m"

**Completion %** shown as a mini progress bar + percentage text.

**Sorting:** Click column header toggles asc/desc, calls API with `sortBy` + `sortOrder`.

---

#### `components/backoffice/reporting/ColumnCustomiser.tsx`

A slide-out panel (shadcn `Sheet` from right):
- Triggered by "Customise Columns" button in table header
- Lists all column names with shadcn `Checkbox` toggles
- Changes update `visibleColumns` state immediately (client-side column hide/show)
- "Reset to defaults" link restores `ALL_COLUMNS`

---

#### Search
- Input above table: "Search by name or course..."
- Debounced 300ms → updates `search` state → re-fetches `GET /api/reporting/learners`

---

#### Pagination
- Simple previous/next pagination below table
- Shows "Showing X–Y of Z results"

---

### Utility: `lib/formatTimeSpent.ts`
```ts
export function formatTimeSpent(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
```
