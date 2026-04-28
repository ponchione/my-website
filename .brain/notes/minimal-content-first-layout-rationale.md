---
created: 2026-04-07
author: hermes-agent
tags: [rationale, design-decision, layout, content-first]
status: active
---

# Rationale: minimal content-first layout

## Decision
The site uses a minimal, content-first layout with a fixed side navigation and a
narrow single-column article area. Framer Motion is used only for page
transitions and reduced-motion-aware reveals.

## Rationale
We chose the minimal content-first layout for three reasons:

1. Reading is the primary job. The site is a personal blog and resume, so the
   layout must never compete with the prose. A fixed side nav plus narrow
   column keeps the reader's eye on the content.
2. Shipping speed. Minimal chrome means fewer components to maintain, fewer
   breakpoints to test, and fewer Tailwind utility collisions during design
   iteration. The rationale for keeping edits small rather than refactoring is
   the same: preserve the minimal content-first layout at every touch point.
3. Accessibility by default. A narrow, high-contrast column with muted motion
   and reduced-motion fallbacks avoids entire categories of accessibility bugs
   we would otherwise need to hand-fix for each new page.

## Non-goals
- No full-bleed marketing layouts.
- No decorative page-load animations.
- No heavier state layer than the existing React Router + local state.

## See also
- AGENTS.md "Keep It Tight"
- src/components/SideNav.tsx for the nav scaffold
- src/components/AnimatedOutlet.tsx for the route table
