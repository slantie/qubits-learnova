"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

/* ─── Tiny inline SVG icons (no extra dep) ──────────────────────────────────── */
function IconZap({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}
function IconBrain({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2a2.5 2.5 0 0 1 5 0v.5" />
      <path d="M14.5 2.5A4.5 4.5 0 0 1 19 7c0 1.3-.55 2.47-1.43 3.3" />
      <path d="M9.5 2.5A4.5 4.5 0 0 0 5 7c0 1.3.55 2.47 1.43 3.3" />
      <path d="M6.43 10.3A4 4 0 0 0 5 13.5C5 15.98 7.02 18 9.5 18H10" />
      <path d="M17.57 10.3A4 4 0 0 1 19 13.5c0 2.48-2.02 4.5-4.5 4.5H14" />
      <path d="M10 18v3" />
      <path d="M14 18v3" />
      <path d="M10 21h4" />
    </svg>
  )
}
function IconCode({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  )
}
function IconShield({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}
function IconRocket({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  )
}
function IconArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}
function IconGithub({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}
function IconMoon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}
function IconSun({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

/* ─── Theme toggle button ────────────────────────────────────────────────────── */
function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) {
    return (
      <button
        className="nb-btn-ghost w-11 h-11 flex items-center justify-center"
        aria-label="Toggle theme"
      >
        <span className="w-5 h-5" />
      </button>
    )
  }

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="nb-btn-ghost w-11 h-11 flex items-center justify-center"
      aria-label="Toggle theme"
    >
      {resolvedTheme === "dark"
        ? <IconSun className="w-5 h-5" />
        : <IconMoon className="w-5 h-5" />
      }
    </button>
  )
}

/* ─── Nav ────────────────────────────────────────────────────────────────────── */
function Nav() {
  return (
    <nav className="sticky top-0 z-50 bg-background nb-divider" style={{ borderTop: "none" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Wordmark */}
        <div className="flex items-center gap-2">
          <span
            className="font-black text-2xl tracking-tighter leading-none select-none"
            style={{ letterSpacing: "-0.04em" }}
          >
            QUBITS
          </span>
          <span
            className="nb-badge text-[10px] uppercase tracking-widest"
            style={{ background: "#FFE500", color: "#0A0A0A", border: "2px solid #0A0A0A" }}
          >
            Beta
          </span>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="nb-btn-ghost w-11 h-11 flex items-center justify-center"
            aria-label="GitHub"
          >
            <IconGithub className="w-5 h-5" />
          </a>
          <ThemeToggle />
          <button
            className="nb-btn-primary px-5 py-2.5 text-sm hidden sm:inline-flex items-center gap-2"
            onClick={() => document.getElementById("cta")?.scrollIntoView({ behavior: "smooth" })}
          >
            Get Started
            <IconArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="nb-divider" />
    </nav>
  )
}

/* ─── Ticker strip ───────────────────────────────────────────────────────────── */
const TICKER_ITEMS = [
  "Next.js 15", "TypeScript", "Shadcn/UI", "Tailwind CSS", "Hackathon 2026",
  "AI-Powered", "Open Source", "Fast by Default", "Odoo Integration", "GVP",
  "Next.js 15", "TypeScript", "Shadcn/UI", "Tailwind CSS", "Hackathon 2026",
  "AI-Powered", "Open Source", "Fast by Default", "Odoo Integration", "GVP",
]

function Ticker() {
  return (
    <div className="nb-ticker py-3" style={{ background: "#FFE500", borderColor: "#0A0A0A" }}>
      <div className="nb-ticker-inner">
        {TICKER_ITEMS.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-4 font-black text-sm uppercase tracking-widest text-black px-6"
          >
            {item}
            <span className="text-lg leading-none">+</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/* ─── Hero ───────────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 md:pt-28 md:pb-24">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left: copy */}
        <div className="space-y-8">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-3">
            <span
              className="nb-badge"
              style={{ background: "#0A0A0A", color: "#FFE500", borderColor: "#0A0A0A" }}
            >
              <IconZap className="w-3 h-3" />
              Hackathon Project 2026
            </span>
          </div>

          {/* Headline */}
          <h1
            className="font-black leading-[0.95] tracking-tighter text-5xl sm:text-6xl md:text-7xl"
            style={{ letterSpacing: "-0.03em" }}
          >
            Think
            {" "}
            <span className="nb-highlight">Faster.</span>
            <br />
            Build
            {" "}
            <span className="nb-highlight">Smarter.</span>
            <br />
            Ship
            {" "}
            <span className="nb-highlight">Qubits.</span>
          </h1>

          {/* Sub-copy */}
          <p className="text-base sm:text-lg font-medium leading-relaxed max-w-md" style={{ color: "var(--muted-foreground)" }}>
            The AI-native productivity platform built for developers who refuse to slow down.
            Connects your entire stack — from Odoo to your IDE — in one brutal, fast interface.
          </p>

          {/* CTA row */}
          <div id="cta" className="flex flex-col sm:flex-row gap-4 pt-2">
            <button className="nb-btn-primary px-8 py-4 text-base flex items-center justify-center gap-2">
              <IconRocket className="w-5 h-5" />
              Launch the App
            </button>
            <button className="nb-btn-ghost px-8 py-4 text-base flex items-center justify-center gap-2">
              <IconGithub className="w-5 h-5" />
              View on GitHub
            </button>
          </div>

          {/* Social proof micro-text */}
          <p className="text-xs font-mono" style={{ color: "var(--muted-foreground)" }}>
            Press{" "}
            <kbd
              className="nb-badge text-[10px] font-mono px-1.5 py-0.5"
              style={{ background: "transparent" }}
            >
              D
            </kbd>
            {" "}to toggle dark mode
          </p>
        </div>

        {/* Right: brutal visual card */}
        <div className="relative flex items-center justify-center lg:justify-end">
          {/* Offset background block */}
          <div
            className="absolute inset-0 translate-x-4 translate-y-4 dark:hidden"
            style={{ background: "#FFE500", border: "3px solid #0A0A0A" }}
          />
          <div
            className="absolute inset-0 translate-x-4 translate-y-4 hidden dark:block"
            style={{ background: "#FFE500", border: "3px solid #FAFAFA" }}
          />

          {/* Main terminal card */}
          <div
            className="relative w-full max-w-md nb-border-thick bg-background"
            style={{ boxShadow: "none" }}
          >
            {/* Terminal header bar */}
            <div
              className="flex items-center gap-2 px-4 py-3"
              style={{ background: "#0A0A0A", borderBottom: "2px solid #0A0A0A" }}
            >
              <span className="w-3 h-3 rounded-full" style={{ background: "#FF2D78" }} />
              <span className="w-3 h-3 rounded-full" style={{ background: "#FFE500" }} />
              <span className="w-3 h-3 rounded-full" style={{ background: "#00E87A" }} />
              <span className="ml-3 text-xs font-mono text-white/60">qubits ~ ai-shell</span>
            </div>

            {/* Terminal body */}
            <div className="p-5 font-mono text-sm space-y-3" style={{ background: "#0F0F0F", minHeight: "260px" }}>
              <div>
                <span style={{ color: "#00E87A" }}>$ </span>
                <span style={{ color: "#FAFAFA" }}>qubits analyze --module erp</span>
              </div>
              <div style={{ color: "#888" }}>
                <span style={{ color: "#FFE500" }}>⚡ </span>
                Scanning 847 records...
              </div>
              <div style={{ color: "#888" }}>
                <span style={{ color: "#0066FF" }}>→ </span>
                AI insights ready in 420ms
              </div>
              <div
                className="p-3 mt-2"
                style={{ background: "#1A1A1A", border: "1px solid #FFE500" }}
              >
                <p style={{ color: "#FFE500" }} className="font-bold text-xs mb-1">ANOMALY DETECTED</p>
                <p style={{ color: "#FAFAFA" }} className="text-xs leading-relaxed">
                  Invoice #INV-2847 flagged: vendor terms mismatch detected across 12 linked POs.
                </p>
              </div>
              <div>
                <span style={{ color: "#00E87A" }}>$ </span>
                <span style={{ color: "#FAFAFA" }}>qubits fix --auto</span>
                <span className="inline-block w-2 h-4 ml-1 align-middle animate-pulse" style={{ background: "#FAFAFA" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── Features ───────────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: <IconBrain className="w-7 h-7" />,
    accent: "#FF2D78",
    label: "AI Core",
    title: "Context-aware intelligence",
    body: "Qubits understands your data model, your team's patterns, and your business logic. Not just generic LLM outputs — trained on your stack.",
  },
  {
    icon: <IconCode className="w-7 h-7" />,
    accent: "#0066FF",
    label: "Dev Native",
    title: "Built for engineers first",
    body: "CLI, REST API, and IDE extension. No dashboards you'll never use. Every action is scriptable, composable, and automatable.",
  },
  {
    icon: <IconShield className="w-7 h-7" />,
    accent: "#00E87A",
    label: "Secure",
    title: "Your data stays yours",
    body: "On-prem deployment, end-to-end encryption, zero data retention on inference. Compliance-ready out of the box.",
  },
  {
    icon: <IconZap className="w-7 h-7" />,
    accent: "#FF6B00",
    label: "Fast",
    title: "Sub-500ms responses",
    body: "Edge-deployed inference layer with smart caching. When you're in flow, latency is not an option.",
  },
]

function Features() {
  return (
    <section className="nb-divider" style={{ borderTop: "3px solid" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-14">
          <h2
            className="font-black text-4xl sm:text-5xl leading-none tracking-tighter"
            style={{ letterSpacing: "-0.03em" }}
          >
            Why Qubits
            <br />
            <span className="nb-highlight">hits different.</span>
          </h2>
          <p className="text-sm font-medium max-w-xs" style={{ color: "var(--muted-foreground)" }}>
            Four reasons engineers choose Qubits over every other AI tool.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="nb-card p-6 space-y-4 bg-background cursor-default"
            >
              {/* Icon block */}
              <div
                className="w-14 h-14 flex items-center justify-center nb-border"
                style={{ background: f.accent, color: "#0A0A0A" }}
              >
                {f.icon}
              </div>

              {/* Label */}
              <span
                className="nb-badge"
                style={{ background: "transparent", borderColor: f.accent, color: f.accent }}
              >
                {f.label}
              </span>

              <h3 className="font-black text-lg leading-snug">{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Stats bar ──────────────────────────────────────────────────────────────── */
const STATS = [
  { value: "420ms", label: "Avg. response time" },
  { value: "99.9%", label: "Uptime SLA" },
  { value: "10k+", label: "API calls / day" },
  { value: "Zero", label: "Data retained" },
]

function Stats() {
  return (
    <div style={{ background: "#0A0A0A", borderTop: "3px solid #0A0A0A", borderBottom: "3px solid #0A0A0A" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <div key={i} className="text-center space-y-1">
              <p
                className="font-black text-4xl sm:text-5xl leading-none tracking-tighter"
                style={{ color: "#FFE500", letterSpacing: "-0.04em" }}
              >
                {s.value}
              </p>
              <p className="text-xs font-bold uppercase tracking-widest text-white/60">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Tech stack badges ──────────────────────────────────────────────────────── */
const STACK = [
  { name: "Next.js 15", color: "#FAFAFA", bg: "#0A0A0A" },
  { name: "TypeScript", color: "#0A0A0A", bg: "#3178C6" },
  { name: "Tailwind CSS", color: "#0A0A0A", bg: "#06B6D4" },
  { name: "Shadcn/UI", color: "#FAFAFA", bg: "#0A0A0A" },
  { name: "Python", color: "#0A0A0A", bg: "#FFE500" },
  { name: "FastAPI", color: "#0A0A0A", bg: "#00E87A" },
  { name: "Odoo 17", color: "#FAFAFA", bg: "#714B67" },
  { name: "PostgreSQL", color: "#FAFAFA", bg: "#336791" },
  { name: "Redis", color: "#FAFAFA", bg: "#DC382D" },
  { name: "Docker", color: "#FAFAFA", bg: "#0066FF" },
]

function TechStack() {
  return (
    <section style={{ borderTop: "3px solid" }} className="nb-divider">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <h2
          className="font-black text-4xl sm:text-5xl leading-none tracking-tighter mb-12 text-center"
          style={{ letterSpacing: "-0.03em" }}
        >
          The Stack
        </h2>
        <div className="flex flex-wrap gap-4 justify-center">
          {STACK.map((tech, i) => (
            <span
              key={i}
              className="nb-badge text-sm font-black px-5 py-3"
              style={{
                background: tech.bg,
                color: tech.color,
                border: `2px solid ${tech.bg === "#FAFAFA" || tech.bg === "#0A0A0A" ? "#0A0A0A" : tech.bg}`,
                boxShadow: "3px 3px 0px #0A0A0A",
              }}
            >
              {tech.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── CTA Banner ─────────────────────────────────────────────────────────────── */
function CTABanner() {
  return (
    <section style={{ borderTop: "3px solid #0A0A0A", background: "#FFE500" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <h2
            className="font-black text-4xl sm:text-5xl md:text-6xl leading-none tracking-tighter text-black"
            style={{ letterSpacing: "-0.03em" }}
          >
            Ready to
            <br />
            go quantum?
          </h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              className="px-8 py-4 font-black text-base text-yellow-400 flex items-center justify-center gap-2"
              style={{
                background: "#0A0A0A",
                border: "3px solid #0A0A0A",
                boxShadow: "5px 5px 0px rgba(0,0,0,0.3)",
                transition: "box-shadow 120ms ease, transform 120ms ease",
                cursor: "pointer",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "2px 2px 0px rgba(0,0,0,0.3)"
                ;(e.currentTarget as HTMLButtonElement).style.transform = "translate(2px,2px)"
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "5px 5px 0px rgba(0,0,0,0.3)"
                ;(e.currentTarget as HTMLButtonElement).style.transform = ""
              }}
            >
              <IconRocket className="w-5 h-5" />
              Launch Qubits
            </button>
            <button
              className="px-8 py-4 font-black text-base text-black flex items-center justify-center gap-2"
              style={{
                background: "transparent",
                border: "3px solid #0A0A0A",
                boxShadow: "5px 5px 0px rgba(0,0,0,0.3)",
                transition: "box-shadow 120ms ease, transform 120ms ease",
                cursor: "pointer",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "2px 2px 0px rgba(0,0,0,0.3)"
                ;(e.currentTarget as HTMLButtonElement).style.transform = "translate(2px,2px)"
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "5px 5px 0px rgba(0,0,0,0.3)"
                ;(e.currentTarget as HTMLButtonElement).style.transform = ""
              }}
            >
              <IconGithub className="w-5 h-5" />
              Star on GitHub
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── Footer ─────────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer style={{ borderTop: "3px solid #0A0A0A", background: "#0A0A0A", color: "#FAFAFA" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          {/* Brand */}
          <div className="space-y-1">
            <p className="font-black text-xl tracking-tighter" style={{ letterSpacing: "-0.04em" }}>
              QUBITS
            </p>
            <p className="text-xs font-mono" style={{ color: "#888" }}>
              Built with brutality at Hackathon 2026
            </p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-xs font-bold uppercase tracking-widest">
            <a href="#" className="hover:text-yellow-400 transition-colors">Docs</a>
            <a href="#" className="hover:text-yellow-400 transition-colors">API</a>
            <a href="#" className="hover:text-yellow-400 transition-colors">GitHub</a>
          </div>
        </div>

        <div
          className="mt-8 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
        >
          <p className="text-xs font-mono" style={{ color: "#555" }}>
            &copy; 2026 Qubits. MIT License.
          </p>
          <p className="text-xs font-mono" style={{ color: "#555" }}>
            Press{" "}
            <kbd
              className="px-1 py-0.5 font-mono text-xs"
              style={{ border: "1px solid #333", background: "#1A1A1A", color: "#FAFAFA" }}
            >
              D
            </kbd>
            {" "}to toggle dark mode
          </p>
        </div>
      </div>
    </footer>
  )
}

/* ─── Page root ──────────────────────────────────────────────────────────────── */
export default function Page() {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <Ticker />
      <main className="flex-1">
        <Hero />
        <Features />
        <Stats />
        <TechStack />
        <CTABanner />
      </main>
      <Footer />
    </div>
  )
}
