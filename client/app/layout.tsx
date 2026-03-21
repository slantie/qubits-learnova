/**
 * Root Layout — Qubits AI / Academic Minimal Design System
 *
 * Font strategy: Inter for all UI and body copy. Geist Mono for code snippets.
 * Two typefaces max per Academic Minimal principle.
 *
 * ThemeProvider wraps everything for dark mode support.
 * skip-to-content link ensures keyboard accessibility at page top.
 */
import { Inter, Geist_Mono } from "next/font/google"
import type { Metadata } from "next"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

/* Inter: primary type — body, headings, UI labels */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  // Preload only the weights we actually use to keep initial load fast
  weight: ["400", "500", "600", "700"],
})

/* Geist Mono: code blocks, terminal snippets, keyboard shortcuts */
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "Qubits AI — Learn Smarter, Build Faster",
    template: "%s | Qubits AI",
  },
  description:
    "An AI-powered learning platform that connects your knowledge, tracks your progress, and accelerates how you build and understand software.",
  keywords: ["AI", "learning", "edtech", "Odoo", "productivity", "education"],
  openGraph: {
    title: "Qubits AI — Learn Smarter, Build Faster",
    description:
      "An AI-powered learning platform that connects your knowledge, tracks your progress, and accelerates how you build.",
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
        inter.variable,
        geistMono.variable,
      )}
    >
      <body>
        {/* Skip to main content — WCAG 2.4.1, visible on focus */}
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>

        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
