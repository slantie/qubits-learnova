"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { BadgeStatusItem, BadgeCategory } from "@/types"
import { fetchBadges } from "@/lib/api/badges"
import { BadgeDetail } from "@/components/badges/BadgeDetail"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/useAuth"
import { Medal, Trophy, Star, BookOpen, Heart } from "@phosphor-icons/react"

const CATEGORY_INFO: Record<
  BadgeCategory,
  { label: string; description: string; icon: React.ReactNode; color: string }
> = {
  TIER: {
    label: "Point Tiers",
    description:
      "Unlock tiers by accumulating points from course completions and quizzes",
    icon: <Trophy className="size-6" />,
    color: "from-amber-500 to-orange-600",
  },
  COURSE_MILESTONE: {
    label: "Course Milestones",
    description: "Progress through your learning journey by completing courses",
    icon: <BookOpen className="size-6" />,
    color: "from-blue-500 to-cyan-600",
  },
  QUIZ_EXCELLENCE: {
    label: "Quiz Excellence",
    description: "Master quizzes by achieving perfect scores",
    icon: <Star className="size-6" />,
    color: "from-pink-500 to-rose-600",
  },
  SPEED: {
    label: "Speed",
    description: "Complete courses rapidly after enrollment",
    icon: <Star className="size-6" />,
    color: "from-cyan-500 to-blue-600",
  },
  CERTIFICATION: {
    label: "Certification",
    description: "Earn certificates by completing courses with high scores",
    icon: <Trophy className="size-6" />,
    color: "from-indigo-500 to-purple-600",
  },
  DEDICATION: {
    label: "Dedication",
    description: "Reward your consistency and community participation",
    icon: <Heart className="size-6" />,
    color: "from-green-500 to-emerald-600",
  },
}

const CATEGORY_ORDER: BadgeCategory[] = [
  "TIER",
  "COURSE_MILESTONE",
  "QUIZ_EXCELLENCE",
  "SPEED",
  "CERTIFICATION",
  "DEDICATION",
]

export default function BadgesPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [badges, setBadges] = useState<BadgeStatusItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user === null) {
      router.replace("/auth/login")
      return
    }

    fetchBadges()
      .then((data: { badges: BadgeStatusItem[] }) => setBadges(data.badges))
      .catch(() => setBadges([]))
      .finally(() => setIsLoading(false))
  }, [user, router])

  const earnedCount = badges.filter((b) => b.earned).length
  const totalCount = badges.length

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-12 px-4 py-10">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        {[1, 2].map((cat) => (
          <div key={cat} className="space-y-4">
            <Skeleton className="h-6 w-40" />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((badge) => (
                <Skeleton key={badge} className="h-48 rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-10">
      {/* Header */}
      <div className="space-y-3 border-b border-border pb-8">
        <div className="flex items-center gap-3">
          <Medal className="size-8 text-primary" />
          <h1 className="text-4xl font-bold">Your Badges</h1>
        </div>
        <p className="max-w-2xl text-base text-muted-foreground">
          Earn badges as you progress through your learning journey. Each badge
          represents an achievement, from mastering courses to maintaining
          consistency.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/20 p-3">
              <Trophy className="size-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Badges Earned
              </p>
              <p className="mt-1 text-3xl font-bold text-emerald-600">
                {earnedCount}/{totalCount}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/20 p-3">
              <Star className="size-6 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Completion Rate
              </p>
              <p className="mt-1 text-3xl font-bold text-primary">
                {totalCount > 0
                  ? Math.round((earnedCount / totalCount) * 100)
                  : 0}
                %
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/20 p-3">
              <Heart className="size-6 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Unlockable
              </p>
              <p className="mt-1 text-3xl font-bold text-amber-600">
                {totalCount - earnedCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Badges by Category */}
      <div className="space-y-12">
        {CATEGORY_ORDER.map((category) => {
          const categoryBadges = badges.filter((b) => b.category === category)
          if (categoryBadges.length === 0) return null

          const info = CATEGORY_INFO[category]
          const earnedInCategory = categoryBadges.filter((b) => b.earned).length

          return (
            <div key={category} className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-lg bg-linear-to-br ${info.color} p-3 text-white`}
                  >
                    {info.icon}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{info.label}</h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {info.description}
                    </p>
                  </div>
                </div>
                <div className="ml-12 text-xs font-medium text-muted-foreground">
                  {earnedInCategory} of {categoryBadges.length} earned
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {categoryBadges.map((badge) => (
                  <BadgeDetail key={badge.key} badge={badge} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {badges.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 py-16 text-center">
          <Medal className="mx-auto size-12 text-muted-foreground opacity-50" />
          <h3 className="mt-4 text-lg font-medium">No badges yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Start completing courses and quizzes to earn your first badge!
          </p>
        </div>
      )}
    </div>
  )
}
