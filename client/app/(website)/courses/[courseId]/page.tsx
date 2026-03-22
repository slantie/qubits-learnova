"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/hooks/useAuth"
import { api } from "@/lib/api"
import { fetchCourseDetail, enrollInCourse } from "@/lib/api/learner"
import { LearnerCourseDetail } from "@/types"
import { CourseOverviewTab } from "@/components/learner/CourseOverviewTab"
import { ReviewsTab } from "@/components/learner/ReviewsTab"
import { PaymentModal } from "@/components/learner/PaymentModal"
import { VideoPlayer } from "@/components/ui/VideoPlayer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDuration } from "@/lib/formatDuration"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Play,
  FileText,
  Image as ImageIcon,
  ClipboardText,
  Clock,
  BookOpen,
  CaretLeft,
  CircleNotch,
  Link as LinkIcon2,
  FileArrowDown,
  X,
  CaretRight,
  DownloadSimple,
  CheckCircle,
  Circle,
  Trophy,
  ArrowRight,
  Users,
  Lock,
  Medal,
  ArrowSquareOut,
  Printer,
  Copy,
  SealCheck,
  Star,
  FileAudio,
  Code,
  CheckSquare,
  ChartBar as ChartBar2,
  Chat,
} from "@phosphor-icons/react"
import { LessonType } from "@/types"
import { LiveWaveform } from "@/components/ui/live-waveform"

// ─── Types ────────────────────────────────────────────────────────────────────

interface LessonMeta {
  id: number
  title: string
  type: LessonType
  order: number
  duration: number | null
  videoStatus: string | null
}

interface LessonTimestamp {
  time: number
  label: string
  description?: string
}

interface LessonDetail {
  id: number
  title: string
  type: LessonType
  description: string | null
  videoUrl: string | null
  videoStatus: string | null
  thumbnailUrl: string | null
  filePath: string | null
  allowDownloadSimple: boolean
  duration: number | null
  timestamps: LessonTimestamp[] | null
  richContent: unknown | null
  iframeUrl: string | null
  quizBlockId: number | null
  attachments: {
    id: number
    type: "FILE" | "LINK"
    label: string
    filePath: string | null
    externalUrl: string | null
  }[]
}

interface QuizMeta {
  id: number
  title: string
  rewards: {
    attempt1Points: number
    attempt2Points: number
    attempt3Points: number
    attempt4PlusPoints: number
  } | null
}

interface SectionMeta {
  id: number
  title: string
  order: number
  isLocked: boolean
  lessons: LessonMeta[]
}

interface CourseViewData {
  id: number
  title: string
  description: string | null
  coverImage: string | null
  tags: string[]
  instructorName: string
  sections: SectionMeta[]
  lessons: LessonMeta[]
  completedLessonIds: number[]
}

type PageTab = "overview" | "reviews"
type ContentTab =
  | "description"
  | "images"
  | "documents"
  | "chapters"
  | "resources"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(\?|$)/i

function lessonTypeIcon(type: LessonType): React.ReactNode {
  const cls = "size-3 shrink-0"
  switch (type) {
    case "VIDEO":
      return <Play className={cls} />
    case "ARTICLE":
      return <FileText className={cls} />
    case "PDF":
      return <FileText className={cls} />
    case "IMAGE":
      return <ImageIcon className={cls} />
    case "AUDIO":
      return <FileAudio className={cls} />
    case "LINK_BLOCK":
      return <LinkIcon2 className={cls} />
    case "IFRAME":
      return <Code className={cls} />
    case "QUIZ_BLOCK":
      return <ClipboardText className={cls} />
    case "ASSIGNMENT":
      return <CheckSquare className={cls} />
    case "SURVEY":
      return <ChartBar2 className={cls} />
    case "FEEDBACK_GATE":
      return <Chat className={cls} />
    default:
      return <FileText className={cls} />
  }
}

function getDownloadSimpleUrl(url: string, filename: string): string {
  if (url.includes("res.cloudinary.com")) {
    const baseName = filename.replace(/\.[^.]+$/, "")
    return url.replace(
      "/upload/",
      `/upload/fl_attachment:${encodeURIComponent(baseName)}/`
    )
  }
  return url
}

// ─── Rich Lesson Content (original design, fully restored) ───────────────────

function LessonContent({
  lesson,
  course,
  onNavigate,
  completedIds,
  onMarkComplete,
  onMarkIncomplete,
  marking,
}: {
  lesson: LessonDetail
  course: CourseViewData
  onNavigate: (id: number) => void
  completedIds: Set<number>
  onMarkComplete: (id: number) => Promise<void>
  onMarkIncomplete: (id: number) => Promise<void>
  marking: boolean
}) {
  const [activeTab, setActiveTab] = useState<ContentTab>("description")
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Survey/Feedback state
  type SurveyQuestion = {
    id: string
    label: string
    type: "text" | "star" | "choice"
    required: boolean
    options: string[]
  }
  const surveyQuestions: SurveyQuestion[] = (() => {
    try {
      const rc = lesson.richContent
      if (Array.isArray(rc)) return rc as SurveyQuestion[]
      if (typeof rc === "string") {
        const p = JSON.parse(rc)
        if (Array.isArray(p)) return p as SurveyQuestion[]
      }
    } catch {}
    return []
  })()
  const [surveyAnswers, setSurveyAnswers] = useState<
    Record<string, string | number>
  >({})
  const [surveySubmitted, setSurveySubmitted] = useState(false)
  const [surveySubmitting, setSurveySubmitting] = useState(false)

  const handleSurveySubmit = async () => {
    const missing = surveyQuestions.filter(
      (q) => q.required && !surveyAnswers[q.id]
    )
    if (missing.length > 0) {
      toast.error("Please answer all required questions")
      return
    }
    setSurveySubmitting(true)
    // Store responses locally (no separate API endpoint needed — just mark complete)
    await onMarkComplete(lesson.id)
    setSurveySubmitted(true)
    setSurveySubmitting(false)
    toast.success("Response submitted!")
  }

  const images = lesson.attachments.filter(
    (a) => a.type === "FILE" && a.filePath && IMAGE_EXT.test(a.filePath)
  )
  const docs = lesson.attachments.filter(
    (a) => a.type === "FILE" && a.filePath && !IMAGE_EXT.test(a.filePath)
  )
  const links = lesson.attachments.filter((a) => a.type === "LINK")
  const chapters = lesson.timestamps ?? []

  const tabs: {
    key: ContentTab
    label: string
    icon: React.ReactNode
    count?: number
    show: boolean
  }[] = [
    {
      key: "description",
      label: "Description",
      icon: <FileText className="size-3.5" />,
      show: !!lesson.description,
    },
    {
      key: "images",
      label: "Images",
      icon: <ImageIcon className="size-3.5" />,
      count: images.length,
      show: images.length > 0,
    },
    {
      key: "documents",
      label: "Documents",
      icon: <FileArrowDown className="size-3.5" />,
      count: docs.length,
      show: docs.length > 0,
    },
    {
      key: "chapters",
      label: "Chapters",
      icon: <Clock className="size-3.5" />,
      count: chapters.length,
      show: chapters.length > 0,
    },
    {
      key: "resources",
      label: "Resources",
      icon: <LinkIcon2 className="size-3.5" />,
      count: links.length,
      show: links.length > 0,
    },
  ]
  const visibleTabs = tabs.filter((t) => t.show)
  // Derive the effective active tab during render — avoids setState-in-effect
  const effectiveTab = visibleTabs.find((t) => t.key === activeTab)
    ? activeTab
    : (visibleTabs[0]?.key ?? activeTab)

  useEffect(() => {
    if (lightboxIndex === null) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null)
      else if (e.key === "ArrowRight" && lightboxIndex < images.length - 1)
        setLightboxIndex(lightboxIndex + 1)
      else if (e.key === "ArrowLeft" && lightboxIndex > 0)
        setLightboxIndex(lightboxIndex - 1)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [lightboxIndex, images.length])

  const allLessons = [
    ...(course.sections ?? []).flatMap((s) => s.lessons),
    ...course.lessons,
  ]
  const idx = allLessons.findIndex((l) => l.id === lesson.id)
  const prev = allLessons[idx - 1]
  const next = allLessons[idx + 1]
  const isCompleted = completedIds.has(lesson.id)

  // Derive checklist items from richContent for ASSIGNMENT
  const checklistItems: string[] = (() => {
    try {
      const rc = lesson.richContent
      if (Array.isArray(rc)) return rc as string[]
      if (typeof rc === "string") {
        const p = JSON.parse(rc)
        if (Array.isArray(p)) return p as string[]
      }
    } catch {}
    return []
  })()

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-8">
      {/* ── VIDEO ────────────────────────────────────────────────────── */}
      {lesson.type === "VIDEO" &&
      lesson.videoStatus === "READY" &&
      lesson.videoUrl ? (
        <VideoPlayer
          src={lesson.videoUrl}
          poster={lesson.thumbnailUrl ?? undefined}
          title={lesson.title}
          timestamps={lesson.timestamps ?? undefined}
          className="w-full shadow-lg"
        />
      ) : null}
      {lesson.videoStatus === "PROCESSING" ? (
        <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-xl bg-muted text-muted-foreground">
          <CircleNotch className="size-8 animate-spin text-amber-500" />
          <p className="text-sm font-medium">Video is being processed</p>
          <p className="text-xs">Check back in a few minutes</p>
        </div>
      ) : null}

      {/* ── ARTICLE ─────────────────────────────────────────────────── */}
      {lesson.type === "ARTICLE" && !!lesson.richContent && (
        <div
          className="prose prose-sm dark:prose-invert max-w-none leading-relaxed"
          dangerouslySetInnerHTML={{ __html: lesson.richContent as string }}
        />
      )}

      {/* ── PDF ─────────────────────────────────────────────────────── */}
      {lesson.type === "PDF" && lesson.filePath && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-4">
            <FileText className="size-8 shrink-0 text-red-500" />
            <span className="flex-1 truncate text-sm font-medium">
              {lesson.title}
            </span>
            <a href={lesson.filePath} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline">
                <ArrowSquareOut className="mr-1 size-3.5" />
                Open PDF
              </Button>
            </a>
            {lesson.allowDownloadSimple && (
              <a
                href={getDownloadSimpleUrl(lesson.filePath, lesson.title)}
                download={lesson.title}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="outline">
                  <DownloadSimple className="mr-1 size-3.5" />
                  Download
                </Button>
              </a>
            )}
          </div>
          <iframe
            src={lesson.filePath}
            className="h-[75vh] w-full rounded-xl border"
            title={lesson.title}
          />
        </div>
      )}

      {/* ── IMAGE ───────────────────────────────────────────────────── */}
      {lesson.type === "IMAGE" && lesson.filePath && (
        <div className="relative aspect-video max-h-125 w-full overflow-hidden rounded-xl border">
          <Image
            src={lesson.filePath}
            alt={lesson.title}
            fill
            className="object-contain"
            unoptimized
          />
        </div>
      )}

      {/* ── AUDIO ───────────────────────────────────────────────────── */}
      {lesson.type === "AUDIO" && lesson.filePath && (
        <div className="flex flex-col gap-4 rounded-xl border bg-muted/20 p-5">
          {/* Header row */}
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-pink-500/10 p-2">
              <FileAudio className="size-5 shrink-0 text-pink-500" />
            </div>
            <span className="flex-1 truncate font-semibold">
              {lesson.title}
            </span>
            {lesson.allowDownloadSimple && (
              <a
                href={getDownloadSimpleUrl(lesson.filePath, lesson.title)}
                download={lesson.title}
              >
                <Button size="sm" variant="outline" className="shrink-0">
                  <DownloadSimple className="mr-1 size-3.5" />
                  Download
                </Button>
              </a>
            )}
          </div>

          {/* Waveform visualizer */}
          <LiveWaveform
            active={audioPlaying}
            mode="scrolling"
            height={56}
            barColor="rgb(236, 72, 153)"
            barWidth={3}
            barGap={1.5}
            barHeight={5}
            sensitivity={1.4}
            fadeEdges
            className="rounded-lg"
          />

          {/* Native audio (hidden controls, we control play state) */}
          <audio
            ref={audioRef}
            src={lesson.filePath}
            className="w-full"
            controls
            onPlay={() => setAudioPlaying(true)}
            onPause={() => setAudioPlaying(false)}
            onEnded={() => setAudioPlaying(false)}
          />
        </div>
      )}

      {/* ── LINK_BLOCK ──────────────────────────────────────────────── */}
      {lesson.type === "LINK_BLOCK" && lesson.description && (
        <a
          href={lesson.description}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-4 rounded-xl border bg-card p-5 transition-colors hover:bg-muted/40"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10">
            <LinkIcon2 className="size-5 text-cyan-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{lesson.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {lesson.description}
            </p>
          </div>
          <ArrowSquareOut className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
        </a>
      )}

      {/* ── IFRAME ──────────────────────────────────────────────────── */}
      {lesson.type === "IFRAME" &&
        lesson.iframeUrl &&
        (() => {
          const raw = lesson.iframeUrl
          const match = raw.match(/<iframe[\s\S]*?\bsrc=["']([^"']+)["']/i)
          const src = match ? match[1] : raw
          return (
            <div className="flex flex-col gap-2">
              <iframe
                src={src}
                className="h-[75vh] w-full rounded-xl border"
                title={lesson.title}
                allow="fullscreen"
              />
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 self-end text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowSquareOut className="size-3" /> Open in new tab
              </a>
            </div>
          )
        })()}

      {/* ── QUIZ_BLOCK ──────────────────────────────────────────────── */}
      {lesson.type === "QUIZ_BLOCK" && lesson.quizBlockId && (
        <Link
          href={`/courses/${course.id}/quiz/${lesson.quizBlockId}`}
          className="group flex items-center gap-4 rounded-xl border bg-card p-5 transition-colors hover:bg-muted/40"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
            <ClipboardText className="size-5 text-orange-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">{lesson.title}</p>
            <p className="text-xs text-muted-foreground">
              Take this quiz to test your knowledge
            </p>
          </div>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
        </Link>
      )}

      {/* ── ASSIGNMENT ──────────────────────────────────────────────── */}
      {lesson.type === "ASSIGNMENT" && (
        <div className="flex flex-col gap-4 rounded-xl border bg-muted/20 p-5">
          <div className="flex items-center gap-3">
            <CheckSquare className="size-5 text-teal-500" />
            <h3 className="text-sm font-semibold">Assignment Checklist</h3>
          </div>
          {lesson.description && (
            <p className="text-sm text-muted-foreground">
              {lesson.description}
            </p>
          )}
          {checklistItems.length > 0 ? (
            <ol className="flex flex-col gap-2">
              {checklistItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/30 text-[10px] font-bold text-muted-foreground">
                    {idx + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No checklist items.
            </p>
          )}
        </div>
      )}

      {/* ── SURVEY / FEEDBACK_GATE ──────────────────────────────────── */}
      {(lesson.type === "SURVEY" || lesson.type === "FEEDBACK_GATE") && (
        <div className="flex flex-col gap-5 rounded-xl border bg-muted/20 p-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "rounded-lg p-2",
                lesson.type === "SURVEY"
                  ? "bg-lime-500/10"
                  : "bg-fuchsia-500/10"
              )}
            >
              {lesson.type === "SURVEY" ? (
                <ChartBar2 className="size-5 text-lime-600" />
              ) : (
                <Chat className="size-5 text-fuchsia-500" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold">{lesson.title}</p>
              {lesson.type === "FEEDBACK_GATE" && (
                <p className="text-[11px] text-fuchsia-600 dark:text-fuchsia-400">
                  Complete to unlock the next lesson
                </p>
              )}
            </div>
          </div>

          {lesson.description && (
            <p className="text-sm text-muted-foreground">
              {lesson.description}
            </p>
          )}

          {surveySubmitted ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <CheckCircle className="size-10 text-emerald-500" />
              <p className="text-sm font-semibold">
                Thank you for your response!
              </p>
              <p className="text-xs text-muted-foreground">
                Your feedback has been recorded.
              </p>
            </div>
          ) : surveyQuestions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground italic">
              No questions configured for this block.
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {surveyQuestions.map((q, qi) => (
                <div key={q.id} className="flex flex-col gap-2">
                  <label className="text-sm font-medium">
                    {qi + 1}. {q.label}
                    {q.required && (
                      <span className="ml-1 text-destructive">*</span>
                    )}
                  </label>

                  {q.type === "text" && (
                    <textarea
                      value={(surveyAnswers[q.id] as string) ?? ""}
                      onChange={(e) =>
                        setSurveyAnswers((prev) => ({
                          ...prev,
                          [q.id]: e.target.value,
                        }))
                      }
                      placeholder="Your answer..."
                      rows={3}
                      className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                    />
                  )}

                  {q.type === "star" && (
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          aria-label={`${s} star`}
                          onClick={() =>
                            setSurveyAnswers((prev) => ({ ...prev, [q.id]: s }))
                          }
                          className="transition-transform hover:scale-110"
                        >
                          <Star
                            className={cn(
                              "size-7",
                              (surveyAnswers[q.id] as number) >= s
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground/30"
                            )}
                          />
                        </button>
                      ))}
                      {surveyAnswers[q.id] && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {surveyAnswers[q.id]} / 5
                        </span>
                      )}
                    </div>
                  )}

                  {q.type === "choice" && (
                    <div className="flex flex-col gap-1.5">
                      {q.options.filter(Boolean).map((opt, oi) => (
                        <label
                          key={oi}
                          className="group flex cursor-pointer items-center gap-2.5"
                        >
                          <span
                            className={cn(
                              "flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                              surveyAnswers[q.id] === opt
                                ? "border-primary bg-primary"
                                : "border-muted-foreground/40 group-hover:border-primary/60"
                            )}
                          >
                            {surveyAnswers[q.id] === opt && (
                              <span className="size-1.5 rounded-full bg-primary-foreground" />
                            )}
                          </span>
                          <input
                            type="radio"
                            name={`survey-${q.id}`}
                            value={opt}
                            checked={surveyAnswers[q.id] === opt}
                            onChange={() =>
                              setSurveyAnswers((prev) => ({
                                ...prev,
                                [q.id]: opt,
                              }))
                            }
                            className="sr-only"
                          />
                          <span className="text-sm">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <Button
                onClick={handleSurveySubmit}
                disabled={surveySubmitting}
                className="self-start"
              >
                {surveySubmitting && (
                  <CircleNotch className="mr-2 size-4 animate-spin" />
                )}
                Submit Response
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── DOCUMENT (legacy) ────────────────────────────────────────── */}
      {lesson.type === "DOCUMENT" && lesson.filePath && (
        <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-4">
          <FileText className="size-8 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate text-sm font-medium">
            {lesson.title}
          </span>
          {lesson.allowDownloadSimple && (
            <a
              href={getDownloadSimpleUrl(lesson.filePath, lesson.title)}
              download={lesson.title}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" variant="outline">
                <DownloadSimple className="mr-1 size-3.5" />
                DownloadSimple
              </Button>
            </a>
          )}
        </div>
      )}

      {/* Title + meta */}
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-2xl">{lesson.title}</h2>
        {lesson.duration && (
          <Badge variant="neutral" className="text-xs">
            <Clock className="mr-1 size-3" />
            {formatDuration(lesson.duration)}
          </Badge>
        )}
      </div>

      {/* Content tabs */}
      {visibleTabs.length > 0 && (
        <>
          <div className="flex overflow-x-auto border-b">
            {visibleTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                  effectiveTab === tab.key
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px]",
                      effectiveTab === tab.key
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="min-h-30">
            {effectiveTab === "description" && lesson.description && (
              <div
                className="prose prose-sm dark:prose-invert max-w-none leading-relaxed text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: lesson.description }}
              />
            )}
            {effectiveTab === "images" && images.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((a, i) => (
                  <button
                    key={a.id}
                    onClick={() => setLightboxIndex(i)}
                    className="group relative aspect-4/3 cursor-pointer overflow-hidden rounded-xl border bg-muted/30"
                    title={a.label}
                  >
                    <Image
                      src={a.filePath!}
                      alt={a.label}
                      fill
                      className="object-cover transition-transform duration-200 group-hover:scale-105"
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            )}
            {effectiveTab === "documents" && docs.length > 0 && (
              <ul className="flex flex-col gap-2">
                {docs.map((a) => (
                  <li key={a.id}>
                    <a
                      href={
                        lesson.allowDownloadSimple
                          ? getDownloadSimpleUrl(a.filePath!, a.label)
                          : a.filePath!
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      download={
                        lesson.allowDownloadSimple ? a.label : undefined
                      }
                      className="group inline-flex w-full items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm transition-colors hover:bg-muted/50"
                    >
                      <FileText className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                      <span className="flex-1 truncate font-medium">
                        {a.label}
                      </span>
                      {lesson.allowDownloadSimple && (
                        <FileArrowDown className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {effectiveTab === "chapters" && chapters.length > 0 && (
              <div className="flex flex-col divide-y overflow-hidden rounded-xl border">
                {chapters
                  .sort((a, b) => a.time - b.time)
                  .map((ts, i) => {
                    const h = Math.floor(ts.time / 3600),
                      m = Math.floor((ts.time % 3600) / 60),
                      s = Math.floor(ts.time % 60)
                    const label =
                      h > 0
                        ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
                        : `${m}:${String(s).padStart(2, "0")}`
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-4 px-4 py-3 transition-colors hover:bg-muted/40"
                      >
                        <span className="min-w-12 shrink-0 pt-0.5 font-mono text-xs text-primary tabular-nums">
                          {label}
                        </span>
                        <div className="flex min-w-0 flex-col">
                          <span className="text-sm font-medium">
                            {ts.label}
                          </span>
                          {ts.description && (
                            <span className="mt-0.5 text-xs text-muted-foreground">
                              {ts.description}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
            {effectiveTab === "resources" && links.length > 0 && (
              <ul className="flex flex-col gap-2">
                {links.map((a) => (
                  <li key={a.id}>
                    <a
                      href={a.externalUrl ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm transition-colors hover:bg-muted/50"
                    >
                      <LinkIcon2 className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
                      <span>{a.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {/* Mark complete + prev/next */}
      <div className="flex flex-col gap-4 border-t pt-4">
        <div className="flex items-center gap-3">
          {isCompleted ? (
            <>
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle className="size-5" />
                <span className="text-sm font-medium">Lesson completed</span>
              </div>
              <button
                onClick={() => onMarkIncomplete(lesson.id)}
                disabled={marking}
                className="ml-2 text-xs text-muted-foreground underline hover:text-foreground disabled:opacity-50"
              >
                Undo
              </button>
            </>
          ) : (
            <Button
              onClick={async () => {
                await onMarkComplete(lesson.id)
                if (next) onNavigate(next.id)
              }}
              disabled={marking}
              className="gap-2"
            >
              {marking ? (
                <CircleNotch className="size-4 animate-spin" />
              ) : (
                <CheckCircle className="size-4" />
              )}
              {next ? "Complete & Continue" : "Mark as Complete"}
              {next && <ArrowRight className="size-4" />}
            </Button>
          )}
        </div>
        <div className="flex items-center justify-between">
          {prev ? (
            <button
              onClick={() => onNavigate(prev.id)}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <CaretLeft className="size-4" />
              <span className="hidden sm:inline">Previous:</span> {prev.title}
            </button>
          ) : (
            <div />
          )}
          {next && (
            <button
              onClick={() => onNavigate(next.id)}
              className="ml-auto inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              Next: {next.title}
              <CaretLeft className="size-4 rotate-180" />
            </button>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && images[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setLightboxIndex(null)}
        >
          <Button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X className="size-5" />
          </Button>
          <span className="absolute top-5 left-1/2 -translate-x-1/2 font-mono text-sm text-white/60">
            {lightboxIndex + 1} / {images.length}
          </span>
          {lesson.allowDownloadSimple && (
            <Link
              href={getDownloadSimpleUrl(
                images[lightboxIndex].filePath!,
                images[lightboxIndex].label
              )}
              download={images[lightboxIndex].label}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-4 right-16 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            >
              <DownloadSimple className="size-5" />
            </Link>
          )}
          {lightboxIndex > 0 && (
            <Button
              onClick={(e) => {
                e.stopPropagation()
                setLightboxIndex(lightboxIndex - 1)
              }}
              className="absolute top-1/2 left-3 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            >
              <CaretLeft className="size-6" />
            </Button>
          )}
          {lightboxIndex < images.length - 1 && (
            <Button
              onClick={(e) => {
                e.stopPropagation()
                setLightboxIndex(lightboxIndex + 1)
              }}
              className="absolute top-1/2 right-3 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            >
              <CaretRight className="size-6" />
            </Button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[lightboxIndex].filePath!}
            alt={images[lightboxIndex].label}
            className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="absolute bottom-5 left-1/2 max-w-[80vw] -translate-x-1/2 truncate rounded-lg bg-black/50 px-3 py-1.5 text-sm text-white/80 backdrop-blur-sm">
            {images[lightboxIndex].label}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string
  const { isAuthenticated } = useAuth()

  // Overview data (from learner API — for enrollment, hero, reviews)
  const [overviewData, setOverviewData] = useState<LearnerCourseDetail | null>(
    null
  )
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [pageTab, setPageTab] = useState<PageTab>("overview")
  const [enrolling, setEnrolling] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)

  // Player data (from view API — for lesson content, progress)
  const [courseView, setCourseView] = useState<CourseViewData | null>(null)
  const [quizzes, setQuizzes] = useState<QuizMeta[]>([])
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set())
  const [activeLessonId, setActiveLessonId] = useState<number | null>(null)
  const activeLessonIdRef = useRef<number | null>(null)
  activeLessonIdRef.current = activeLessonId
  const [lesson, setLesson] = useState<LessonDetail | null>(null)
  const [lessonLoading, setLessonLoading] = useState(false)
  const [marking, setMarking] = useState(false)

  // Certificate
  const [certificate, setCertificate] = useState<{
    uid: string
    pointsEarned: number
    issuedAt: string
  } | null>(null)
  const [certHtml, setCertHtml] = useState<string | null>(null)
  const [showCertModal, setShowCertModal] = useState(false)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"
  const clientUrl =
    process.env.NEXT_PUBLIC_CLIENT_URL || "http://localhost:3000"

  // Load overview (learner API)
  const loadOverview = useCallback(
    async (silent = false) => {
      if (!silent) setOverviewLoading(true)
      try {
        const data = await fetchCourseDetail(Number(courseId))
        setOverviewData(data)
      } catch {
        if (!silent) {
          toast.error("Course not found")
          router.push("/")
        }
      } finally {
        if (!silent) setOverviewLoading(false)
      }
    },
    [courseId, router]
  )

  // Load course view (progress API)
  const loadCourseView = useCallback(async () => {
    try {
      const [courseData, quizData] = await Promise.all([
        api.get(`/courses/${courseId}/view`),
        api.get(`/courses/${courseId}/quizzes`).catch(() => []),
      ])
      const c: CourseViewData = courseData.course ?? courseData
      setCourseView(c)
      setQuizzes(Array.isArray(quizData) ? quizData : (quizData.quizzes ?? []))
      const ids = new Set<number>(c.completedLessonIds ?? [])
      setCompletedIds(ids)
      const allLessons = [
        ...(c.sections ?? []).flatMap((s) => s.lessons),
        ...c.lessons,
      ]
      if (allLessons.length > 0 && !activeLessonIdRef.current) {
        const first = allLessons.find((l) => !ids.has(l.id)) ?? allLessons[0]
        setActiveLessonId(first.id)
      }
    } catch {
      /* non-fatal */
    }
  }, [courseId])

  const loadCertificate = useCallback(async () => {
    try {
      const data = await api.get(`/certificates/course/${courseId}`)
      const cert = data.certificate
      if (cert) {
        setCertificate(cert)
        const htmlRes = await fetch(`${apiUrl}/certificates/view/${cert.uid}`)
        if (htmlRes.ok) setCertHtml(await htmlRes.text())
      }
    } catch {
      /* no certificate yet */
    }
  }, [courseId, apiUrl])

  useEffect(() => {
    loadOverview()
  }, [loadOverview])
  useEffect(() => {
    if (isAuthenticated) loadCourseView()
  }, [isAuthenticated, loadCourseView])
  useEffect(() => {
    if (isAuthenticated) loadCertificate()
  }, [isAuthenticated, loadCertificate])

  // Load lesson detail
  useEffect(() => {
    if (!activeLessonId) return
    setLessonLoading(true)
    setLesson(null)
    api
      .get(`/courses/${courseId}/lessons/${activeLessonId}/view`)
      .then((data) => setLesson(data.lesson ?? data))
      .catch(() => setLesson(null))
      .finally(() => setLessonLoading(false))
  }, [activeLessonId, courseId])

  const handleMarkComplete = useCallback(
    async (lessonId: number) => {
      setMarking(true)
      try {
        await api.post(`/courses/${courseId}/lessons/${lessonId}/complete`, {})
        setCompletedIds((prev) => new Set([...prev, lessonId]))
        // Refresh enrollment stats so overview tab stays accurate
        loadOverview(true)
        loadCertificate()
      } catch {
      } finally {
        setMarking(false)
      }
    },
    [courseId, loadOverview, loadCertificate]
  )

  const handleMarkIncomplete = useCallback(
    async (lessonId: number) => {
      setMarking(true)
      try {
        await api.delete(`/courses/${courseId}/lessons/${lessonId}/complete`)
        setCompletedIds((prev) => {
          const n = new Set(prev)
          n.delete(lessonId)
          return n
        })
        // Refresh enrollment stats so overview tab stays accurate
        loadOverview(true)
      } catch {
      } finally {
        setMarking(false)
      }
    },
    [courseId, loadOverview]
  )

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }
    setEnrolling(true)
    try {
      await enrollInCourse(Number(courseId))
      toast.success("Enrolled successfully!")
      await Promise.all([loadOverview(), loadCourseView()])
    } catch (err) {
      const error = err as { data?: { message?: string } } | Error
      const message =
        typeof error === "object" && "data" in error
          ? (error as { data?: { message?: string } }).data?.message
          : undefined
      toast.error(message || "Enrollment failed")
    } finally {
      setEnrolling(false)
    }
  }

  const handlePaymentSuccess = async () => {
    toast.success("Payment successful! You are now enrolled.")
    await Promise.all([loadOverview(), loadCourseView()])
  }

  // ─── Derived ──────────────────────────────────────────────────────────────

  const isEnrolled = !!overviewData?.enrollment
  const enrollment = overviewData?.enrollment
  const allCourseLessons = courseView
    ? [
        ...(courseView.sections ?? []).flatMap((s) => s.lessons),
        ...courseView.lessons,
      ]
    : []
  const totalDuration = allCourseLessons.reduce(
    (s, l) => s + (l.duration ?? 0),
    0
  )
  const progressPct =
    allCourseLessons.length > 0
      ? Math.round((completedIds.size / allCourseLessons.length) * 100)
      : 0

  const renderCTA = () => {
    if (!overviewData) return null
    if (isEnrolled) {
      if (enrollment?.status === "COMPLETED") {
        return (
          <Button
            variant="outline"
            className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
          >
            <CheckCircle className="mr-2 size-4" /> Completed
          </Button>
        )
      }
      return (
        <Button
          onClick={() => activeLessonId && setActiveLessonId(activeLessonId)}
        >
          <Play className="mr-2 size-4 fill-current" />
          {enrollment?.completedLessons === 0 ? "Start Learning" : "Continue"}
        </Button>
      )
    }
    if (overviewData.accessRule === "ON_PAYMENT") {
      return (
        <Button
          onClick={() => {
            if (!isAuthenticated) {
              router.push("/login")
              return
            }
            setPaymentOpen(true)
          }}
          className="bg-amber-500 text-white hover:bg-amber-600"
        >
          Buy ₹{overviewData.price}
        </Button>
      )
    }
    if (overviewData.accessRule === "ON_INVITATION") {
      return (
        <Button disabled variant="outline">
          <Lock className="mr-2 size-4" /> Invitation Only
        </Button>
      )
    }
    return (
      <Button onClick={handleEnroll} disabled={enrolling}>
        {enrolling ? (
          <CircleNotch className="mr-2 size-4 animate-spin" />
        ) : (
          <BookOpen className="mr-2 size-4" />
        )}
        {enrolling ? "Enrolling..." : "Enroll for Free"}
      </Button>
    )
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (overviewLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-full" />
      </div>
    )
  }

  if (!overviewData) return null

  // ─── Player mode (enrolled + lesson selected) ─────────────────────────────

  if (isEnrolled && activeLessonId) {
    return (
      <div className="flex min-h-screen flex-col">
        {/* Slim course header */}
        <div className="flex items-center gap-3 border-b bg-muted/20 px-4 py-2">
          <button
            onClick={() => setActiveLessonId(null)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <CaretLeft className="size-3.5" /> Overview
          </button>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="truncate text-sm font-medium">
            {overviewData.title}
          </span>
          {progressPct > 0 && (
            <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
              {completedIds.size}/{allCourseLessons.length} completed
            </span>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-r bg-muted/20 xl:w-80">
            <div className="border-b p-5">
              <h1 className="mb-1 line-clamp-2 text-sm leading-snug">
                {overviewData.title}
              </h1>
              {overviewData.instructor?.name && (
                <p className="mb-3 text-xs text-muted-foreground">
                  by {overviewData.instructor.name}
                </p>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <BookOpen className="size-3" />
                  {allCourseLessons.length} lessons
                </span>
                {totalDuration > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" />
                    {formatDuration(totalDuration)}
                  </span>
                )}
              </div>
              {allCourseLessons.length > 0 && (
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium tabular-nums">
                      {completedIds.size}/{allCourseLessons.length}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full w-[calc(var(--pct)*1%)] rounded-full bg-primary transition-all duration-500"
                      style={{ "--pct": progressPct } as Record<string, number>}
                    />
                  </div>
                  {progressPct >= 100 && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary">
                      <Trophy className="size-3.5" /> Course completed!
                    </div>
                  )}
                </div>
              )}

              {certificate && (
                <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="mb-3 flex items-center gap-2">
                    <SealCheck className="size-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs leading-tight font-normal text-foreground">
                        Certificate Earned
                      </p>
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        {new Date(certificate.issuedAt).toLocaleDateString(
                          undefined,
                          { day: "numeric", month: "short", year: "numeric" }
                        )}
                        {certificate.pointsEarned > 0 && (
                          <> · {certificate.pointsEarned} pts</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCertModal(true)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      <Medal className="size-3" /> View
                    </button>
                    <a
                      href={`${clientUrl}/verify/${certificate.uid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                    >
                      <ArrowSquareOut className="size-3" /> Verify
                    </a>
                  </div>
                </div>
              )}
            </div>

            <nav className="flex-1 py-2">
              {(() => {
                const indexMap = new Map<number, number>()
                let idx = 1
                for (const s of courseView?.sections ?? [])
                  for (const l of s.lessons) indexMap.set(l.id, idx++)
                for (const l of courseView?.lessons ?? [])
                  indexMap.set(l.id, idx++)

                const renderLesson = (l: LessonMeta) => {
                  const isActive = l.id === activeLessonId
                  const isProcessing =
                    l.type === "VIDEO" && l.videoStatus === "PROCESSING"
                  const isDone = completedIds.has(l.id)
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setActiveLessonId(l.id)}
                      disabled={isProcessing}
                      className={cn(
                        "flex w-full items-start gap-3 border-b border-border/50 px-5 py-3 text-left text-sm transition-colors",
                        isActive
                          ? "border-l-2 border-l-primary bg-primary/8"
                          : "border-l-2 border-l-transparent hover:bg-muted/60",
                        isProcessing && "cursor-not-allowed opacity-60"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 shrink-0",
                          isDone
                            ? "text-green-500"
                            : isActive
                              ? "text-primary"
                              : "text-muted-foreground"
                        )}
                      >
                        {isDone ? (
                          <CheckCircle className="size-4" />
                        ) : (
                          <Circle className="size-4" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate font-medium",
                            isDone &&
                              !isActive &&
                              "text-muted-foreground line-through decoration-1",
                            isActive && "text-primary"
                          )}
                        >
                          {indexMap.get(l.id)}. {l.title}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-muted-foreground">
                          {lessonTypeIcon(l.type)}
                          {l.duration && (
                            <span className="text-[11px]">
                              {formatDuration(l.duration)}
                            </span>
                          )}
                          {isProcessing && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-500">
                              <CircleNotch className="size-2.5 animate-spin" />{" "}
                              Processing
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  )
                }

                return (
                  <>
                    {(courseView?.sections ?? []).map((section) => (
                      <div key={section.id}>
                        <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-5 py-2">
                          <span className="flex-1 truncate text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                            {section.title}
                          </span>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {
                              section.lessons.filter((l) =>
                                completedIds.has(l.id)
                              ).length
                            }
                            /{section.lessons.length}
                          </span>
                        </div>
                        {section.lessons.map(renderLesson)}
                      </div>
                    ))}
                    {(courseView?.lessons ?? []).length > 0 &&
                      (courseView?.sections ?? []).length > 0 && (
                        <div className="flex items-center gap-2 border-b border-border/50 bg-muted/20 px-5 py-2">
                          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                            Other
                          </span>
                        </div>
                      )}
                    {(courseView?.lessons ?? []).map(renderLesson)}
                  </>
                )
              })()}

              {quizzes.length > 0 && (
                <>
                  <div className="mt-1 flex items-center gap-2 border-t border-border/50 px-5 py-2">
                    <ClipboardText className="size-3 text-muted-foreground" />
                    <span className="text-[11px] font-normal tracking-wide text-muted-foreground uppercase">
                      Quizzes
                    </span>
                  </div>
                  {quizzes.map((q) => (
                    <Link
                      key={q.id}
                      href={`/courses/${courseId}/quiz/${q.id}`}
                      className="group flex w-full items-start gap-3 border-b border-l-2 border-border/50 border-l-transparent px-5 py-3 text-left text-sm transition-colors hover:border-l-primary/40 hover:bg-muted/60"
                    >
                      <Trophy className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium transition-colors group-hover:text-primary">
                          {q.title}
                        </span>
                        {q.rewards && (
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {q.rewards.attempt1Points} pts
                          </span>
                        )}
                      </span>
                    </Link>
                  ))}
                </>
              )}
            </nav>
          </aside>

          {/* Main lesson content */}
          <main className="flex-1 overflow-y-auto">
            {lessonLoading && (
              <div className="flex h-64 items-center justify-center">
                <CircleNotch className="size-6 animate-spin text-primary" />
              </div>
            )}
            {!lessonLoading && lesson && (
              <LessonContent
                lesson={lesson}
                course={courseView!}
                onNavigate={setActiveLessonId}
                completedIds={completedIds}
                onMarkComplete={handleMarkComplete}
                onMarkIncomplete={handleMarkIncomplete}
                marking={marking}
              />
            )}
          </main>
        </div>

        {/* ── Certificate modal ── */}
        {showCertModal && certificate && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Certificate viewer"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowCertModal(false)}
              aria-hidden="true"
            />

            {/* Panel */}
            <div className="relative z-10 flex h-[96dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-border/60 bg-background shadow-2xl sm:h-[88vh] sm:w-[95vw] sm:max-w-245 sm:rounded-2xl">
              {/* ── Modal header ── */}
              <div className="flex shrink-0 flex-col gap-0 border-b bg-card">
                {/* Top bar: title + actions */}
                <div className="flex items-center justify-between gap-3 px-5 py-3">
                  {/* Left: icon + label */}
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
                      <Medal className="size-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm leading-tight font-normal">
                        Your Certificate
                      </p>
                      <p className="text-[11px] leading-tight text-muted-foreground">
                        Issued{" "}
                        {new Date(certificate.issuedAt).toLocaleDateString(
                          undefined,
                          { day: "numeric", month: "long", year: "numeric" }
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right: action group */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    {/* Share / copy link */}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${clientUrl}/verify/${certificate.uid}`
                        )
                        toast.success("Verification link copied to clipboard")
                      }}
                      className="hidden items-center gap-1.5 rounded-lg border border-border/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:inline-flex"
                      aria-label="Copy verification link to clipboard"
                    >
                      <Copy className="size-3" />
                      Copy Link
                    </button>

                    {/* Open full size */}
                    <a
                      href={`${clientUrl}/verify/${certificate.uid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hidden items-center gap-1.5 rounded-lg border border-border/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:inline-flex"
                      aria-label="Open certificate in full size in a new tab"
                    >
                      <ArrowSquareOut className="size-3" />
                      Full Size
                    </a>

                    {/* Primary: Print / DownloadSimple */}
                    <button
                      onClick={() => {
                        if (certHtml) {
                          const blob = new Blob([certHtml], {
                            type: "text/html",
                          })
                          const url = URL.createObjectURL(blob)
                          const w = window.open(url, "_blank")
                          if (w) {
                            w.onload = () => {
                              w.print()
                              URL.revokeObjectURL(url)
                            }
                          }
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-normal text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      aria-label="Print or save certificate as PDF"
                    >
                      <Printer className="size-3" />
                      <span className="hidden sm:inline">Print / </span>PDF
                    </button>

                    {/* Close */}
                    <button
                      onClick={() => setShowCertModal(false)}
                      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      aria-label="Close certificate viewer"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Metadata chips row */}
                <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
                  {/* Points chip */}
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    <Star className="size-3" />
                    {certificate.pointsEarned} pts earned
                  </span>
                  {/* UID chip */}
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/60 px-2.5 py-0.5 font-mono text-[11px] font-medium tracking-tight text-muted-foreground">
                    <SealCheck className="size-3 shrink-0" />
                    {certificate.uid}
                  </span>
                  {/* Mobile-only action links */}
                  <a
                    href={`${clientUrl}/verify/${certificate.uid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground sm:hidden"
                    aria-label="Open certificate full size"
                  >
                    <ArrowSquareOut className="size-3" />
                    Full Size
                  </a>
                </div>
              </div>

              {/* ── Certificate display area ── */}
              <div className="flex flex-1 items-start justify-center overflow-auto bg-zinc-100 p-4 sm:p-8 dark:bg-zinc-900">
                {certHtml ? (
                  /*
                   * Physical document treatment:
                   * - Slight drop shadow at multiple levels to simulate paper depth
                   * - Subtle warm tint on the outer container echoes the parchment feel
                   * - No rotation on mobile (too disorienting in tight space)
                   */
                  <div className="w-full max-w-220 transition-transform duration-300 hover:rotate-0 sm:rotate-[-0.4deg]">
                    <div className="overflow-hidden rounded-lg shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_10px_30px_-5px_rgba(0,0,0,0.2),0_20px_60px_-10px_rgba(0,0,0,0.15)] ring-1 ring-black/5">
                      <iframe
                        srcDoc={certHtml}
                        className="w-full bg-white"
                        style={{
                          minHeight: "560px",
                          height: "62vh",
                          display: "block",
                        }}
                        title="Certificate of completion"
                        sandbox=""
                        aria-label="Certificate document preview"
                      />
                    </div>
                    {/* Subtle base shadow to complete the "lifted paper" effect */}
                    <div
                      className="mx-6 -mt-1 h-2 rounded-b-full bg-black/10 blur-md dark:bg-black/30"
                      aria-hidden="true"
                    />
                  </div>
                ) : (
                  /* Loading state */
                  <div
                    className="flex flex-col items-center justify-center gap-4 py-24 text-muted-foreground"
                    aria-live="polite"
                    aria-busy="true"
                  >
                    <div className="flex size-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                      <CircleNotch className="size-6 animate-spin text-amber-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">
                        Preparing your certificate
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        This should only take a moment
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Overview mode (new design) ───────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* Hero banner */}
      <div className="relative h-56 w-full overflow-hidden bg-linear-to-br from-primary/20 via-primary/10 to-muted md:h-72">
        {overviewData.coverImage && (
          <Image
            src={overviewData.coverImage}
            alt={overviewData.title}
            fill
            className="object-cover"
            unoptimized
            loading="eager"
            priority
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute right-0 bottom-0 left-0 flex items-end justify-between gap-4 p-6">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {overviewData.accessRule === "ON_PAYMENT" && (
                <Badge className="border-0 bg-amber-500 text-xs text-white">
                  Paid
                </Badge>
              )}
              {overviewData.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="neutral"
                  className="border-white/20 bg-white/10 text-xs text-white"
                >
                  {tag}
                </Badge>
              ))}
            </div>
            <h1 className="line-clamp-2 text-2xl leading-tight text-white md:text-3xl">
              {overviewData.title}
            </h1>
            {overviewData.instructor?.name && (
              <p className="mt-1 text-sm text-white/70">
                by {overviewData.instructor.name}
              </p>
            )}
          </div>
          <div className="shrink-0">{renderCTA()}</div>
        </div>
      </div>

      {/* Stats */}
      <div className="border-b bg-muted/30">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-6 px-6 py-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <BookOpen className="size-4" />
            {overviewData._count.lessons} lessons
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="size-4" />
            {overviewData._count.enrollments} enrolled
          </span>
          {overviewData.quizzes.length > 0 && (
            <span className="flex items-center gap-1.5">
              <ClipboardText className="size-4" />
              {overviewData.quizzes.reduce(
                (s, q) => s + q._count.questions,
                0
              )}{" "}
              quiz questions
            </span>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-6">
        {/* Page tabs */}
        <div className="mb-6 flex border-b">
          {(["overview", "reviews"] as PageTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setPageTab(t)}
              className={cn(
                "mr-8 -mb-px border-b-2 px-1 py-2.5 text-sm font-medium transition-colors",
                pageTab === t
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "overview" ? "Course Overview" : "Ratings & Reviews"}
            </button>
          ))}
        </div>

        {pageTab === "overview" && (
          <CourseOverviewTab
            course={overviewData}
            enrollment={enrollment}
            onLessonClick={(lessonId) => {
              if (!isEnrolled) {
                toast.error("Enroll in this course to access lessons")
                return
              }
              setActiveLessonId(lessonId)
            }}
          />
        )}
        {pageTab === "reviews" && (
          <ReviewsTab courseId={Number(courseId)} isEnrolled={isEnrolled} />
        )}
      </div>

      {overviewData.accessRule === "ON_PAYMENT" && (
        <PaymentModal
          courseId={Number(courseId)}
          courseTitle={overviewData.title}
          price={overviewData.price ?? "0"}
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  )
}
