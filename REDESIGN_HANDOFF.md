# Redesign Handoff

Status: Ready for redesign discovery; the Nuxt/Cloudflare migration is stable
in production.

This is the separate brief for the site's future redesign. It deliberately
does not change the parity-port implementation.

## Goals

- Clarify the site's primary audience and the one action each audience should
  take after landing.
- Make Mitchell's work in AI systems and agent orchestration legible without
  turning the site into a product-marketing page.
- Establish a distinctive visual system informed by Eyebox and KickBrass while
  retaining the site's restrained, content-first character.
- Keep the Nuxt foundation simple, fast, accessible, and easy to maintain.

## Areas to revisit

### Navigation prominence

Decide whether About, Work History, Projects, and Blog should retain equal
weight or whether one path should become primary. Test the same information
architecture on desktop and mobile before changing either navigation surface.

### Content hierarchy

Review the home-page introduction, role/skill emphasis, project summaries, and
blog discovery as one narrative. Content changes should remain in Markdown or
JSON where possible, with private projects and side-business details excluded.

### Layout

Evaluate the fixed desktop rail, reading widths, project/work card density, and
long-form post rhythm. Preserve clear landmarks, direct routes, keyboard
behavior, and the existing responsive baseline while exploring alternatives.

### Typography

Define display, interface, and reading roles before choosing typefaces or
scales. Any replacement for Inter must be measured on long posts as well as
compact navigation and status labels.

### Palette

Extract candidate hues from the Eyebox/KickBrass direction into semantic
tokens rather than applying colors component by component. Produce light and
dark sets together and validate contrast, focus visibility, and status-color
meaning before adoption.

## Redesign gates

- Cloudflare production and custom-domain HTTPS are stable.
- Port behavior and route tests remain the regression baseline.
- A content/positioning brief is approved before visual exploration expands.
- Desktop, mobile, light, dark, reduced-motion, keyboard, and focus states are
  reviewed for every accepted direction.

Analytics remains a separate product/privacy decision and is not assumed by
this brief.
