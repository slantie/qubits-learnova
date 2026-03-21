import { Geist_Mono, Inter } from "next/font/google"
import type { Metadata } from "next"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Qubits — Think Faster. Build Smarter.",
  description:
    "The AI-native productivity platform built for developers who refuse to slow down. Connects your entire stack — from Odoo to your IDE — in one brutal, fast interface.",
  keywords: ["AI", "developer tools", "Odoo", "productivity", "hackathon"],
  openGraph: {
    title: "Qubits — Think Faster. Build Smarter.",
    description:
      "The AI-native productivity platform built for developers who refuse to slow down.",
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
        fontMono.variable
      )}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
