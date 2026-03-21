/**
 * Button — Academic Minimal variant
 *
 * Design decisions:
 *   - One primary action per screen: solid indigo fill
 *   - Secondary actions: outline or ghost — never compete with primary CTA
 *   - Destructive: always red, isolated visually
 *   - All heights target 44px touch target minimum on mobile
 *   - Focus rings always visible — outline: none is banned
 *   - Transitions: 150ms ease for opacity/transform only (purposeful motion)
 *
 * Note on ButtonAnchor:
 *   @base-ui/react/button does not support Radix-style asChild.
 *   For <a>-wrapped CTAs use the ButtonAnchor export instead, which applies
 *   identical visual styles to a native <a> element.
 */
"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

export const buttonVariants = cva(
  // Base: shared across all variants
  [
    "inline-flex shrink-0 items-center justify-center gap-2",
    "rounded-md font-medium text-sm whitespace-nowrap",
    "border border-transparent",
    "transition-all duration-150 ease-out",
    // Focus ring — never suppressed
    "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    // Disabled
    "disabled:pointer-events-none disabled:opacity-40",
    // Icon sizing
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        // Primary: indigo fill — use once per screen as the dominant CTA
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 active:scale-[0.98]",

        // Secondary: subtle background — second-tier actions
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]",

        // Outline: bordered, transparent fill — tertiary controls
        outline:
          "border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",

        // Ghost: invisible until hover — used in toolbars, nav
        ghost:
          "text-foreground hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",

        // Link: text-only, indigo color, underlines on hover
        link:
          "text-primary underline-offset-4 hover:underline p-0 h-auto",

        // Destructive: red — always requires confirmation before action
        destructive:
          "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 focus-visible:ring-destructive active:scale-[0.98]",
      },
      size: {
        // All height values target 44px touch target on mobile via padding
        sm:       "h-8 px-3 text-xs rounded-md gap-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        default:  "h-10 px-4",
        lg:       "h-11 px-6 text-base rounded-md",
        // Icon-only buttons — always pair with aria-label or tooltip
        icon:     "size-10 rounded-md",
        "icon-sm": "size-8 rounded-md [&_svg:not([class*='size-'])]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonVariantProps = VariantProps<typeof buttonVariants>

/* ── Button: wraps @base-ui/react ButtonPrimitive ─────────────────────────── */
function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & ButtonVariantProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

/* ── ButtonAnchor: identical styles applied to a native <a> element ───────── */
// Use this when the CTA navigates to a URL (internal or external link).
// Semantically correct: <a> for navigation, <button> for actions.
type ButtonAnchorProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & ButtonVariantProps

function ButtonAnchor({
  className,
  variant = "default",
  size = "default",
  children,
  ...props
}: ButtonAnchorProps) {
  return (
    <a
      data-slot="button"
      className={cn(
        buttonVariants({ variant, size, className }),
        // Anchors need cursor-pointer since they are not buttons
        "cursor-pointer",
      )}
      {...props}
    >
      {children}
    </a>
  )
}

export { Button, ButtonAnchor }
