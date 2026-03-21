# Learnova — Design System Specification
## Team: Qubits | Academic Minimal

---

## Brand Identity

| Property | Value |
|----------|-------|
| **Product name** | Learnova |
| **Team name** | Qubits |
| **Tagline** | Learn smarter. Build faster. |
| **Event** | Hackathon 2026 — Odoo x GVP |
| **Stack** | Next.js, TypeScript, Tailwind CSS v4, shadcn/ui, @base-ui/react |

---

## Design System: Academic Minimal

North star references: **Notion** (content-first typography), **Linear** (purposeful density, crisp interactions), **Khan Academy** (progress-driven, learner-centered).

---

## Core Design Principles

### 1. Typography-First

Hierarchy is established through font weight and size — never decoration, borders, or background colors alone.

| Level | Size | Weight | Font | Line-height | Notes |
|-------|------|--------|------|-------------|-------|
| Hero H1 | 48px | 500 | SeasonMix Medium | 1.1 | Tracking -0.02em — display type, weight earns itself |
| H1 | 40px | 500 | SeasonMix Medium | 1.1 | Tracking -0.02em |
| H2 | 32px | 500 | SeasonMix Medium | 1.2 | Tracking -0.015em |
| H3 | 24px | 500 | Matter Medium | 1.25 | Sub-headings, card titles |
| H4 | 20px | 500 | Matter Medium | 1.25 | |
| Body | 16px | 400 | Matter Regular | 1.6 | Reading comfort |
| Body large | 18px | 400 | Matter Regular | 1.7 | Hero descriptions |
| Label | 12px | 500 | Matter Medium | — | Uppercase, tracking 0.05em |
| Caption | 13px | 500 | Matter Medium | — | Tracking 0.01em |
| Metric / Stat | any | 600 | Matter SemiBold | — | Numbers only — KPIs, completion %, XP |

**Font files (local, `client/fonts/`):**
| File | Weight | Role |
|------|--------|------|
| `MatterRegular.woff2` | 400 | Body text, paragraphs, descriptions |
| `MatterMedium.woff2` | 500 | UI labels, nav, sub-headings, captions |
| `MatterSemiBold.woff2` | 600 | Metric numbers, KPIs only |
| `SeasonMix-Regular.woff2` | 400 | (available, not typically used) |
| `SeasonMix-Medium.woff2` | 500 | H1 and H2 display headings |

**Bold usage rule:** `font-bold` (700) is **banned** — no file exists, browser will synthesize it badly. Max usable weight: 600 (Matter SemiBold) for numbers, 500 (SeasonMix Medium) for headings. Do not add bold to labels, nav text, card titles, or body copy.

Font stack CSS variables:
- `--font-sans` → `var(--font-matter)` — all body and UI
- `--font-heading` → `var(--font-season), var(--font-matter)` — h1 and h2 only
- `--font-mono` → system monospace fallback (no custom mono file)

---

### 2. Primary Brand Color

**Primary accent: Teal `#007067`**

OKLCH value: `oklch(0.45 0.10 185)` (light mode) / `oklch(0.58 0.12 185)` (dark mode)

The teal accent is a **precision tool**. Use it for:
- Interactive states (buttons, active nav links)
- Progress indicators (bars, rings)
- CTAs — one dominant primary action per screen
- Focus rings and links

**Do NOT** spread teal decoratively across backgrounds, borders, tags, or headings. Every teal pixel must earn its place.

---

### 3. Full Color Token Reference

#### Light Mode (`:root`)

| Token | Value | Purpose |
|-------|-------|---------|
| `--primary` | `oklch(0.45 0.10 185)` | Teal #007067 — CTAs, active, progress |
| `--primary-foreground` | `#FFFFFF` | Text on teal backgrounds |
| `--background` | `#FAFAFA` | Page background (near-white) |
| `--foreground` | `#0F172A` | Body text (slate-900) |
| `--card` | `#FFFFFF` | Card surfaces |
| `--muted` | `#F1F5F9` | Placeholder, disabled, subtle bg |
| `--muted-foreground` | `#64748B` | Secondary text (slate-500) |
| `--border` | `#E2E8F0` | Borders — always subtle |
| `--ring` | `oklch(0.45 0.10 185)` | Focus rings |
| `--destructive` | `#DC2626` | Red-600 — errors only |
| `--success` | `#16A34A` | Green-600 — completion |
| `--warning` | `#D97706` | Amber-600 — in-progress |
| `--info` | `#2563EB` | Blue-600 — informational |

#### Dark Mode (`.dark`)

| Token | Value | Purpose |
|-------|-------|---------|
| `--primary` | `oklch(0.58 0.12 185)` | Lighter teal for dark bg contrast |
| `--background` | `#020617` | Slate-950 |
| `--foreground` | `#F8FAFC` | Near-white |
| `--card` | `#0F172A` | Slate-900 |
| `--border` | `#1E293B` | Slate-800 |
| `--ring` | `oklch(0.58 0.12 185)` | Focus rings |

#### Semantic Colors — Locked Meanings (never reassigned)

| Semantic role | Light | Dark | Usage |
|---------------|-------|------|-------|
| Complete / Success | `#16A34A` green-600 | `#22C55E` green-500 | Completed lessons, correct answers |
| In Progress / Warning | `#D97706` amber-600 | `#F59E0B` amber-500 | Active modules, streaks |
| Error / Blocked | `#DC2626` red-600 | `#EF4444` red-500 | Failed states, destructive actions |
| Informational | `#2563EB` blue-600 | `#3B82F6` blue-500 | Tips, info alerts |

**Maximum 3 colors visible in any single component. Prefer 1–2.**

---

### 4. Responsive Width Scale

Replace any blanket `max-w-7xl`. Use contextually appropriate constraints:

| Context | Class | Max width | Use case |
|---------|-------|-----------|----------|
| Wide dashboards, landing sections | `max-w-6xl` | 72rem / 1152px | Nav, hero, features, stats |
| Content-heavy pages | `max-w-4xl` | 56rem / 896px | Article pages, lesson detail |
| Standard content | `max-w-3xl` | 48rem / 768px | Blog posts, long-form text |
| Forms, modals, focused input | `max-w-2xl` | 42rem / 672px | Auth forms, create dialogs |
| Narrow forms | `max-w-xl` | 36rem / 576px | Single-field wizards |
| Cards | `max-w-sm` | 24rem / 384px | Dashboard cards, preview panels |

**Never use `max-w-7xl` as a blanket default.** Choose the width that constrains the content to the optimal reading/scanning experience.

---

### 5. Spacing Scale (4px base grid)

All spacing values must be multiples of 4. No arbitrary pixel values.

| Token | Value | Tailwind |
|-------|-------|----------|
| `--space-1` | 4px | `p-1 / gap-1` |
| `--space-2` | 8px | `p-2 / gap-2` |
| `--space-3` | 12px | `p-3 / gap-3` |
| `--space-4` | 16px | `p-4 / gap-4` |
| `--space-5` | 20px | `p-5` |
| `--space-6` | 24px | `p-6` |
| `--space-8` | 32px | `p-8` |
| `--space-10` | 40px | `p-10` |
| `--space-12` | 48px | `p-12` |
| `--space-16` | 64px | `p-16` |

**Section padding:** minimum 24px, prefer 32–48px for primary content zones.
**Card padding:** 20–24px internally.
**Between related elements:** 8–12px.
**Between distinct sections:** 24–48px.

---

### 6. Progress as Personality

Learning progress indicators are first-class UI citizens, not afterthoughts.

- **Progress bars:** 4–6px height, teal fill, `border-radius: 9999px`. Use `ProgressBar` component.
- **Completion rings:** `CircleProgress` — for overall % on dashboards and course cards.
- **Streaks:** Amber accent (`#D97706`), pill shape, warm icon. See `.am-streak` utility class.
- **Completed states:** `.am-completed` utility — `opacity: 0.65` — so done vs. remaining is scannable at a glance.
- **Empty states:** must include a clear next action. Never blank.

Progress indicators must feel premium — Linear/Vercel dashboard aesthetic, not gamified-cheap. No confetti animations, no rainbow fills.

---

### 7. Design Philosophy — Standing Out

These principles differentiate Learnova from generic edtech sites:

**Asymmetric layouts** — Avoid centered-everything grids. Use offset columns, deliberate tension between type sizes, and negative space to create visual rhythm.

**Typographic hierarchy as the hero** — Large, confident type with varied weights carries the page. Card grids are supporting cast, not the lead.

**Teal as a precision accent** — Every teal element is a signal. When learners see teal, it means "act here" or "this is your progress." Diluting it with decorative use destroys this signal.

**Breathing room** — Generous whitespace is a cognitive aid. When a layout feels dense, add space before adding any other change. Never cram.

**Meaningful micro-interactions** — Hover states should feel alive: `translateY(-2px)` + shadow elevation on cards, not just `opacity: 0.8`. Motion communicates state change and guides attention.

**Content-first navigation** — Sidebar or compact top nav. Never a bulky hero-nav hybrid that steals vertical real estate from content.

**Avoid** at all costs:
- Rainbow accent colors
- Heavy gradients (`bg-gradient-to-r from-purple-500 to-pink-500` territory)
- Glassmorphism overuse (`backdrop-blur` on every surface)
- Generic "floating card on gradient background" hero sections
- Decorative illustrations that carry no meaning
- Animation for animation's sake

---

### 8. Micro-interaction Spec

| Interaction | Transition |
|-------------|-----------|
| All interactive elements | `transition: all 150ms ease-out` |
| Card hover | `translateY(-2px)` + `box-shadow: var(--shadow-md)` |
| Button active press | `scale(0.98)` |
| Progress bar fill | `width 400ms ease` |
| Circle ring fill | `stroke-dashoffset 500ms ease` |
| Opacity / color changes | `150ms ease` |

Respect `prefers-reduced-motion` — all animations disable at `0.01ms` under the media query.

---

### 9. Accessibility Requirements (WCAG AA)

- Color contrast: 4.5:1 for normal text, 3:1 for large text and UI components
- All interactive elements keyboard navigable — visible focus ring always present (`outline: none` is banned without a custom replacement)
- Semantic HTML: `<button>` for actions, `<a>` for navigation, `<nav>` / `<main>` / `<section>` landmarks
- `aria-label` on all icon buttons, progress bars, and dynamic regions
- `aria-live` regions for async updates (quiz feedback, progress changes)
- Skip-to-content link at page top
- Touch targets: minimum 44×44px

---

### 10. Component Conventions

| Component | File | Notes |
|-----------|------|-------|
| `Button` | `components/ui/button.tsx` | Uses `@base-ui/react/button`. One primary CTA per screen. |
| `ButtonAnchor` | `components/ui/button.tsx` | For link CTAs. Identical styles, native `<a>`. |
| `ProgressBar` | `components/ui/progress.tsx` | `size="sm"` = 4px, `size="default"` = 6px. |
| `CircleProgress` | `components/ui/progress.tsx` | SVG ring. Pass `size` and `strokeWidth`. |
| `Badge` | `components/ui/badge.tsx` | Semantic variants only. `primary` = teal tint. |

All utility classes (`.am-card`, `.am-badge-*`, `.am-streak`, `.am-label`, `.am-divider`, `.am-completed`) are defined in `app/globals.css`.

---

### 11. Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | `< 768px` | Single column, bottom nav, micro-learning optimized |
| Tablet | `768–1023px` | Collapsible nav, 1–2 column, 44px touch targets |
| Desktop | `1024px+` | Full sidebar nav, multi-column, rich dashboards |

Never hide critical functionality on mobile — adapt the presentation, not the capability.

---

### 12. File & Naming Conventions

- Components: `PascalCase` (`ProgressBar`, `FeatureCard`)
- Utilities: `kebab-case` (`class-variance-authority`, `cn`)
- CSS utility classes: `am-` prefix (`am-card`, `am-streak`, `am-label`)
- All spacing: Tailwind utility classes or `--space-*` tokens — no arbitrary values
- Color: design tokens (`var(--primary)`) or semantic Tailwind classes (`text-primary`, `bg-primary`) — never raw hex in component files

---

*Learnova — by Qubits. Academic Minimal design system.*
