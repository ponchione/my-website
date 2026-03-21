# Site Polish Design Spec

A set of targeted refinements to the existing personal portfolio site that improve typography, spacing, interactions, and visual details without changing the layout, color palette, or content structure.

## Goals

- Make the site feel crafted rather than just functional
- Preserve the clean, minimal grayscale aesthetic
- Signal attention to detail for the one person who clicks through from a resume or LinkedIn profile
- Better reflect the "Software Engineer · AI Systems" identity

## Non-goals

- No redesign or layout changes
- No new pages or features
- No accent colors or brand overhaul
- No restructuring of the about page content

---

## 1. Typography

**Add Inter as the explicit UI font.**

- Load Inter via Google Fonts in `index.html` (weights: 400, 500, 600, 700)
- Set Inter as the base `font-family` in Tailwind theme configuration
- Page headings (`h1`): use `text-3xl` with `tracking-[-0.025em]` for tighter, more refined headings
- Enable `font-feature-settings: "cv02", "cv03", "cv04", "cv11"` for Inter's alternate glyphs (cleaner letterforms)
- Blog post body: keep existing `line-height: 1.75` and `max-width: 72ch` — already well-tuned
- No serif fonts. No font mixing. Single font family throughout.

### Files affected
- `index.html` — add Google Fonts `<link>`
- `src/index.css` — set font-family and feature settings in `@layer base`

---

## 2. Sidebar Identity

**Replace subtitle text.**

Change "Senior Full-Stack Engineer" to "Software Engineer · AI Systems" in `SideNav.tsx`.

### Files affected
- `src/components/SideNav.tsx` — update the `<p>` element text

---

## 3. Spacing & Visual Rhythm

**Create more deliberate vertical spacing — tighter within groups, more breathing room between sections.**

- Page headers: increase bottom separation to `mb-8` before first content card
- Card groups (work history, projects, blog lists): tighten to `space-y-4`
- Between distinct sections (e.g., experience → education on work history page): increase to `space-y-10` or `pt-6`
- About page: increase paragraph spacing to `space-y-8`
- Do NOT add a heading to the about page — it stays headerless

### Files affected
- `src/components/pages/AboutPage.tsx` — paragraph spacing
- `src/components/pages/WorkHistoryPage.tsx` — card list spacing, header-to-content gap, experience-to-education gap
- `src/components/pages/ProjectsPage.tsx` — card list spacing, header-to-content gap
- `src/components/pages/BlogPage.tsx` — card list spacing, header-to-content gap

---

## 4. Micro-interactions

**Refine hover states and transitions to feel more alive.**

- **Card hovers** (BlogCard, WorkListing, ProjectListing): replace `hover:bg-accent/50` with `hover:shadow-sm hover:border-foreground/10 transition-all duration-200`
- **Blog "Read →" arrow**: add `group-hover:translate-x-1 transition-transform duration-200`
- **Nav links**: add `transition-colors duration-150` to active state background changes
- **Social icon buttons**: add `hover:scale-105 transition-transform duration-150`
- **All transitions** must respect `prefers-reduced-motion`: use Tailwind's `motion-safe:` prefix or media query to set durations to 0

### Files affected
- `src/components/pages/BlogPage.tsx` — BlogCard hover and arrow animation
- `src/components/WorkListing.tsx` — card hover style
- `src/components/ProjectListing.tsx` — card hover style
- `src/components/SideNav.tsx` — nav link transitions, social button hover scale

---

## 5. Finishing Touches

**Small details that add up to a sense of craft.**

### Card top-border accent
- Add `border-t-2 border-t-foreground/5` to Card components used in blog, work history, and projects
- Adds a barely-visible definition line — structural, not decorative

### Badge refinement
- Tighten padding slightly
- Ensure `text-xs font-medium` consistency
- Add slightly more border-radius for a softer pill shape

### Dark mode background warmth
- Shift dark mode `--background` from `oklch(0.145 0 0)` (pure neutral) to `oklch(0.145 0.004 260)` (barely perceptible cool warmth)
- Takes the harsh edge off without being noticeable as a "color"

### Separator subtlety
- Make separators slightly lighter: reduce border opacity so they guide the eye without being heavy

### 404 page polish
- Current 404 is functional but bare. Add a bit of personality — e.g., a slightly larger heading treatment, friendlier copy, and ensure the link home is clearly styled
- Keep it simple — no illustrations or gimmicks

### Files affected
- `src/index.css` — dark mode background tweak, separator styling
- `src/components/ui/badge.tsx` — padding and border-radius refinement
- `src/components/ui/card.tsx` — top-border accent (or applied per-usage in page components)
- `src/components/pages/NotFoundPage.tsx` — friendlier copy and styling
- `src/components/WorkListing.tsx` — card border
- `src/components/ProjectListing.tsx` — card border
- `src/components/pages/BlogPage.tsx` — card border

---

## Testing approach

- Visual review in both light and dark mode
- Check all pages: About, Work History, Projects, Blog listing, Blog post, 404
- Verify `prefers-reduced-motion` disables all new transitions
- Verify mobile layout is unaffected (responsive behavior unchanged)
- Check font loading — ensure Inter loads without FOUT (flash of unstyled text) by using `font-display: swap`
