/**
 * Badge — Academic Minimal semantic status indicators
 *
 * Semantic colors are locked to meaning — never use for decoration:
 *   success (green)  = complete / correct
 *   warning (amber)  = in-progress / needs attention
 *   error   (red)    = blocked / failed
 *   info    (blue)   = informational
 *   neutral (slate)  = tags / labels without semantic meaning
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
  success: "am-badge am-badge-success",
  warning: "am-badge am-badge-warning",
  error:   "am-badge am-badge-error",
  info:    "am-badge am-badge-info",
  neutral: "am-badge am-badge-neutral",
  primary: "am-badge",
}

const primaryStyle = {
  background: "rgb(79 70 229 / 0.1)",
  color: "var(--primary)",
}

export function Badge({ variant = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(variantClasses[variant], className)}
      style={variant === "primary" ? primaryStyle : undefined}
    >
      {children}
    </span>
  )
}
