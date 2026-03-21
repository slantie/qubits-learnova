---
name: shadcn-ui-development
description: "Use this skill when building user interfaces in a Next.js project that uses shadcn/ui. Triggers include any request to create, update, or refactor React components, pages, forms, dialogs, tables, or layouts. Also use when the user asks about component installation, styling with Tailwind, form validation, toast notifications, or theming. Use this skill whenever the project stack involves shadcn/ui, Tailwind CSS, React Hook Form, Zod, or Sonner."
license: "For use with any agent skills system"
---

This skill provides strict, opinionated guidelines for building polished, production-grade UIs in projects that use shadcn/ui, Tailwind CSS, and Next.js.

## Package Manager

**ALWAYS use `pnpm`.** Never use `npm` or `yarn`.

```bash
pnpm install
pnpm add package-name
pnpm dlx shadcn@latest add button
```

## Component Rules

Use **only shadcn/ui components**. Never import directly from Radix UI primitives or other UI libraries (react-bootstrap, @mui/material, etc.).

```tsx
// ✅ CORRECT
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

// ❌ WRONG
import * as Dialog from "@radix-ui/react-dialog"
import { Button } from "@mui/material"
```

Install missing components with:
```bash
pnpm dlx shadcn@latest add [component-name]
```

### Available shadcn/ui Components

**Layout**: Card, Separator, Tabs, Sheet, Collapsible  
**Forms**: Button, Input, Textarea, Select, Checkbox, Radio Group, Switch, Slider, Form, Label  
**Data Display**: Table, Badge, Avatar, Progress, Skeleton  
**Overlays**: Dialog, Alert Dialog, Popover, Tooltip, Alert, Toast (Sonner), Dropdown Menu, Command, Drawer  
**Navigation**: Navigation Menu, Breadcrumb, Pagination, Scroll Area

## Styling

Use **Tailwind CSS utility classes exclusively**. No custom CSS files, no inline styles.

```tsx
// ✅ CORRECT
<div className="flex items-center gap-4 p-6 rounded-lg border bg-card">

// ❌ WRONG
<div style={{ display: 'flex', padding: '24px' }}>
```

Use shadcn design tokens for color:
```tsx
bg-background text-foreground
bg-primary text-primary-foreground
bg-secondary text-secondary-foreground
bg-muted text-muted-foreground
bg-card text-card-foreground
bg-destructive text-destructive-foreground
border-border border-input
```

Use `cn()` from `@/lib/utils` for conditional classes.

## Notifications

Use **Sonner** for all notifications. Never use `react-hot-toast` or other toast libraries.

```tsx
import { toast } from "sonner"

toast.success("Saved successfully!")
toast.error("Something went wrong")
toast.loading("Saving...")
toast.promise(saveData(), {
  loading: "Saving...",
  success: "Saved!",
  error: "Failed to save"
})
```

Add `<Toaster />` from `@/components/ui/sonner` to the root layout.

## Forms

Use **shadcn Form + React Hook Form + Zod** for all forms.

```tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const schema = z.object({ email: z.string().email() })

export function MyForm() {
  const form = useForm({ resolver: zodResolver(schema) })
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => console.log(v))} className="space-y-6">
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}
```

## Typography & Fonts

Use modern fonts. Recommended choices: **DM Sans**, **Public Sans**, **Plus Jakarta Sans**, **Outfit**. Avoid Inter, Roboto, Arial.

```tsx
// app/layout.tsx
import { DM_Sans } from "next/font/google"
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400","500","600","700"], variable: "--font-dm-sans" })

// tailwind.config.ts
fontFamily: { sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"] }
```

Typography scale:
```tsx
<h1 className="text-4xl font-bold tracking-tight">Heading</h1>
<h2 className="text-2xl font-semibold">Section</h2>
<p className="text-base text-muted-foreground">Body</p>
<span className="text-xs font-medium uppercase tracking-wide">Label</span>
```

## Theming (globals.css) — OKLCH Colors

**CRITICAL**: Always use **OKLCH** color space for all CSS custom properties. Never use HSL, RGB, or hex values for theme tokens. OKLCH provides perceptually uniform lightness, better color interpolation, and access to wide-gamut P3 colors.

### Why OKLCH
- Perceptually uniform — changing lightness actually looks uniform across hues
- Wide-gamut support — can express colors beyond sRGB (P3, Rec2020)
- Better for generating consistent tints/shades programmatically
- Native in all modern browsers; Tailwind v4 uses it by default

### OKLCH Syntax
```css
oklch(L C H)
/* L = lightness  0–1     (0 = black, 1 = white) */
/* C = chroma     0–0.4   (0 = gray, higher = more saturated) */
/* H = hue        0–360   (degrees on color wheel) */
```

### Full globals.css Template

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

:root {
  /* Neutral base */
  --background:        oklch(1 0 0);
  --foreground:        oklch(0.145 0 0);

  --card:              oklch(1 0 0);
  --card-foreground:   oklch(0.145 0 0);

  --popover:           oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);

  /* Primary accent — change H to shift the hue */
  --primary:           oklch(0.55 0.22 29);   /* e.g. vivid red-orange */
  --primary-foreground: oklch(0.985 0.01 29);

  --secondary:         oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);

  --muted:             oklch(0.97 0 0);
  --muted-foreground:  oklch(0.556 0 0);

  --accent:            oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);

  --destructive:       oklch(0.577 0.245 27.3);
  --destructive-foreground: oklch(0.985 0 0);

  --border:            oklch(0.922 0 0);
  --input:             oklch(0.922 0 0);
  --ring:              oklch(0.55 0.22 29);

  --radius: 0.5rem;

  /* Charts */
  --chart-1: oklch(0.646 0.222 41.1);
  --chart-2: oklch(0.6   0.118 184.7);
  --chart-3: oklch(0.398 0.07  227.4);
  --chart-4: oklch(0.828 0.189 84.4);
  --chart-5: oklch(0.769 0.188 70.1);

  /* Sidebar */
  --sidebar:                oklch(0.985 0 0);
  --sidebar-foreground:     oklch(0.145 0 0);
  --sidebar-primary:        oklch(0.55 0.22 29);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent:         oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border:         oklch(0.922 0 0);
  --sidebar-ring:           oklch(0.55 0.22 29);
}

.dark {
  --background:        oklch(0.145 0 0);
  --foreground:        oklch(0.985 0 0);

  --card:              oklch(0.145 0 0);
  --card-foreground:   oklch(0.985 0 0);

  --popover:           oklch(0.145 0 0);
  --popover-foreground: oklch(0.985 0 0);

  --primary:           oklch(0.55 0.22 29);
  --primary-foreground: oklch(0.985 0.01 29);

  --secondary:         oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);

  --muted:             oklch(0.269 0 0);
  --muted-foreground:  oklch(0.708 0 0);

  --accent:            oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);

  --destructive:       oklch(0.396 0.141 25.7);
  --destructive-foreground: oklch(0.985 0 0);

  --border:            oklch(0.269 0 0);
  --input:             oklch(0.269 0 0);
  --ring:              oklch(0.55 0.22 29);

  /* Charts — dark */
  --chart-1: oklch(0.488 0.243 264.4);
  --chart-2: oklch(0.696 0.17  162.5);
  --chart-3: oklch(0.769 0.188  70.1);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246  16.4);

  /* Sidebar — dark */
  --sidebar:                oklch(0.145 0 0);
  --sidebar-foreground:     oklch(0.985 0 0);
  --sidebar-primary:        oklch(0.55 0.22 29);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent:         oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border:         oklch(0.269 0 0);
  --sidebar-ring:           oklch(0.55 0.22 29);
}

@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground antialiased; }
  html { scroll-behavior: smooth; }
  :focus-visible { @apply outline-none ring-2 ring-ring ring-offset-2 ring-offset-background; }
}
```

### Changing the Accent Color

Only touch the `--primary`, `--primary-foreground`, and `--ring` variables. Change the **H (hue)** value to shift the accent across the color wheel:

| Color | H value | Example OKLCH |
|-------|---------|---------------|
| Red | 29 | `oklch(0.55 0.22 29)` |
| Orange | 60 | `oklch(0.65 0.20 60)` |
| Yellow | 90 | `oklch(0.75 0.18 90)` |
| Green | 145 | `oklch(0.55 0.18 145)` |
| Teal | 185 | `oklch(0.55 0.14 185)` |
| Blue | 250 | `oklch(0.55 0.20 250)` |
| Violet | 290 | `oklch(0.55 0.22 290)` |
| Pink | 340 | `oklch(0.60 0.22 340)` |

### Never Use These in Theme Tokens
```css
/* ❌ WRONG */
--primary: #e53e3e;
--primary: rgb(229, 62, 62);
--primary: hsl(0, 72%, 50%);

/* ✅ CORRECT */
--primary: oklch(0.55 0.22 29);
```

## Polished UI Checklist

Before shipping any component, verify:
- [ ] Consistent padding/margins using Tailwind spacing scale
- [ ] Uniform border-radius across elements
- [ ] Subtle shadows (`shadow-sm`, `shadow-md`) for depth
- [ ] Smooth transitions (`transition-all duration-200`) on interactive elements
- [ ] Hover and focus states on all interactive elements
- [ ] Loading states handled with `<Skeleton>` or `toast.loading()`
- [ ] Destructive actions gated behind `<AlertDialog>`
- [ ] Responsive layout using Tailwind breakpoints (`sm:`, `md:`, `lg:`)
- [ ] Design tokens used for all colors (not raw hex or rgb values)

## Common Patterns

### Data Table
```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function DataTable({ data }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{item.name}</TableCell>
            <TableCell><Badge>{item.status}</Badge></TableCell>
            <TableCell><Button variant="ghost" size="sm">Edit</Button></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

### Dialog with Form
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function CreateDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild><Button>Create New</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create Item</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Enter name" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### Loading Skeleton
```tsx
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function LoadingCard() {
  return (
    <Card>
      <CardHeader><Skeleton className="h-4 w-[250px]" /></CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[200px]" />
      </CardContent>
    </Card>
  )
}
```

## Prohibited Practices

| ❌ Never Do | ✅ Do Instead |
|---|---|
| `import * as Dialog from "@radix-ui/react-dialog"` | `import { Dialog } from "@/components/ui/dialog"` |
| `import "./custom.css"` | Use Tailwind classes |
| `style={{ color: 'red' }}` | `className="text-destructive"` |
| `import { Button } from "@mui/material"` | `import { Button } from "@/components/ui/button"` |
| `import toast from "react-hot-toast"` | `import { toast } from "sonner"` |
| `npm install` / `yarn add` | `pnpm add` |
