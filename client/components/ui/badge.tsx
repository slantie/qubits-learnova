/**
 * Badge — semantic status chips
 *
 * Semantic colors are locked to meaning — never use for decoration:
 *   success (green)  = complete / correct
 *   warning (amber)  = in-progress / needs attention
 *   error   (red)    = blocked / failed
 *   info    (blue)   = informational
 *   neutral (slate)  = tags / labels without semantic meaning
 *   primary (teal)   = brand accent
 *
 * Usage:
 *   <Badge variant="success">Complete</Badge>
 *   <Badge variant="warning">In Progress</Badge>
 */

import { cn } from "@/lib/utils"

type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral" | "primary"

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  success: "bg-primary/15 text-primary border-primary/25 dark:bg-primary/25 dark:text-primary dark:border-primary/35",
  warning: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50",
  error:   "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50",
  info:    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/50",
  neutral: "bg-muted text-muted-foreground border-border",
  primary: "bg-primary/15 text-primary border-primary/25",
}

export function Badge({ variant = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-normal shadow-xs whitespace-nowrap",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
