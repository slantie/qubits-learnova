"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { UserProfile, BadgeStatusItem } from "@/types"
import {
  fetchProfile,
  updateMyProfile,
  uploadMyAvatar,
} from "@/lib/api/learner"
import { fetchBadges } from "@/lib/api/badges"
import { useAuth } from "@/hooks/useAuth"
import { BadgeIcon } from "@/components/badges/BadgeIcon"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Trophy,
  BookOpen,
  CheckCircle,
  CalendarDots,
  Medal,
  PencilSimple,
  Camera,
  FloppyDisk,
  X,
  Eye,
  EyeSlash,
  Link,
} from "@phosphor-icons/react"

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  value,
  label,
  className,
}: {
  icon: React.ReactNode
  value: string | number
  label: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card p-4",
        className
      )}
    >
      <div className="shrink-0">{icon}</div>
      <div>
        <p className="text-xl leading-none font-bold">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

// ─── Avatar circle ─────────────────────────────────────────────────────────────

function Avatar({
  src,
  initials,
  size = 20,
  onUpload,
}: {
  src?: string | null
  initials: string
  size?: number
  onUpload?: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      className={cn("relative rounded-full ring-4 ring-card", `size-${size}`)}
    >
      {src ? (
        <Image
          src={src}
          alt="Avatar"
          fill
          unoptimized
          className="rounded-full object-cover"
        />
      ) : (
        <div
          className={cn(
            "flex size-full items-center justify-center rounded-full bg-primary/15 font-bold text-primary",
            size >= 20 ? "text-2xl" : "text-base"
          )}
        >
          {initials}
        </div>
      )}
      {onUpload && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            title="Change avatar"
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity hover:opacity-100"
          >
            <Camera className="size-6 text-white" />
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            title="Upload avatar image"
            aria-label="Upload avatar image"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onUpload(file)
              e.target.value = ""
            }}
          />
        </>
      )}
    </div>
  )
}

// ─── Profile page ─────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user } = useAuth()
  const router = useRouter()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [badgeList, setBadgeList] = useState<BadgeStatusItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Edit state
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState("")
  const [editBio, setEditBio] = useState("")
  const [editPublic, setEditPublic] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Avatar upload state
  const [avatarUploading, setAvatarUploading] = useState(false)

  useEffect(() => {
    if (user === null) {
      router.replace("/auth/login")
      return
    }
    fetchProfile()
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setIsLoading(false))
  }, [user, router])

  useEffect(() => {
    if (!user) return
    fetchBadges()
      .then((data) => setBadgeList(data.badges))
      .catch(() => setBadgeList([]))
  }, [user])

  const initials = profile?.user.name
    ? profile.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?"

  const memberSince = profile?.user.createdAt
    ? new Date(profile.user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null

  const earnedCount = badgeList.filter((b) => b.earned).length

  function startEdit() {
    if (!profile) return
    setEditName(profile.user.name ?? "")
    setEditBio(profile.user.bio ?? "")
    setEditPublic(profile.user.profilePublic ?? true)
    setSaveError(null)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setSaveError(null)
  }

  async function saveEdit() {
    if (!profile) return
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await updateMyProfile({
        name: editName.trim() || undefined,
        bio: editBio.trim() || "",
        profilePublic: editPublic,
      })
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              user: {
                ...prev.user,
                name: updated.user.name,
                bio: updated.user.bio,
                profilePublic: updated.user.profilePublic,
              },
            }
          : prev
      )
      setEditing(false)
    } catch (err: unknown) {
      const e = err as { data?: { message?: string }; message?: string }
      setSaveError(e?.data?.message ?? e?.message ?? "Failed to save changes.")
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarUpload(file: File) {
    setAvatarUploading(true)
    try {
      const { avatarUrl } = await uploadMyAvatar(file)
      setProfile((prev) =>
        prev ? { ...prev, user: { ...prev.user, avatarUrl } } : prev
      )
    } catch {
      // silently ignore; user can retry
    } finally {
      setAvatarUploading(false)
    }
  }

  const publicProfileUrl = profile ? `/profile/${profile.user.id}` : null

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
        <div className="overflow-hidden rounded-2xl border bg-card">
          <div className="h-28 bg-muted" />
          <div className="-mt-10 space-y-3 px-6 pb-6">
            <Skeleton className="size-20 rounded-full" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!profile) return null

  // ── Page ──────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      {/* Hero card */}
      <div className="overflow-hidden rounded-2xl border bg-card">
        {/* Banner */}
        <div className="h-28 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />

        {/* Profile info */}
        <div className="-mt-10 px-6 pb-6">
          <div className="flex items-end justify-between gap-3">
            {/* Avatar */}
            <div
              className={cn(
                "relative",
                avatarUploading && "pointer-events-none opacity-60"
              )}
            >
              <Avatar
                src={profile.user.avatarUrl}
                initials={initials}
                size={20}
                onUpload={handleAvatarUpload}
              />
              {avatarUploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
                  <span className="size-5 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="mb-1 flex items-center gap-2">
              {publicProfileUrl && (
                <a
                  href={publicProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View public profile"
                  className="flex size-8 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Link className="size-4" />
                </a>
              )}
              {!editing ? (
                <button
                  type="button"
                  onClick={startEdit}
                  title="Edit profile"
                  className="flex size-8 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <PencilSimple className="size-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={cancelEdit}
                  title="Cancel"
                  className="flex size-8 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>

          {/* Name / email / badge */}
          {!editing ? (
            <div className="mt-3">
              <div className="flex flex-wrap items-start gap-3">
                <div>
                  <h1 className="text-xl">{profile.user.name ?? "Learner"}</h1>
                  <p className="text-sm text-muted-foreground">
                    {profile.user.email}
                  </p>
                </div>
                {profile.currentBadge && (
                  <span className="mt-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-normal text-primary">
                    {profile.currentBadge}
                  </span>
                )}
              </div>
              {profile.user.bio && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {profile.user.bio}
                </p>
              )}
              {memberSince && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDots className="size-3.5" />
                  Member since {memberSince}
                </div>
              )}
              {/* Visibility indicator */}
              <div
                className={cn(
                  "mt-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs",
                  profile.user.profilePublic
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                    : "border-border bg-muted/50 text-muted-foreground"
                )}
              >
                {profile.user.profilePublic ? (
                  <Eye className="size-3" />
                ) : (
                  <EyeSlash className="size-3" />
                )}
                {profile.user.profilePublic
                  ? "Public profile"
                  : "Private profile"}
              </div>
            </div>
          ) : (
            /* Edit form */
            <div className="mt-3 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Display name
                </label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Your name"
                  maxLength={100}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Bio
                </label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell others a bit about yourself…"
                  maxLength={300}
                  rows={3}
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                />
                <p className="text-right text-xs text-muted-foreground">
                  {editBio.length}/300
                </p>
              </div>
              {/* Profile visibility toggle */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Public profile</p>
                  <p className="text-xs text-muted-foreground">
                    Allow others to view your profile page
                  </p>
                </div>
                <Button
                  type="button"
                  role="switch"
                  aria-checked={editPublic ? "true" : "false"}
                  title={
                    editPublic ? "Make profile private" : "Make profile public"
                  }
                  onClick={() => setEditPublic((v) => !v)}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                    editPublic ? "bg-primary" : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none block size-4 rounded-full bg-white shadow-lg ring-0 transition-transform",
                      editPublic ? "translate-x-4" : "translate-x-0"
                    )}
                  />
                </Button>
              </div>

              {saveError && (
                <p className="text-xs text-destructive">{saveError}</p>
              )}

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={saveEdit}
                  disabled={saving}
                >
                  <FloppyDisk className="mr-1.5 size-3.5" />
                  {saving ? "Saving…" : "Save changes"}
                </Button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          icon={<Trophy className="size-5 text-amber-500" />}
          value={profile.totalPoints}
          label="Total Points"
          className="col-span-2 sm:col-span-1"
        />
        <StatCard
          icon={<BookOpen className="size-5 text-primary" />}
          value={profile.enrollmentCount}
          label="Courses Enrolled"
        />
        <StatCard
          icon={<CheckCircle className="size-5 text-emerald-500" />}
          value={profile.completedCount}
          label="Completed"
        />
      </div>

      {/* Badges */}
      <div className="space-y-4 rounded-2xl border bg-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Medal className="size-5 text-primary" />
            <h2 className="text-md font-medium">Badges</h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {earnedCount} of {badgeList.length} earned
          </span>
        </div>
        {badgeList.filter((b) => b.earned).length > 0 ? (
          <div className="flex flex-wrap gap-4">
            {badgeList
              .filter((b) => b.earned)
              .map((b) => (
                <BadgeIcon key={b.key} badgeKey={b.key} size="md" showLabel />
              ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No badges earned yet. Complete courses to earn your first badge!
          </p>
        )}
      </div>
    </div>
  )
}
