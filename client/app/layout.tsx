import localFont from "next/font/local"
import type { Metadata } from "next"
import Script from "next/script"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { AuthProvider } from "@/hooks/useAuth"
import { Toaster } from "sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

const matter = localFont({
  src: [
    { path: "../fonts/MatterRegular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/MatterMedium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/MatterSemiBold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-matter",
  display: "swap",
})

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
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Learnova",
  },
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
        matter.variable,
        seasonMix.variable,
        "antialiased",
      )}
    >
      <head>
        <meta name="theme-color" content="#3d9970" />
        <link rel="apple-touch-icon" href="/learnova.png" />
      </head>
      <body className={cn(matter.className, "antialiased")}>
        <Script
          id="sw-register"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js'); }`,
          }}
        />
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>

        <ThemeProvider>
          <AuthProvider>
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </AuthProvider>
          <Toaster position="bottom-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
