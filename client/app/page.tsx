/**
 * Learnova — Landing Page (by Qubits)
 * Design system: Academic Minimal
 *
 * Page structure:
 *   1. Nav — sticky, minimal, one primary CTA
 *   2. Hero — typography-first, clear value proposition, two CTAs max
 *   3. Features — 4-card grid, each card one job, no decoration
 *   4. Progress demo — learning progress visualization (first-class UI)
 *   5. Stats — clean numbers, no clutter
 *   6. Tech stack — concise, no showboating
 *   7. CTA banner — clean call to action before footer
 *   8. Footer — minimal, accessible
 *
 * Learner-first walk-through: does each section feel calm, focused, clear?
 * Yes — white space is generous, hierarchy is weight-based, color is purposeful.
 */
"use client"

import { useTheme } from "next-themes"
import React, { useEffect, useState } from "react"
import {
  Brain,
  Code2,
  Shield,
  Zap,
  ArrowRight,
  Github,
  Moon,
  Sun,
  CheckCircle2,
  Clock3,
  TrendingUp,
  Flame,
  ChevronRight,
} from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import Link from "next/link"
import Image from "next/image"

type ButtonVariant = React.ComponentProps<typeof Button>['variant'];
type ButtonSize = React.ComponentProps<typeof Button>['size'];

const ButtonAnchor = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<"a"> & { variant?: ButtonVariant; size?: ButtonSize }
>(({ className, variant, size, ...props }, ref) => (
  <a
    className={cn(buttonVariants({ variant, size, className }))}
    ref={ref}
    {...props}
  />
))
ButtonAnchor.displayName = "ButtonAnchor"

function ProgressBar({ value, className }: { value: number; className?: string; size?: string; label?: string }) {
  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-muted",
        className
      )}
    >
      <div
        className="am-progress-bar-fill w-[calc(var(--pct)*1%)]"
        style={{ '--pct': value } as Record<string, number>}
      />
    </div>
  )
}

function CircleProgress({ value, size, strokeWidth }: { value: number; size: number; strokeWidth: number }) {
  const radius = size / 2 - strokeWidth
  const dasharray = 2 * Math.PI * radius
  const dashoffset = dasharray - (dasharray * value) / 100
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        className="text-muted"
        strokeWidth={strokeWidth}
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        className="text-primary transition-all"
        strokeWidth={strokeWidth}
        strokeDasharray={dasharray}
        strokeDashoffset={dashoffset}
        strokeLinecap="round"
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
    </svg>
  )
}

/* ─── Theme Toggle ────────────────────────────────────────────────────────── */

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true) // eslint-disable-line react-hooks/set-state-in-effect
  }, [])

  if (!mounted) {
    // Render placeholder to prevent layout shift
    return <div className="size-10 rounded-md" aria-hidden />
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </Button>
  )
}

/* ─── Navigation ──────────────────────────────────────────────────────────── */

/**
 * Nav — sticky, content-width max, one primary CTA on right.
 * Ghost icon buttons for secondary actions (GitHub, theme toggle).
 * Bottom border is 1px slate — never decorative, always structural.
 */
function Nav() {
  const { isAuthenticated, role } = useAuth()

  return (
    <nav
      className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex h-16 items-center justify-between px-4">
        {/* Wordmark — weight 700, tight tracking */}
        <div className="flex items-center gap-2">
          <Image
            src="/learnova.svg"
            alt="Learnova"
            width={36}
            height={36}
            className="rounded-md"
            aria-hidden
          />
          <Link
            href="/"
            className="text-lg font-medium tracking-tight text-foreground select-none"
          >
            Learnova
          </Link>
        </div>

        {/* Nav links — desktop only, weight 500 */}
        <div className="hidden items-center gap-8 md:flex" role="list">
          {[
            { label: "Features", href: "#features" },
            { label: "How it works", href: "#progress-demo" },
            { label: "Stack", href: "#stack" },
            { label: "Team", href: "/team" },
          ].map(({ label, href }) => (
            <a
              key={href}
              href={href}
              role="listitem"
              className={cn(
                "text-sm font-medium text-muted-foreground",
                "transition-colors duration-150 hover:text-foreground"
              )}
            >
              {label}
            </a>
          ))}
        </div>

        {/* Right controls — secondary actions use ghost/icon buttons */}
        <div className="flex items-center gap-1">
          <ButtonAnchor
            variant="ghost"
            size="icon"
            href="https://github.com/slantie/qubits-learnova"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View source on GitHub"
          >
            <Github className="size-4" />
          </ButtonAnchor>

          <ThemeToggle />

          {/* Primary CTA — one per nav, solid indigo */}
          {!isAuthenticated ? (
            <ButtonAnchor
              href="/login"
              className="ml-2 hidden sm:inline-flex"
              aria-label="Log in to Learnova"
            >
              Log in
            </ButtonAnchor>
          ) : (
            <ButtonAnchor
              href={
                role === "ADMIN" || role === "INSTRUCTOR"
                  ? "/backoffice/courses"
                  : "/courses"
              }
              className="ml-2 hidden sm:inline-flex"
              aria-label="Go to Dashboard"
            >
              Dashboard
              <ArrowRight className="ml-2 size-4" />
            </ButtonAnchor>
          )}
        </div>
      </div>
    </nav>
  )
}

/* ─── Hero ────────────────────────────────────────────────────────────────── */

/**
 * Hero — typography-first.
 * Heading: weight 700, 48px, -0.02em tracking, line-height 1.1.
 * Body: weight 400, 18px, 1.6 line-height — reading comfort.
 * Two CTAs max: primary (solid) + secondary (outline).
 * Right column: live learning progress card — demonstrates the core value prop.
 */
function Hero() {
  return (
    <section
      className="mx-auto max-w-[80vw] px-6 pt-20 pb-24 md:pt-28 md:pb-32"
      aria-labelledby="hero-heading"
    >
      <div className="grid items-center gap-16 lg:grid-cols-2">
        {/* Left: copy — all spacing on 4px grid */}
        <div className="space-y-8">
          {/* Eyebrow — 12px, uppercase, slate, letter-spacing 0.05em */}
          <div className="flex items-center gap-2">
            <Flame className="size-4 text-amber-500" aria-hidden />
            <span className="am-label text-amber-600 dark:text-amber-500">
              Hackathon 2026 — Odoo x GVP
            </span>
          </div>

          {/* Heading — weight 700, tight tracking, 48px */}
          <div className="space-y-3">
            <h1
              id="hero-heading"
              className="text-[48px] leading-[1.1] font-medium tracking-[-0.02em] text-foreground"
            >
              Learn smarter.
              <br />
              <span className="text-primary">Build faster.</span>
            </h1>
            {/* Sub-headline — 20px, weight 500, adds context without clutter */}
            <p className="text-xl font-medium text-muted-foreground">
              AI-powered learning for developers.
            </p>
          </div>

          {/* Body copy — 18px, weight 400, max 520px for reading comfort */}
          <p className="max-w-130 text-[18px] leading-[1.7] text-muted-foreground">
            Learnova understands your curriculum, tracks your learning progress,
            and surfaces insights from your data — all in a focused,
            distraction-free environment built for deep work.
          </p>

          {/* CTA row — primary + secondary, gap-3 */}
          <div id="get-started" className="flex flex-col gap-3 sm:flex-row">
            <ButtonAnchor size="lg" className="sm:w-auto" href="/signup">
              <Zap className="size-4" />
              Start Learning Free
            </ButtonAnchor>
            <ButtonAnchor
              variant="outline"
              size="lg"
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="sm:w-auto"
            >
              <Github className="size-4" />
              View on GitHub
            </ButtonAnchor>
          </div>
        </div>

        {/* Right: learning progress demo card */}
        <div className="relative flex justify-center lg:justify-end">
          <LearningCard />
        </div>
      </div>
    </section>
  )
}

/**
 * LearningCard — demonstrates the progress-driven UI.
 * Shows module list with completion states, a streak, and overall progress ring.
 * This is the value prop visualized — not decorative chrome.
 */
function LearningCard() {
  const modules = [
    {
      title: "Python Fundamentals",
      progress: 100,
      status: "complete" as const,
      lessons: 12,
    },
    {
      title: "Data Structures",
      progress: 72,
      status: "in-progress" as const,
      lessons: 9,
    },
    {
      title: "Algorithms & Complexity",
      progress: 0,
      status: "not-started" as const,
      lessons: 14,
    },
    {
      title: "Odoo Framework Basics",
      progress: 0,
      status: "not-started" as const,
      lessons: 10,
    },
  ]

  const overallProgress = Math.round(
    modules.reduce((acc, m) => acc + m.progress, 0) / modules.length
  )

  return (
    <div
      className="am-card w-full max-w-sm space-y-6 p-6"
      aria-label="Learning progress preview"
    >
      {/* Card header: course title + overall ring */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Current Course
          </p>
          <h3 className="text-[16px] leading-snug font-medium text-foreground">
            Backend Engineering Path
          </h3>
          {/* Streak — amber, warm accent */}
          <div className="am-streak mt-2">
            <Flame className="size-3.5" aria-hidden />
            <span>7-day streak</span>
          </div>
        </div>

        {/* Overall completion ring — right-aligned */}
        <div
          className="flex shrink-0 flex-col items-center gap-1"
          aria-label={`${overallProgress}% overall complete`}
        >
          <div className="relative">
            <CircleProgress value={overallProgress} size={52} strokeWidth={5} />
            {/* Percentage label centered in ring */}
            <span
              className="absolute inset-0 flex items-center justify-center text-xs font-normal text-foreground"
              aria-hidden
            >
              {overallProgress}%
            </span>
          </div>
          <p className="text-[11px] font-medium text-muted-foreground">
            Overall
          </p>
        </div>
      </div>

      {/* Divider */}
      <hr className="am-divider" />

      {/* Module list — completion states are visually distinct */}
      <ul className="space-y-4" aria-label="Course modules">
        {modules.map((mod) => (
          <ModuleRow key={mod.title} {...mod} />
        ))}
      </ul>

      {/* Resume CTA — contextual, adjacent to content */}
      <Button className="w-full" size="default">
        Continue: Data Structures
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}

interface ModuleRowProps {
  title: string
  progress: number
  status: "complete" | "in-progress" | "not-started"
  lessons: number
}

function ModuleRow({ title, progress, status, lessons }: ModuleRowProps) {
  const statusConfig = {
    complete: {
      badge: <Badge variant="success">Complete</Badge>,
      icon: <CheckCircle2 className="size-4 text-primary shrink-0" aria-hidden />,
    },
    "in-progress": {
      badge: <Badge variant="warning">In progress</Badge>,
      icon: (
        <Clock3
          className="size-4 shrink-0 text-amber-600 dark:text-amber-500"
          aria-hidden
        />
      ),
    },
    "not-started": {
      badge: null,
      icon: (
        <div
          className="size-4 shrink-0 rounded-full border-2 border-border"
          aria-hidden
        />
      ),
    },
  }

  const { badge, icon } = statusConfig[status]
  const isCompleted = status === "complete"

  return (
    <li className={cn("space-y-2", isCompleted && "am-completed")}>
      <div className="flex items-center gap-3">
        {icon}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p
              className={cn(
                "truncate text-sm font-medium",
                isCompleted ? "text-muted-foreground" : "text-foreground"
              )}
            >
              {title}
            </p>
            {badge}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {lessons} lessons
          </p>
        </div>
      </div>

      {/* Progress bar only shown when there is progress to display */}
      {progress > 0 && (
        <ProgressBar
          value={progress}
          size="sm"
          label={`${title}: ${progress}% complete`}
          className="ml-7"
        />
      )}
    </li>
  )
}

/* ─── Features ────────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: Brain,
    title: "Context-aware AI",
    body: "Learnova understands your curriculum, your team's patterns, and your business logic — not just generic LLM outputs. It learns as you do.",
    stat: "3x faster",
    statLabel: "concept retention",
  },
  {
    icon: TrendingUp,
    title: "Progress-driven learning",
    body: "Every course, module, and lesson surfaces its completion state. Streaks, milestones, and progress rings keep you moving forward.",
    stat: "94%",
    statLabel: "completion rate",
  },
  {
    icon: Code2,
    title: "Developer-native tools",
    body: "CLI, REST API, and IDE integration. Every action is scriptable and automatable. No dashboards you will never use.",
    stat: "< 500ms",
    statLabel: "avg. response",
  },
  {
    icon: Shield,
    title: "Your data stays yours",
    body: "On-prem deployment, end-to-end encryption, zero data retention on inference. Compliance-ready from day one.",
    stat: "0 bytes",
    statLabel: "data retained",
  },
]

/**
 * Features section — 4-column card grid.
 * Each card: one job, one icon, one stat, one paragraph. No borders for decoration.
 * Section label + heading establish hierarchy without relying on color alone.
 */
function Features() {
  return (
    <section
      id="features"
      className="border-t border-border"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        {/* Section header */}
        <div className="mb-16 max-w-xl space-y-4">
          <p className="am-label">Why Learnova</p>
          <h2
            id="features-heading"
            className="text-[32px] font-medium tracking-[-0.015em] text-foreground"
          >
            Built for learners who move fast
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            Four principles that separate a tool people use daily from one they
            abandon after a week.
          </p>
        </div>

        {/* Grid — 4 columns desktop, 2 tablet, 1 mobile */}
        <ul
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          aria-label="Platform features"
        >
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </ul>
      </div>
    </section>
  )
}

interface FeatureCardProps {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  body: string
  stat: string
  statLabel: string
}

function FeatureCard({
  icon: Icon,
  title,
  body,
  stat,
  statLabel,
}: FeatureCardProps) {
  return (
    <li className="am-card group space-y-5 p-6">
      {/* Icon — indigo, 36x36 container, consistent sizing */}
      <div
        className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary"
        aria-hidden
      >
        <Icon className="size-4.5" strokeWidth={2} />
      </div>

      {/* Stat — prominent number, weight 700, 24px */}
      <div>
        <p className="text-2xl font-normal text-foreground tracking-tight">{stat}</p>
        <p className="text-xs text-muted-foreground font-medium mt-0.5">{statLabel}</p>
      </div>

      {/* Title + body */}
      <div className="space-y-2">
        <h3 className="text-[15px] leading-snug font-medium text-foreground">
          {title}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </li>
  )
}

/* ─── Progress Demo ───────────────────────────────────────────────────────── */

/**
 * Progress Demo section — shows the platform's core UI in context.
 * Learning progress is a first-class citizen, not an afterthought.
 * Two-column: explanation left, live demo right.
 */
function ProgressDemo() {
  return (
    <section
      id="progress-demo"
      className="border-t border-border bg-muted/30"
      aria-labelledby="progress-demo-heading"
    >
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* Left: explanation */}
          <div className="space-y-6">
            <p className="am-label">How it works</p>
            <h2
              id="progress-demo-heading"
              className="text-[32px] font-medium tracking-[-0.015em] text-foreground"
            >
              Progress is built into every pixel
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              Every course, module, and lesson surfaces its completion state at
              a glance. Completed work is visually muted so you instantly see
              what is done vs. what is left — no hunting, no guessing.
            </p>

            <ul className="space-y-4" aria-label="Progress features">
              {[
                {
                  icon: CheckCircle2,
                  color: "text-primary",
                  title: "Completion states",
                  desc: "Done items are muted — remaining work stands out immediately.",
                },
                {
                  icon: Flame,
                  color: "text-amber-500",
                  title: "Streaks & milestones",
                  desc: "Daily streaks reward consistency with a warm accent and subtle animation.",
                },
                {
                  icon: TrendingUp,
                  color: "text-primary",
                  title: "Progress rings",
                  desc: "Circular indicators show overall completion ratios at a glance.",
                },
              ].map(({ icon: Icon, color, title, desc }) => (
                <li key={title} className="flex gap-3">
                  <Icon
                    className={cn("mt-0.5 size-5 shrink-0", color)}
                    aria-hidden
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {title}
                    </p>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: dashboard preview card */}
          <div>
            <WeeklyProgressCard />
          </div>
        </div>
      </div>
    </section>
  )
}

function WeeklyProgressCard() {
  const subjects = [
    { name: "Python", progress: 88, hours: 4.5 },
    { name: "Algorithms", progress: 61, hours: 3.2 },
    { name: "Odoo ERP", progress: 45, hours: 2.1 },
    { name: "SQL & Databases", progress: 30, hours: 1.4 },
  ]

  return (
    <div
      className="am-card space-y-6 p-6"
      aria-label="Weekly learning progress"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            This week
          </p>
          <h3 className="mt-0.5 text-lg font-medium text-foreground">
            Learning summary
          </h3>
        </div>
        <div className="am-streak">
          <Flame className="size-3.5" aria-hidden />
          <span>14 days</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { value: "11.2h", label: "Study time" },
          { value: "3", label: "Modules done" },
          { value: "47", label: "Problems solved" },
        ].map(({ value, label }) => (
          <div key={label} className="text-center p-3 bg-muted/50 rounded-md">
            <p className="text-lg font-normal text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      <hr className="am-divider" />

      {/* Per-subject progress bars */}
      <div className="space-y-5" role="list" aria-label="Progress by subject">
        {subjects.map(({ name, progress, hours }) => (
          <div key={name} role="listitem" className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">{name}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{hours}h</span>
                <span className="text-xs font-normal text-foreground">{progress}%</span>
              </div>
            </div>
            <ProgressBar
              value={progress}
              size="sm"
              label={`${name}: ${progress}% complete this week`}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Stats ───────────────────────────────────────────────────────────────── */

const STATS = [
  {
    value: "< 500ms",
    label: "AI response time",
    desc: "Edge-deployed inference",
  },
  { value: "99.9%", label: "Platform uptime", desc: "30-day rolling average" },
  { value: "10k+", label: "API calls / day", desc: "And growing" },
  {
    value: "0 bytes",
    label: "Data retained",
    desc: "Zero retention on inference",
  },
]

function Stats() {
  return (
    <section className="border-t border-border" aria-labelledby="stats-heading">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        {/* Screenreader heading */}
        <h2 id="stats-heading" className="sr-only">
          Platform statistics
        </h2>

        <div
          className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-4"
          role="list"
          aria-label="Platform statistics"
        >
          {STATS.map(({ value, label, desc }) => (
            <div
              key={label}
              role="listitem"
              className="space-y-1 text-center md:text-left"
            >
              <p className="text-3xl font-normal text-foreground tracking-tight">
                {value}
              </p>
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Tech Stack ──────────────────────────────────────────────────────────── */

const STACK = [
  "Next.js 16",
  "TypeScript",
  "Tailwind CSS",
  "React 19",
  "Python",
  "FastAPI",
  "PostgreSQL",
  "Redis",
  "Docker",
  "Prisma",
  "shadcn/ui",
]

/**
 * TechStack section — minimal pill list.
 * No color-coded badges (would be decoration, not information).
 * Neutral muted styling; the content speaks for itself.
 */
function TechStack() {
  return (
    <section
      id="stack"
      className="border-t border-border bg-muted/30"
      aria-labelledby="stack-heading"
    >
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
        <div className="mb-12 space-y-3">
          <p className="am-label">The stack</p>
          <h2
            id="stack-heading"
            className="text-2xl font-medium tracking-tight text-foreground"
          >
            Built on proven technology
          </h2>
        </div>

        {/* Pills — neutral styling; readable, not flashy */}
        <div
          className="flex flex-wrap gap-2"
          role="list"
          aria-label="Technology stack"
        >
          {STACK.map((tech) => (
            <span
              key={tech}
              role="listitem"
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── CTA Banner ──────────────────────────────────────────────────────────── */

/**
 * CTA Banner — one clear action before the footer.
 * Clean white/card background, strong heading, two options: start free or explore.
 * No decorative illustration — the heading and context carry the weight.
 */
function CTABanner() {
  return (
    <section className="border-t border-border" aria-labelledby="cta-heading">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="max-w-2xl space-y-8">
          <div className="space-y-4">
            <p className="am-label">Ready to start</p>
            <h2
              id="cta-heading"
              className="text-[40px] leading-[1.1] font-medium tracking-[-0.02em] text-foreground"
            >
              Your next learning
              <br />
              breakthrough is one click away.
            </h2>
            <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
              Join learners who use Learnova to learn faster, retain more, and
              ship better code — without the noise.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonAnchor size="lg" href="/signup">
              <Zap className="-ml-1 size-4" />
              Start for free
            </ButtonAnchor>
            <ButtonAnchor
              variant="outline"
              size="lg"
              href="https://github.com/slantie/qubits-learnova"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="-ml-1 size-4" />
              Star on GitHub
            </ButtonAnchor>
          </div>

          <p className="text-sm text-muted-foreground">
            No account needed to explore. Free during beta.{" "}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Log in instead
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}

/* ─── Footer ──────────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer
      className="border-t border-border bg-muted/20"
      aria-label="Site footer"
    >
      <div className="mx-auto max-w-[80vw] px-6 py-10">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <Image
              src="/learnova.png"
              alt="Learnova"
              width={20}
              height={20}
              className="size-5 rounded"
              aria-hidden
            />
            <span className="text-sm font-medium text-foreground">
              Learnova
            </span>
          </div>

          {/* Footer links — weight 500, muted, keyboard navigable */}
          <nav aria-label="Footer navigation">
            <ul className="flex items-center gap-6" role="list">
              {[
                { label: "Documentation", href: "#" },
                { label: "API Reference", href: "#" },
                {
                  label: "GitHub",
                  href: "https://github.com/slantie/qubits-learnova",
                },
              ].map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Bottom row */}
        <div className="mt-8 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            2026 Learnova by Qubits. Built at Hackathon 2026. MIT License.
          </p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            Press <kbd>D</kbd> to toggle dark mode
          </p>
        </div>
      </div>
    </footer>
  )
}

/* ─── Page Root ───────────────────────────────────────────────────────────── */

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />

      <main id="main-content" className="flex-1" tabIndex={-1}>
        <Hero />
        <Features />
        <ProgressDemo />
        <Stats />
        <TechStack />
        <CTABanner />
      </main>

      <Footer />
    </div>
  )
}
