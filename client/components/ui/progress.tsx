/**
 * ProgressBar — Academic Minimal
 *
 * Progress indicators are first-class citizens in edtech UI.
 * Thin (4–6px), indigo fill, always shows completion percentage.
 * Fully accessible with aria-valuenow/min/max and role="progressbar".
 *
 * Usage:
 *   <ProgressBar value={65} label="Module 3 of 5" />
 */

interface ProgressBarProps {
  /** 0–100 percent complete */
  value: number
  /** Accessible label describing what is being measured */
  label?: string
  /** Visual size variant: "sm" = 4px, "default" = 6px */
  size?: "sm" | "default"
  /** Optional className override on the track */
  className?: string
}

export function ProgressBar({
  value,
  label,
  size = "default",
  className,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))
  const height = size === "sm" ? "4px" : "6px"

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `${clamped}% complete`}
      className={className}
      style={{
        height,
        background: "var(--muted)",
        borderRadius: "9999px",
        overflow: "hidden",
        width: "100%",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${clamped}%`,
          background: "var(--primary)",
          borderRadius: "9999px",
          transition: "width 400ms ease",
        }}
      />
    </div>
  )
}

/**
 * CircleProgress — ring variant for overall completion ratios on dashboards
 *
 * Usage:
 *   <CircleProgress value={72} size={56} />
 */
interface CircleProgressProps {
  value: number
  size?: number
  strokeWidth?: number
  label?: string
  className?: string
}

export function CircleProgress({
  value,
  size = 48,
  strokeWidth = 4,
  label,
  className,
}: CircleProgressProps) {
  const clamped = Math.min(100, Math.max(0, value))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label={label ?? `${clamped}% complete`}
      role="img"
      className={className}
      style={{ transform: "rotate(-90deg)" }}
    >
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--muted)"
        strokeWidth={strokeWidth}
      />
      {/* Fill */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 500ms ease" }}
      />
    </svg>
  )
}
