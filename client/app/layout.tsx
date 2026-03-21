/**
 * Root Layout — Learnova by Qubits / Academic Minimal Design System
 *
 * Font strategy:
 *   Matter (Regular 400, Medium 500, SemiBold 600) — body, UI, labels
 *   SeasonMix (Regular 400, Medium 500) — display headings (h1, h2)
 *   Two typefaces max per Academic Minimal principle.
 *   Bold (700) is avoided unless absolutely necessary — the typefaces carry weight through design.
 *
 * ThemeProvider wraps everything for dark mode support.
 * skip-to-content link ensures keyboard accessibility at page top.
 */
import localFont from "next/font/local"
import type { Metadata } from "next"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { AuthProvider } from "@/hooks/useAuth"
import { Toaster } from "sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

/* Matter: primary type — body text, UI chrome, labels, sub-headings */
const matter = localFont({
  src: [
    { path: "../fonts/MatterRegular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/MatterMedium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/MatterSemiBold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-matter",
  display: "swap",
})

/* SeasonMix: display type — h1 and h2 headings only */
const seasonMix = localFont({
  src: [
    { path: "../fonts/SeasonMix-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/SeasonMix-Medium.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-season",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "Learnova — Learn Smarter, Build Faster",
    template: "%s | Learnova",
  },
  description:
    "Learnova by Qubits — a full-stack eLearning platform with course management, progress tracking, quizzes, and gamification built for the modern learner.",
  keywords: ["Learnova", "Qubits", "learning", "edtech", "Odoo", "courses", "education"],
  openGraph: {
    title: "Learnova — Learn Smarter, Build Faster",
    description:
      "Learnova by Qubits — a focused eLearning platform that tracks your progress, surfaces completion states, and rewards learning momentum.",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        matter.variable,
        seasonMix.variable,
      )}
    >
      <body>
        {/* Skip to main content — WCAG 2.4.1, visible on focus */}
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>

        <ThemeProvider>
          <AuthProvider>
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </AuthProvider>
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
