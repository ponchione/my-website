# Site Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply typography, spacing, interaction, and detail refinements to make the site feel crafted without changing layout or content.

**Architecture:** All changes are CSS/className-level modifications to existing components. No new components, routes, or data structures. One new external font (Inter via Google Fonts). Changes are purely visual.

**Tech Stack:** React 19, Tailwind CSS v4, Framer Motion (existing), Google Fonts

**Spec:** `docs/superpowers/specs/2026-03-21-site-polish-design.md`

---

### Task 1: Add Inter font

**Files:**
- Modify: `index.html:4` — add Google Fonts link
- Modify: `src/index.css:116-126` — set font-family and feature settings in `@layer base`

- [ ] **Step 1: Add Google Fonts link to index.html**

Add the Inter font link inside `<head>`, after the existing `<meta>` tags but before `<title>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Set Inter as base font in index.css**

In `src/index.css`, update the `@layer base` block. Change the `body` rule to include font-family and feature settings:

```css
@layer base {
    * {
        @apply border-border outline-ring/50;
    }
    body {
        @apply bg-background text-foreground;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        font-feature-settings: "cv02", "cv03", "cv04", "cv11";
    }
    html {
        @apply overflow-y-scroll;
    }
}
```

- [ ] **Step 3: Verify font loads**

Run: `npm run dev`

Open the site in a browser. Open DevTools → Elements → select `<body>` → Computed → check that `font-family` shows Inter. Text should look slightly different from the default system font (notably the lowercase `a` and `l` characters).

- [ ] **Step 4: Commit**

```bash
git add index.html src/index.css
git commit -m "feat: add Inter as base UI font"
```

---

### Task 2: Update sidebar identity

**Files:**
- Modify: `src/components/SideNav.tsx:212` — change subtitle text

- [ ] **Step 1: Update subtitle text**

In `src/components/SideNav.tsx`, find line 212:

```tsx
<p className="text-sm text-muted-foreground">
    Senior Full-Stack Engineer
</p>
```

Replace the text content:

```tsx
<p className="text-sm text-muted-foreground">
    Software Engineer · AI Systems
</p>
```

- [ ] **Step 2: Verify**

Check the sidebar in the browser — subtitle should now read "Software Engineer · AI Systems". Verify on desktop (sidebar) and mobile (open the menu sheet — note: the mobile header shows the name but not the subtitle, so no change expected there).

- [ ] **Step 3: Commit**

```bash
git add src/components/SideNav.tsx
git commit -m "feat: update sidebar subtitle to Software Engineer · AI Systems"
```

---

### Task 3: Spacing and visual rhythm

**Files:**
- Modify: `src/components/pages/AboutPage.tsx:8` — paragraph spacing
- Modify: `src/components/pages/WorkHistoryPage.tsx:19-49` — header gap, card spacing, education gap
- Modify: `src/components/pages/ProjectsPage.tsx:11-14` — header gap, card spacing
- Modify: `src/components/pages/BlogPage.tsx:53-56` — header gap, card spacing

- [ ] **Step 1: Update AboutPage spacing**

In `src/components/pages/AboutPage.tsx`, change the paragraph container from `space-y-6` to `space-y-8`:

```tsx
<div className="space-y-8 text-muted-foreground">
```

- [ ] **Step 2: Update WorkHistoryPage spacing**

In `src/components/pages/WorkHistoryPage.tsx`, make three changes:

First, change the outer container to remove uniform spacing and use a flex column with explicit gaps instead. Replace:

```tsx
<div className="space-y-6 mt-6">
```

With:

```tsx
<div className="mt-6">
```

Then add `mb-8` to the header to create more separation before the first card:

```tsx
<header className="space-y-2 mb-8">
```

Wrap the experience listings in their own container with tighter spacing:

```tsx
<div className="space-y-4">
    {experience.map((job, index) => (
        <WorkListing key={job.id} job={job} initialExpanded={index === 0} />
    ))}
</div>
```

Increase the education section gap:

```tsx
<div className="space-y-3 pt-8">
```

- [ ] **Step 3: Update ProjectsPage spacing**

In `src/components/pages/ProjectsPage.tsx`, replace:

```tsx
<div className="space-y-6 mt-6">
    <header className="space-y-2">
```

With:

```tsx
<div className="mt-6">
    <header className="space-y-2 mb-8">
```

Then wrap the project listings in a container:

```tsx
<div className="space-y-4">
    {typedProjectsData.map((project) => (
        <ProjectListing key={project.id} project={project} />
    ))}
</div>
```

- [ ] **Step 4: Update BlogPage spacing**

In `src/components/pages/BlogPage.tsx`, replace:

```tsx
<div className="space-y-6 mt-6">
    <header className="space-y-2">
```

With:

```tsx
<div className="mt-6">
    <header className="space-y-2 mb-8">
```

Then wrap the blog cards in a container:

```tsx
<div className="space-y-4">
    {sortedPosts.map((post) => (
        <BlogCard key={post.slug} post={post} />
    ))}
</div>
```

- [ ] **Step 5: Verify spacing**

Check all four pages in the browser:
- About: paragraphs should have slightly more breathing room
- Work History: header separated from cards, cards tighter together, education clearly separated
- Projects: same header separation, tighter card grouping
- Blog: same pattern
- No heading should appear on the About page

- [ ] **Step 6: Commit**

```bash
git add src/components/pages/AboutPage.tsx src/components/pages/WorkHistoryPage.tsx src/components/pages/ProjectsPage.tsx src/components/pages/BlogPage.tsx
git commit -m "feat: refine vertical spacing and visual rhythm across pages"
```

---

### Task 4: Micro-interactions

**Files:**
- Modify: `src/components/pages/BlogPage.tsx:17,36-39` — card hover, arrow animation
- Modify: `src/components/WorkListing.tsx:49` — card header hover
- Modify: `src/components/ProjectListing.tsx:32` — card hover
- Modify: `src/components/SideNav.tsx:36-55,69-87` — nav link transitions, social button hover

- [ ] **Step 1: Update BlogCard hover and arrow**

In `src/components/pages/BlogPage.tsx`, update the Card's hover class. Find:

```tsx
<Card className="transition-colors hover:bg-accent/50">
```

Replace with:

```tsx
<Card className="motion-safe:transition-all motion-safe:duration-200 hover:shadow-sm hover:border-foreground/10">
```

Then update the "Read" arrow span. Find:

```tsx
<span className="inline-flex items-center gap-1">
    Read
    <ArrowRight className="h-4 w-4" />
</span>
```

Replace with:

```tsx
<span className="inline-flex items-center gap-1">
    Read
    <ArrowRight className="h-4 w-4 motion-safe:transition-transform motion-safe:duration-200 group-hover:translate-x-1" />
</span>
```

- [ ] **Step 2: Update WorkListing card hover**

In `src/components/WorkListing.tsx`, find the CardHeader hover class:

```tsx
className="cursor-pointer rounded-none px-6 py-6 transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

Replace with:

```tsx
className="cursor-pointer rounded-none px-6 py-6 motion-safe:transition-all motion-safe:duration-200 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

- [ ] **Step 3: Add ProjectListing card hover**

In `src/components/ProjectListing.tsx`, find:

```tsx
<Card>
```

(line 32, the one inside the return statement)

Replace with:

```tsx
<Card className="motion-safe:transition-all motion-safe:duration-200 hover:shadow-sm hover:border-foreground/10">
```

- [ ] **Step 4: Update SideNav transitions**

In `src/components/SideNav.tsx`, update nav link buttons to have smoother transitions. For each `Button` in the `NavLinks` component, the `cn()` call already handles active classes. Add transition to the base classes. Find each instance of:

```tsx
<Button variant="ghost" asChild className={cn("w-full justify-start",
```

Replace with:

```tsx
<Button variant="ghost" asChild className={cn("w-full justify-start motion-safe:transition-colors motion-safe:duration-150",
```

There are 4 nav link Buttons to update (About, Work History, Projects, Blog).

Then update social link buttons. For each social `<Button>` in the `SocialLinks` component, find:

```tsx
<Button variant="ghost" size="icon">
```

Replace with:

```tsx
<Button variant="ghost" size="icon" className="motion-safe:transition-transform motion-safe:duration-150 hover:scale-105">
```

There are 3 social buttons (GitHub, LinkedIn, Email).

- [ ] **Step 5: Verify interactions**

Check in browser:
- Blog cards: subtle shadow lift on hover, arrow slides right
- Work history headers: smooth transition on hover (background stays)
- Project cards: shadow lift on hover
- Nav links: smooth color transitions
- Social icons: slight scale up on hover
- Enable `prefers-reduced-motion: reduce` in DevTools → Rendering → check that all transitions are instant/disabled

- [ ] **Step 6: Commit**

```bash
git add src/components/pages/BlogPage.tsx src/components/WorkListing.tsx src/components/ProjectListing.tsx src/components/SideNav.tsx
git commit -m "feat: add refined micro-interactions with reduced motion support"
```

---

### Task 5: Card top-border accent

**Files:**
- Modify: `src/components/pages/BlogPage.tsx` — add border-t to BlogCard
- Modify: `src/components/WorkListing.tsx:42` — add border-t to Card
- Modify: `src/components/ProjectListing.tsx:32` — add border-t to Card

- [ ] **Step 1: Add border-t to BlogCard**

In `src/components/pages/BlogPage.tsx`, update the Card className (which was modified in Task 4). Add `border-t-2 border-t-foreground/5` to the existing classes:

```tsx
<Card className="border-t-2 border-t-foreground/5 motion-safe:transition-all motion-safe:duration-200 hover:shadow-sm hover:border-foreground/10">
```

- [ ] **Step 2: Add border-t to WorkListing**

In `src/components/WorkListing.tsx`, find:

```tsx
<Card className="overflow-hidden gap-0 py-0">
```

Replace with:

```tsx
<Card className="overflow-hidden gap-0 py-0 border-t-2 border-t-foreground/5">
```

- [ ] **Step 3: Add border-t to ProjectListing**

In `src/components/ProjectListing.tsx`, update the Card className (modified in Task 4). Add `border-t-2 border-t-foreground/5`:

```tsx
<Card className="border-t-2 border-t-foreground/5 motion-safe:transition-all motion-safe:duration-200 hover:shadow-sm hover:border-foreground/10">
```

- [ ] **Step 4: Verify**

Check all card-containing pages (Blog, Work History, Projects) in both light and dark mode. Each card should have a barely-visible top border — structural definition, not a color accent. The education card on Work History should also get this treatment since it uses `<Card>` directly.

- [ ] **Step 5: Add border-t to education card**

In `src/components/pages/WorkHistoryPage.tsx`, find the education Card:

```tsx
<Card>
```

Replace with:

```tsx
<Card className="border-t-2 border-t-foreground/5">
```

- [ ] **Step 6: Commit**

```bash
git add src/components/pages/BlogPage.tsx src/components/WorkListing.tsx src/components/ProjectListing.tsx src/components/pages/WorkHistoryPage.tsx
git commit -m "feat: add subtle top-border accent to cards"
```

---

### Task 6: Badge, dark mode, separator, and 404 refinements

**Files:**
- Modify: `src/components/ui/badge.tsx:8` — padding and border-radius
- Modify: `src/index.css:83` — dark mode background
- Modify: `src/index.css:98` — dark mode border (separator) opacity
- Modify: `src/components/pages/NotFoundPage.tsx` — friendlier 404

- [ ] **Step 1: Refine badge styling**

In `src/components/ui/badge.tsx`, find the base classes in the `cva()` call:

```
"inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden"
```

Replace `rounded-md` with `rounded-full` and change `px-2 py-0.5` to `px-2.5 py-0.5`:

```
"inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden"
```

- [ ] **Step 2: Warm dark mode background**

In `src/index.css`, find in the `.dark` block:

```css
--background: oklch(0.145 0 0);
```

Replace with:

```css
--background: oklch(0.145 0.004 260);
```

- [ ] **Step 3: Soften dark mode separator/border**

In `src/index.css`, find in the `.dark` block:

```css
--border: oklch(1 0 0 / 10%);
```

Replace with:

```css
--border: oklch(1 0 0 / 8%);
```

- [ ] **Step 4: Polish the 404 page**

Replace the full content of `src/components/pages/NotFoundPage.tsx`:

```tsx
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/use-document-title';

export function NotFoundPage() {
    useDocumentTitle('Not Found — Mitchell Ponchione');

    return (
        <div className="mt-16 space-y-6">
            <h1 className="text-4xl font-bold tracking-tight">404</h1>
            <p className="text-muted-foreground text-lg">
                This page doesn't exist — but the rest of the site does.
            </p>
            <Link
                to="/"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground motion-safe:transition-colors motion-safe:duration-150"
            >
                <ArrowLeft className="h-4 w-4" />
                Back home
            </Link>
        </div>
    );
}
```

- [ ] **Step 5: Verify all finishing touches**

Check in browser:
- Badges: should now be pill-shaped (fully rounded) with slightly more horizontal padding. Check on Blog listing (tags), Work History (skills), Projects (tags).
- Dark mode: background should feel very slightly warmer/less harsh. Toggle between light and dark to confirm it's subtle. Separators should be slightly lighter.
- 404 page: navigate to a non-existent route (e.g., `/asdf`). Should show "404" heading, friendly message, and "Back home" link with arrow.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/badge.tsx src/index.css src/components/pages/NotFoundPage.tsx
git commit -m "feat: refine badges, dark mode warmth, separators, and 404 page"
```

---

### Task 7: Page heading typography refinement

**Files:**
- Modify: `src/components/pages/WorkHistoryPage.tsx` — h1 tracking
- Modify: `src/components/pages/ProjectsPage.tsx` — h1 tracking
- Modify: `src/components/pages/BlogPage.tsx` — h1 tracking
- Modify: `src/components/pages/PostPage.tsx:57` — h1 tracking

- [ ] **Step 1: Update heading styles**

In each page that has an `<h1>`, update the tracking. The current pattern is:

```tsx
<h1 className="text-2xl font-bold tracking-tight">
```

Replace with:

```tsx
<h1 className="text-3xl font-bold tracking-[-0.025em]">
```

Apply to:
- `src/components/pages/WorkHistoryPage.tsx` — "Work History" heading
- `src/components/pages/ProjectsPage.tsx` — "Projects" heading
- `src/components/pages/BlogPage.tsx` — "Blog" heading

For `src/components/pages/PostPage.tsx`, the blog post title heading already uses `text-3xl`, so only update the tracking:

```tsx
<h1 className="text-3xl font-bold tracking-[-0.025em]">{post.title}</h1>
```

- [ ] **Step 2: Verify**

Check all pages — headings should be slightly larger and have tighter letter-spacing. Compare the post page title (which was already `text-3xl`) — it should just look slightly tighter.

- [ ] **Step 3: Commit**

```bash
git add src/components/pages/WorkHistoryPage.tsx src/components/pages/ProjectsPage.tsx src/components/pages/BlogPage.tsx src/components/pages/PostPage.tsx
git commit -m "feat: upgrade page headings to text-3xl with tighter tracking"
```

---

### Task 8: Final visual review

- [ ] **Step 1: Full visual review**

Run the dev server (`npm run dev`) and check every page in both light and dark mode:

1. **About** — Inter font visible, paragraph spacing relaxed, no heading
2. **Work History** — heading larger/tighter, cards tighter together, top borders visible, hover shadow, education separated
3. **Projects** — same card treatment, hover works, badges are pills
4. **Blog listing** — cards with top border, hover shadow, "Read" arrow animates
5. **Blog post** — heading tighter, body text readable, tags are pills
6. **404** — friendly message, back link works
7. **Sidebar** — "Software Engineer · AI Systems", nav transitions smooth, social icons scale
8. **Mobile** — open menu sheet, verify nothing broke

- [ ] **Step 2: Check reduced motion**

In DevTools → Rendering → enable "Emulate CSS media feature prefers-reduced-motion: reduce". Navigate between pages and hover over cards. All transitions should be instant.

- [ ] **Step 3: Check font loading**

Hard refresh (Ctrl+Shift+R). Watch for flash of unstyled text. The `display=swap` parameter in the Google Fonts URL should prevent blocking, and the font should load within a moment.
