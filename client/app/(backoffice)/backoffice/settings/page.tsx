"use client"

import { useCallback, useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { useAuth } from "@/hooks/useAuth"
import { api } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Key,
  SunDim,
  Moon,
  Desktop,
  CheckCircle,
  Warning,
  GearSix,
  Info,
  ShieldCheck,
  Eye,
  EyeSlash,
  MagnifyingGlass,
  CaretUpDown,
  Spinner,
  SpinnerIcon,
} from "@phosphor-icons/react"

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-start gap-3 border-b bg-muted/20 px-6 py-5">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="size-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="px-6 py-6">{children}</div>
    </div>
  )
}

// ─── Toast-like inline feedback ───────────────────────────────────────────────

function Feedback({
  type,
  message,
}: {
  type: "success" | "error"
  message: string
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm",
        type === "success"
          ? "border-primary/20 bg-primary/8 text-primary"
          : "border-destructive/20 bg-destructive/8 text-destructive"
      )}
    >
      {type === "success" ? (
        <CheckCircle className="size-4 shrink-0" weight="fill" />
      ) : (
        <Warning className="size-4 shrink-0" />
      )}
      {message}
    </div>
  )
}

// ─── Password field with show/hide ────────────────────────────────────────────

function PasswordInput({
  value,
  onChange,
  placeholder,
  id,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  id?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        title={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeSlash className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

// ─── Change Password section ─────────────────────────────────────────────────

function ChangePasswordSection() {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)

    if (next.length < 8) {
      setFeedback({
        type: "error",
        message: "New password must be at least 8 characters.",
      })
      return
    }
    if (next !== confirm) {
      setFeedback({ type: "error", message: "New passwords do not match." })
      return
    }

    setLoading(true)
    try {
      await api.post("/users/me/change-password", {
        currentPassword: current,
        newPassword: next,
      })
      setFeedback({
        type: "success",
        message: "Password updated successfully.",
      })
      setCurrent("")
      setNext("")
      setConfirm("")
    } catch (err: any) {
      setFeedback({
        type: "error",
        message:
          err?.data?.message ?? err?.message ?? "Failed to update password.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cur-pw" className="text-sm font-medium">
          Current password
        </label>
        <PasswordInput
          id="cur-pw"
          value={current}
          onChange={setCurrent}
          placeholder="••••••••"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="new-pw" className="text-sm font-medium">
          New password
        </label>
        <PasswordInput
          id="new-pw"
          value={next}
          onChange={setNext}
          placeholder="Min. 8 characters"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="conf-pw" className="text-sm font-medium">
          Confirm new password
        </label>
        <PasswordInput
          id="conf-pw"
          value={confirm}
          onChange={setConfirm}
          placeholder="••••••••"
        />
      </div>

      {feedback && <Feedback type={feedback.type} message={feedback.message} />}

      <div className="flex items-center gap-3 pt-1">
        <Button
          type="submit"
          disabled={loading || !current || !next || !confirm}
        >
          {loading ? "Saving…" : "Update password"}
        </Button>
        <button
          type="button"
          onClick={() => {
            setCurrent("")
            setNext("")
            setConfirm("")
            setFeedback(null)
          }}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ─── Reset via email section ──────────────────────────────────────────────────

function ResetViaEmailSection() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)
    setLoading(true)
    try {
      await api.post("/auth/forgot-password", { email })
      setFeedback({
        type: "success",
        message: `Reset code sent to ${email}. Check your inbox.`,
      })
      setEmail("")
    } catch {
      setFeedback({
        type: "error",
        message: "Failed to send reset email. Check the address and try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSend} className="flex max-w-sm flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Send a 6-digit OTP to any registered email address to reset that
        account&apos;s password.
      </p>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="reset-email" className="text-sm font-medium">
          Email address
        </label>
        <Input
          id="reset-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          required
        />
      </div>
      {feedback && <Feedback type={feedback.type} message={feedback.message} />}
      <Button type="submit" variant="outline" disabled={loading || !email}>
        {loading ? "Sending…" : "Send reset code"}
      </Button>
    </form>
  )
}

// ─── Appearance section ───────────────────────────────────────────────────────

const THEMES = [
  { key: "light", label: "Light", icon: SunDim },
  { key: "dark", label: "Dark", icon: Moon },
  { key: "system", label: "System", icon: Desktop },
] as const

function AppearanceSection() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-1 text-sm font-medium">Theme</p>
        <p className="text-xs text-muted-foreground">
          Choose how the interface looks. Press{" "}
          <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">
            D
          </kbd>{" "}
          anywhere to quickly toggle dark/light.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        {THEMES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTheme(key)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border-2 px-6 py-4 text-sm font-medium transition-all",
              theme === key
                ? "border-primary bg-primary/8 text-primary"
                : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            <Icon className="size-5" />
            {label}
            {theme === key && (
              <CheckCircle className="size-3.5" weight="fill" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── About section ────────────────────────────────────────────────────────────

function AboutSection() {
  const rows = [
    { label: "Platform", value: "Learnova" },
    { label: "Built by", value: "Team Qubits" },
    { label: "Occasion", value: "Hackathon 2026" },
    { label: "Stack", value: "Next.js · Express · PostgreSQL · Prisma" },
  ]

  return (
    <div className="flex flex-col gap-2">
      {rows.map(({ label, value }) => (
        <div
          key={label}
          className="flex items-center justify-between border-b border-border/50 py-2 last:border-b-0"
        >
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="text-sm font-medium">{value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Course Ownership section (admin only) ────────────────────────────────────

interface CourseRow {
  id: number
  title: string
  instructor: { id: number; name: string | null; email: string }
}
interface UserOption {
  id: number
  name: string | null
  email: string
  role: string
}

function CourseOwnershipSection() {
  const [courses, setCourses] = useState<CourseRow[]>([])
  const [instructors, setInstructors] = useState<UserOption[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<number | null>(null)
  const [pending, setPending] = useState<Record<number, number>>({}) // courseId → selected instructorId
  const [feedback, setFeedback] = useState<
    Record<number, { type: "success" | "error"; msg: string }>
  >({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cData, uData] = await Promise.all([
        api.get("/courses/admin/with-instructor"),
        api.get("/users?role=ADMIN,INSTRUCTOR"),
      ])
      setCourses(cData.courses ?? [])
      setInstructors(uData.users ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = courses.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.instructor.name ?? "").toLowerCase().includes(search.toLowerCase())
  )

  async function save(courseId: number) {
    const instructorId = pending[courseId]
    if (!instructorId) return
    setSaving(courseId)
    setFeedback((f) => ({
      ...f,
      [courseId]: undefined as unknown as {
        type: "success" | "error"
        msg: string
      },
    }))
    try {
      await api.patch(`/courses/${courseId}/instructor`, { instructorId })
      setCourses((cs) =>
        cs.map((c) => {
          if (c.id !== courseId) return c
          const instr = instructors.find((i) => i.id === instructorId)
          return {
            ...c,
            instructor: {
              id: instructorId,
              name: instr?.name ?? null,
              email: instr?.email ?? "",
            },
          }
        })
      )
      setPending((p) => {
        const n = { ...p }
        delete n[courseId]
        return n
      })
      setFeedback((f) => ({
        ...f,
        [courseId]: { type: "success", msg: "Reassigned." },
      }))
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } }
      setFeedback((f) => ({
        ...f,
        [courseId]: { type: "error", msg: e?.data?.message ?? "Failed." },
      }))
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Spinner className="size-4 animate-spin" />
        Loading courses…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="relative">
        <MagnifyingGlass className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search courses or instructor…"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No courses found.
        </p>
      )}

      <div className="flex flex-col divide-y divide-border/60 overflow-hidden rounded-lg border">
        {filtered.map((course) => {
          const selected = pending[course.id] ?? course.instructor.id
          const isDirty =
            pending[course.id] !== undefined &&
            pending[course.id] !== course.instructor.id
          const fb = feedback[course.id]
          return (
            <div
              key={course.id}
              className="flex flex-col gap-2 bg-card px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{course.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Currently:{" "}
                    {course.instructor.name ?? course.instructor.email}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="relative">
                    <select
                      value={selected}
                      onChange={(e) =>
                        setPending((p) => ({
                          ...p,
                          [course.id]: Number(e.target.value),
                        }))
                      }
                      className="cursor-pointer appearance-none rounded-md border border-input bg-background py-1.5 pr-8 pl-3 text-sm focus:ring-1 focus:ring-ring focus:outline-none"
                      title="Select instructor"
                    >
                      {instructors.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name ?? u.email} ({u.role.toLowerCase()})
                        </option>
                      ))}
                    </select>
                    <CaretUpDown className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={isDirty ? "default" : "outline"}
                    disabled={!isDirty || saving === course.id}
                    onClick={() => save(course.id)}
                    className="gap-1.5"
                  >
                    {saving === course.id ? (
                      <Spinner className="size-3.5 animate-spin" />
                    ) : (
                      <Spinner className="size-3.5" />
                    )}
                    Reassign
                  </Button>
                </div>
              </div>
              {fb && (
                <p
                  className={cn(
                    "text-xs",
                    fb.type === "success"
                      ? "text-emerald-600"
                      : "text-destructive"
                  )}
                >
                  {fb.msg}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ALL_TABS = [
  { key: "account", label: "Account", icon: Key, adminOnly: false },
  {
    key: "ownership",
    label: "Ownership",
    icon: SpinnerIcon,
    adminOnly: true,
  },
  { key: "appearance", label: "Appearance", icon: SunDim, adminOnly: false },
  { key: "about", label: "About", icon: Info, adminOnly: false },
] as const

type Tab = (typeof ALL_TABS)[number]["key"]

export default function SettingsPage() {
  const { role } = useAuth()
  const isAdmin = role === "ADMIN"
  const [tab, setTab] = useState<Tab>("account")

  const visibleTabs = ALL_TABS.filter((t) => !t.adminOnly || isAdmin)

  return (
    <div className="space-y-6 px-6 py-8">
      <div>
        <h1 className="text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, appearance, and platform info.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 overflow-x-auto border-b">
        {visibleTabs.map(({ key, label, icon: Icon }) => (
          <button
            type="button"
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm transition-colors",
              tab === key
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Account tab ──────────────────────────────────────── */}
      {tab === "account" && (
        <div className="grid gap-5">
          <Section
            icon={Key}
            title="Change password"
            description="Update your current password. You'll need to enter your existing password to confirm."
          >
            <ChangePasswordSection />
          </Section>

          <Section
            icon={ShieldCheck}
            title="Reset password via email"
            description="Send a one-time reset code to a registered account's email address."
          >
            <ResetViaEmailSection />
          </Section>
        </div>
      )}

      {/* ── Ownership tab (admin only) ─────────────────────── */}
      {tab === "ownership" && isAdmin && (
        <Section
          icon={SpinnerIcon}
          title="Course Ownership"
          description="Reassign courses to a different instructor or admin. Changes take effect immediately."
        >
          <CourseOwnershipSection />
        </Section>
      )}

      {/* ── Appearance tab ────────────────────────────────────── */}
      {tab === "appearance" && (
        <Section
          icon={SunDim}
          title="Appearance"
          description="Personalise how Learnova looks for you."
        >
          <AppearanceSection />
        </Section>
      )}

      {/* ── About tab ─────────────────────────────────────────── */}
      {tab === "about" && (
        <Section icon={Info} title="About Learnova">
          <AboutSection />
        </Section>
      )}
    </div>
  )
}
