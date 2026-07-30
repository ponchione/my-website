# Nuxt Port

> Canonical implementation guide for porting `mitchellponchione.com` from
> Vite/React to Nuxt/Vue and moving production hosting from Vercel to
> Cloudflare Pages.

## Document control

- Status: Nuxt implementation complete; Cloudflare access blocked
- Last updated: 2026-07-30
- Current phase: Phase 4, awaiting Cloudflare authentication
- Next milestone: Connect the GitHub repository in Cloudflare Pages and validate
  its preview deployment

This file is the source of truth for the port. When an implementation decision
changes, update this document in the same change. Completed work should be
checked off here only after it has been validated.

## Objective

Rebuild the existing website in Nuxt 4 and Vue 3 with functional and visual
parity, then deploy the port to Cloudflare Pages. Preserve the current site as
the reference implementation until the Nuxt version passes the acceptance
checks in this document.

This is a framework and hosting port, not the redesign. The port should leave a
clean Vue/Nuxt foundation for the later redesign without prematurely deciding
the site's new information architecture or presentation.

## Locked decisions

- Replace Vite, React 19, React Router, and Framer Motion with Nuxt 4 and Vue 3.
- Use TypeScript and Vue Single-File Components with `<script setup lang="ts">`.
- Keep Tailwind CSS v4.
- Use Nuxt file-based routing.
- Generate a static site for the initial production release.
- Deploy the generated site to Cloudflare Pages.
- Preserve all current public URLs during the port.
- Preserve light/dark theme support, responsive navigation, keyboard behavior,
  and reduced-motion behavior.
- Keep the current content and copy unchanged unless a correction is necessary
  to complete the port.
- Defer the broader visual and content redesign until after Cloudflare cutover.

## Explicit non-goals

- Repositioning the site or changing its purpose.
- Reworking the navigation or making résumé, project, or blog content more or
  less prominent.
- Adding new pages, posts, projects, analytics, APIs, databases, or server
  features.
- Expanding the current state or data layer.
- Publishing private projects or side-business details.
- Applying the Eyebox/KickBrass-inspired visual redesign during parity work.
- Preserving React component APIs or React-specific implementation details.

The future visual direction should draw from the Eyebox and KickBrass palettes,
but that work begins only after the port and hosting migration are stable.

## Current baseline

### Application

- Runtime: React 19 client-side application built by Vite.
- Routing: React Router with a Vercel rewrite to `index.html`.
- Styling: Tailwind CSS v4 plus local shadcn-style primitives.
- Motion: Framer Motion for page transitions and expandable work-history cards.
- Theme: `next-themes`, using a class on the document and dark mode by default.
- Icons: `lucide-react` plus local SVG-based Vue-independent identity/social
  artwork currently wrapped in React components.
- Content: JSON for résumé and projects; Markdown with frontmatter for posts.
- Analytics: Vercel Analytics.

### Public route contract

These paths must continue to resolve after the port:

| Current route | Nuxt page | Expected title |
| --- | --- | --- |
| `/` | `app/pages/index.vue` | `Mitchell Ponchione` |
| `/work-history` | `app/pages/work-history.vue` | `Work History — Mitchell Ponchione` |
| `/projects` | `app/pages/projects.vue` | `Projects — Mitchell Ponchione` |
| `/blog` | `app/pages/blog/index.vue` | `Blog — Mitchell Ponchione` |
| `/blog/:slug` | `app/pages/blog/[slug].vue` | Post title or not-found title |
| Any unknown path | `app/error.vue` | `Not Found — Mitchell Ponchione` |

The existing post filenames are URL contracts. Preserve their slugs exactly,
including underscores and capitalization:

- `/blog/agency_in_an_AI_world`
- `/blog/micro_business_architecture`
- `/blog/software_goes_to_zero`

### Behavior contract

- Desktop shows the sticky left navigation and hides the mobile header/footer.
- Mobile shows the sticky header, slide-over navigation, and mobile footer.
- The mobile menu closes after navigation and when the viewport becomes desktop.
- The active Blog navigation state includes individual post routes.
- Theme selection supports light and dark appearance without a hydration flash.
- Route navigation scrolls to the top.
- Page transitions are disabled when reduced motion is requested.
- Expandable work-history entries work with pointer, Enter, and Space input.
- The first work-history entry is expanded initially.
- Expand/collapse motion is disabled when reduced motion is requested.
- External links open safely in a new tab where they do today.
- Blog posts retain GFM rendering, reading time, tags, formatted dates, and
  previous/next navigation.
- Page titles update correctly for every route.

### Baseline validation on 2026-07-30

| Command | Result | Notes |
| --- | --- | --- |
| `npm run build` | Pass | Existing Vite production build succeeds. |
| `npm run lint` | Pass | Existing ESLint configuration reports no errors. |
| `npm test` | Fail | Route-manifest test passes; app-shell test fails because it expects a skip link and `main#main-content`, which the current shell does not render. |

The skip-link failure is pre-existing. The Nuxt port should satisfy the intended
accessibility contract rather than copy the omission: render a visually hidden
“Skip to content” link targeting a focusable `main#main-content`.

### Reference screenshot baseline

Capture the current local React production build in Chromium before beginning
the port. Store full-page PNGs under
`artifacts/nuxt-port/react-baseline/` using this fixed matrix:

- Desktop viewport: `1440 × 900`.
- Mobile viewport: `390 × 844`.
- Both light and dark modes.
- All seven valid public routes plus a representative unknown route.
- The open mobile-menu state in both themes as two additional screenshots.

This produces 34 reference images. These images are visual evidence, not a
replacement for the separate responsive, keyboard, focus, and reduced-motion
acceptance checks. They may be removed after Nuxt parity is accepted.

Captured and verified on 2026-07-30: all 34 expected PNGs are present and
readable, including representative long-page and open-mobile-menu states.

## Proposed target architecture

```text
app/
  app.vue
  error.vue
  assets/css/main.css
  components/
    layout/
    pages/
    ui/
  composables/
  data/
    projects.json
    resume.json
  layouts/default.vue
  pages/
    index.vue
    work-history.vue
    projects.vue
    blog/
      index.vue
      [slug].vue
  types/
content/
  blog/
    agency_in_an_AI_world.md
    micro_business_architecture.md
    software_goes_to_zero.md
public/
content.config.ts
nuxt.config.ts
NUXT_PORT.md
```

### Runtime and rendering

- Nuxt 4 with Vue 3.
- `ssr: true` so routes generate real HTML.
- `nuxt generate` for the production artifact.
- No Nitro server process, server routes, or runtime database for the initial
  release.
- Cloudflare serves the static output from `.output/public`.

### Content

Use Nuxt Content with a typed `blog` page collection in `content.config.ts`.
Its schema must require:

- `title`
- `date`
- `tags`
- `excerpt`

Keep résumé and project data as imported JSON. Do not fold all structured data
into Nuxt Content simply for consistency.

Blog ordering remains newest first. Reading time can be derived in a small
shared utility unless the selected Nuxt Content version provides an equally
predictable build-time value.

Treat each Markdown filename as the exact public slug. Derive the route slug
from Nuxt Content's `stem` rather than relying on generated-path normalization,
and test that capitalization and underscores are preserved. Prerender every
discovered post route for the static Cloudflare artifact.

### Styling and UI primitives

Port only the primitives actually needed by the site. Do not carry the unused
generic React sidebar system into Vue.

| React implementation | Vue target |
| --- | --- |
| `button.tsx` | Local `UiButton.vue` or native styled controls |
| `badge.tsx` | Local `UiBadge.vue` |
| `card.tsx` | Small local card components or semantic markup with shared classes |
| `separator.tsx` | Local semantic separator |
| `sheet.tsx` | Accessible Vue dialog/sheet primitive |
| `sidebar.tsx` | Do not port; it is not used by the application shell |
| `input.tsx` | Do not port unless a real consumer remains |
| `tooltip.tsx` | Do not port unless a real consumer remains |

The mobile sheet must preserve focus trapping, Escape-to-close, focus return,
overlay behavior, and an accessible title. Use Reka UI's `Dialog` primitive
through a thin local `UiSheet.vue` wrapper styled to match the current
right-side mobile menu. Do not add the broader shadcn-vue scaffold solely for
this component.

### Motion

- Use Nuxt/Vue page transitions and CSS for route fades/translations.
- Use Vue `<Transition>` plus CSS for work-history expansion.
- Use `prefers-reduced-motion` media queries to reduce transition duration to
  zero and remove transforms.
- Do not add a Vue motion library unless parity cannot be achieved cleanly with
  Vue and CSS.

### Theme

- Preserve the current light and dark tokens for the parity checkpoint.
- Use `@nuxtjs/color-mode` with `dark` as the explicit default and fallback;
  do not enable system preference as a third mode during the parity port.
- Keep the existing `light`/`dark` document classes so the current CSS tokens
  carry over directly.
- Use the module's pre-hydration initialization to prevent incorrect-theme
  flashes during SSR/hydration and preserve selection across visits.
- Keep the implementation replaceable so the later Eyebox/KickBrass token set
  can be applied without component rewrites.

### SEO and static assets

- Replace the hard-coded Vercel site URL with `https://www.mitchellponchione.com`.
- Use Nuxt head/SEO composables for titles, descriptions, canonical URLs, and
  social metadata.
- Generate or validate `robots.txt` and `sitemap.xml` against the canonical
  domain and all known routes.
- Preserve the favicon, Apple touch icon, and identity/social SVG assets.
- Every content route must be present as generated HTML, not only as a
  client-side fallback.

### Tests and quality gates

- Vitest remains the unit-test runner.
- Replace React Testing Library with Vue Test Utils and the Nuxt test utilities
  needed for route/component tests.
- Port the route-manifest coverage or replace it with an equivalent generated
  route/sitemap assertion.
- Port and satisfy the app-shell skip-link test.
- Add focused tests for content slug discovery and previous/next blog ordering.
- Avoid snapshot tests for entire pages.

Required local checks before deployment:

```sh
npm run typecheck
npm run lint
npm test
npm run generate
```

All four commands must pass.

### Nuxt validation on 2026-07-30

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run typecheck` | Pass | Strict Nuxt/Vue type checking completed on Node 24.11.0. |
| `npm run lint` | Pass | Nuxt's generated flat ESLint configuration reports no errors. |
| `npm test` | Pass | Four files and six focused tests pass. |
| `npm run generate` | Pass | All known pages, exact post slugs, payloads, and static fallbacks generate successfully. |
| `npm run verify:preview` | Pass | Direct routes, client navigation, metadata, 404, themes, focus, keyboard, sheet, work expansion, and reduced motion pass in Chromium. |
| Visual comparison | Pass | The 34 Nuxt captures match every baseline page dimension at the fixed desktop/mobile viewports in both themes. |
| Content comparison | Pass | Résumé/project JSON and all Markdown sources are byte-identical to the React source in Git history. |

The browser verification output remains local under
`artifacts/nuxt-port/nuxt-output/`; migration screenshots are intentionally
ignored by Git.

### External deployment status on 2026-07-30

Local Cloudflare access is not configured: `wrangler whoami` reports that the
session is unauthenticated and no `CLOUDFLARE_API_TOKEN` is present. Cloudflare
Pages Git integration also requires the repository to be authorized through
the Cloudflare dashboard. No Pages project or DNS record has been created or
changed while those gates are unavailable.

The account-bound steps, exact build settings, preview gate, custom-domain
ordering, apex delegation requirements, and rollback references are recorded
in `CLOUDFLARE_CUTOVER.md`. A Wrangler-created project was intentionally not
used because it would be a Direct Upload project that cannot later be converted
to the required Git integration.

The current nameservers are GoDaddy (`ns55.domaincontrol.com` and
`ns56.domaincontrol.com`), and the live `www` record still targets Vercel. The
pushed migration commit has a successful Vercel deployment status, and every
valid public route returns HTTP 200 there. This preserves a working rollback
deployment until the Cloudflare preview and custom-domain checks pass.

## Port sequence

### Phase 0 — Baseline and decisions

- [x] Inventory routes, content sources, shared components, and behavior.
- [x] Run the current build, lint, and test commands.
- [x] Record the existing test failure.
- [x] Choose the accessible Vue dialog/sheet primitive.
- [x] Choose the theme implementation.
- [x] Confirm whether Nuxt Content is accepted for the three blog posts.
- [x] Capture reference screenshots for every route in light and dark mode at
      desktop and mobile widths.

### Phase 1 — Nuxt foundation

- [x] Install the Nuxt/Vue runtime and development dependencies.
- [x] Add `nuxt.config.ts`, `app/app.vue`, and the default layout.
- [x] Configure strict TypeScript, Tailwind v4, aliases, and test tooling.
- [x] Add theme initialization and the current semantic color tokens.
- [x] Port the app shell, skip link, desktop navigation, mobile header, mobile
      sheet, and mobile footer.
- [x] Keep the React implementation available as a reference during this phase.

### Phase 2 — Routes and content

- [x] Port the About/home page.
- [x] Port structured résumé data and the work-history page.
- [x] Port structured project data and the projects page.
- [x] Move Markdown posts into the Nuxt content collection without changing
      filenames, frontmatter, or bodies.
- [x] Port the blog index and post page.
- [x] Port blog typography, GFM behavior, reading time, and post navigation.
- [x] Add the Nuxt error page.
- [x] Verify page titles and canonical URLs.

### Phase 3 — Parity and cleanup

- [x] Compare every Nuxt route against the React reference screenshots.
- [x] Verify keyboard navigation, focus behavior, and screen-reader landmarks.
- [x] Verify mobile/desktop breakpoints and menu behavior.
- [x] Verify reduced-motion behavior.
- [x] Verify direct loading and refreshing of every public URL.
- [x] Pass typecheck, lint, tests, and static generation.
- [x] Remove React, React Router, Framer Motion, Radix React, Vite React, and
      Vercel Analytics dependencies.
- [x] Remove superseded React source, Vite entry files, and `vercel.json` only
      after parity is confirmed.
- [x] Update `AGENTS.md` to describe the Nuxt/Vue layout and commands.

### Phase 4 — Cloudflare Pages

- [ ] Create a Cloudflare Pages project connected to the repository.
- [ ] Configure the production branch and Node version.
- [ ] Use `npm run generate` as the build command.
- [ ] Publish `.output/public`.
- [ ] Validate the Cloudflare preview URL before changing DNS.
- [ ] Add `www.mitchellponchione.com` and the apex-domain redirect/canonical
      behavior.
- [ ] Confirm HTTPS, redirects, sitemap, robots, 404 handling, and all deep links.
- [ ] Cut DNS over only after preview acceptance.
- [ ] Keep the previous Vercel deployment available until the Cloudflare domain
      has been verified.
- [ ] Remove the Vercel project only as a separate, deliberate cleanup action.

### Phase 5 — Redesign handoff

- [ ] Confirm the Nuxt/Cloudflare port is stable in production.
- [x] Open a separate redesign document or section with its own goals.
- [x] Revisit navigation prominence, content hierarchy, layout, typography, and
      the Eyebox/KickBrass-derived palette.

The separate, non-implementing brief is in `REDESIGN_HANDOFF.md`. It remains
deferred until the first Phase 5 stability gate is complete.

## Acceptance checklist

The port is complete when all of the following are true:

- [x] All existing public routes and exact blog slugs work directly and through
      client navigation.
- [x] Current content is present and unchanged.
- [x] Desktop and mobile layouts match the current structure closely.
- [x] Light/dark selection works without a visible hydration mismatch.
- [x] Reduced-motion users receive no route or expansion transforms.
- [x] Mobile sheet and work-history cards are fully keyboard accessible.
- [x] The skip link works and targets `main#main-content`.
- [x] Generated pages contain useful HTML and route-specific metadata.
- [x] Typecheck, lint, tests, and static generation pass.
- [ ] Cloudflare preview passes the route and behavior checks.
- [ ] The custom domain serves the Cloudflare deployment over HTTPS.
- [x] Vercel-specific code and configuration are absent from the final Nuxt
      source.

## Decision log

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-07-30 | Separate port from redesign. | Establish the preferred Nuxt/Vue foundation and new host before changing the site's direction. |
| 2026-07-30 | Target Nuxt 4, Vue 3, TypeScript, and Tailwind v4. | Align with the preferred stack and existing Eyebox experience. |
| 2026-07-30 | Target static generation on Cloudflare Pages. | The current site does not need an always-running application server. |
| 2026-07-30 | Preserve current URLs and exact post slugs. | Avoid broken links and search-index churn during a framework-only port. |
| 2026-07-30 | Treat the missing skip link as a baseline defect to resolve. | The existing test expresses the intended accessibility behavior even though the React shell currently fails it. |
| 2026-07-30 | Use Reka UI's `Dialog` primitive behind a local `UiSheet.vue` wrapper. | Preserve tested dialog accessibility behavior while avoiding a broader shadcn-vue scaffold for one component. |
| 2026-07-30 | Use `@nuxtjs/color-mode` with an explicit dark default and fallback. | Preserve the current class-based theme contract and stored selection while preventing an incorrect-theme flash during Nuxt hydration. |
| 2026-07-30 | Use Nuxt Content with a typed `blog` page collection. | Gain build-time Markdown parsing, schema validation, SSR rendering, and typed queries while preserving exact filename-derived slugs through explicit assertions. |
| 2026-07-30 | Capture a 34-image React baseline at fixed desktop/mobile viewports in both themes. | Give the Nuxt parity review durable route, theme, breakpoint, 404, and open-mobile-menu visual references without expanding the port into a redesign. |

## Deferred decisions

These are not Phase 0 gates and do not block port authorization:

1. Analytics: omit analytics at launch or choose a Cloudflare-compatible,
   privacy-conscious replacement after cutover. Analytics replacement is not
   required for port parity.

## Working notes

Add discoveries here while porting. Promote durable conclusions into the
relevant section or decision log rather than letting this become an unstructured
scratchpad.

- `src/components/ui/sidebar.tsx` is generic generated code and is not imported
  by the site shell; it should not be ported.
- `SITE_URL` currently points to `https://mitchellponchione.vercel.app`; the
  Nuxt configuration must use the custom domain.
- Project data currently includes a `Deprecated` status that is missing from the
  TypeScript `PersonalProject` union and status-style map. The existing build
  still passes because the JSON is asserted to the type. Preserve rendered
  behavior during the port, then correct the target type explicitly.
