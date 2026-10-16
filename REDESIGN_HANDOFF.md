# Redesign Handoff: the Realm Map

Status (2026-10-15): the map is the home page (`/`), merged to `main` and live. The old
home page is now `/about`; `/work-history` and `/projects` are unchanged. The blog now
lives in the realm: `/blog` is the letter case and `/blog/<slug>` a letter, both over the
map (see "Letters" below).
Pushing `main` deploys (Cloudflare Workers Builds), so ask Mitchell before pushing it.

## Direction

The site is no longer a resume site. Goal: "when someone visits, they feel like they
stepped out of the general internet." The redesign is a grand-strategy (EU5/Paradox
style) map of Pennsylvania: counties are the regions, PA is the home realm, neighboring
states and Ontario are foreign realms. Mitchell works in small increments: get the core
working, then add.

Decided (don't relitigate):

- Say **county**, never "province", in anything user-facing.
- Map modes: Political, Terrain, **Career** (jobs by county), **Education** (IUP, Indiana
  County), kept separate. Career and Education are the primary controls: they're
  *lenses* (big labeled buttons, toggle off on a second click) that light up counties
  over either *base map* (Political or Terrain, a small icon toggle beside them). A small
  **Clear** button above the base toggle returns the map to how it opened: Political,
  no lens, nothing selected, and the camera flown back to the opening view (`resetView`).
- **No black void on desktop, but a bounded map with margin.** The map covers PA plus
  about a degree of its neighbors on every side (`BOUNDS` in `build-map.mjs`); the
  neighbors' counties are drawn as faint borders but aren't provinces (no hover/select).
  The opening view frames PA with padding so neighbors show around it. The camera never
  zooms out past the map filling the screen and panning stops at the map's edge
  (`limitZoom`/`viewRange`/`clampView` in the renderer); it flattens to nearly top-down
  by that limit so the map can fill wide windows. Phones open fitting PA's height and may
  zoom out past the map as far as fitting its width; the banner and the dock hide most
  of the overflow. Test at real browser shapes (~2:1, e.g. 1920×960), not 16:10.
- Switching a lens on frames its counties if they aren't all in view already
  (`frameCounties`). On a phone, Career zooms out to PA's width, which leaves a dark
  strip below the map above the dock; showing every career town won over filling the
  screen.
- Flights land with their spot in the middle of the free area (`viewPadding`), which
  leaves out the county panel while it's open, so the panel never covers the town.
- Centering can be loose: a county near the map's edge may sit off-center when selected.
  Mitchell only cared about void on the opening view.
- Flights (`flyTo`) glide straight and pull back only as far as stays over the map;
  from the zoomed-out view they steer by placement within the allowed range. A per-frame
  clamp on a straight path caused visible jolts, so don't reintroduce one.
- ARA was the **Mechanicsburg office (Cumberland County)**, though mostly remote.
- Blog posts open as Paradox-style **event pop-ups** from the Dispatches button. They are
  *not* placed on counties: no map markers for posts.
- **Reading a post never leaves the map.** "Break the seal and read it" cracks the wax
  seal on the event's plate, then opens the post as a **letter**: a parchment sheet over
  the dimmed, still-live map, at the post's own URL. Headings are rules through the page,
  the first letter is a red drop cap, and it's signed with the name and house arms. The
  letter case (`/blog`) lists every letter with its seal intact or broken. Mitchell chose
  parchment and left out the extras (a plain-text toggle, option effect tooltips,
  swapping the dispatch plate for a seal).
- **Jobs and the degree do get map markers**: a drawn town icon at the real town
  (Pittsburgh, New Holland, New Enterprise, Mechanicsburg, Indiana), a keep for posts
  and a columned hall for schooling, in its lens's color. This isn't the blog-post
  decision reopened: the work happened in those places.
- **The map must show the whole resume.** Every post and the degree has a **record**: a
  pop-up in the Dispatches style with the full responsibilities, projects, skills and the
  employer's link. It opens from a town marker, from a holding in the county panel, and
  when a flight started from the character sheet lands. A town with several posts pages
  through them ("1 of 2"). Mitchell: "We're cutting my resume for no reason here."
- **No fog of war.**
- The character sheet takes CK3's gist, not its wording. Only the six skill names
  (Diplomacy, Martial, Stewardship, Intrigue, Learning, Prowess) are CK3's, by request.
- Clicking a title on the sheet flies the camera to its town and switches to Career
  (Education for schooling), then opens the record on landing. Mitchell specifically
  wanted that flight.
- Don't mark a home or "capital" county without asking (privacy). The family is "a
  growing family of five", not "five kids".

Deferred until it's more polished: speed controls, a date ticker, keyboard shortcuts and
an accessible outliner.

## Waiting on Mitchell

- **Town icons** are drawn SVG (`RealmTown.vue`). Painted art may replace them once the
  interaction feels right; Mitchell left this open.
- **Character placeholders** in `app/data/character.ts`: traits, skill values, epithet,
  motto, counters. Mitchell will edit these; don't "improve" them unasked.
- **Portrait**: `public/realm/portrait.webp` is a procedural stopgap. Mitchell may want a
  model-painted head portrait later; drop it in at the same path (5:6).

## Running it

```sh
npm run dev                                   # http://localhost:3000/
node scripts/map/build-map.mjs                # regenerate map assets (~30 s cached)
node scripts/portrait/build-portrait.mjs <photo.jpg>   # regenerate the portrait
```

- `build-map.mjs` downloads Census cb_2024 counties/states, Natural Earth countries and
  rivers, and AWS Terrain Tiles (terrarium, zoom 10) into `.cache/map` (gitignored,
  ~125 MB on first run), plus the Census county adjacency file and 2020 county
  populations for Keystone. It writes `public/realm/*.webp` (3.7 MB total) and
  `app/data/map/pennsylvania.json`, which also holds each county's Keystone neighbors,
  development and terrain (see `KEYSTONE_SPEC.md`). Terrain over PA is USGS 3DEP + SRTM
  via those tiles, not Copernicus GLO-90.
- The portrait's source photo is not in the repo (it lives on Mitchell's Windows
  Pictures folder: `/mnt/c/Users/mitch/Pictures/mitchell_ponchione_professional.jpg`).
- Checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` all passed at
  handoff. The build warns about the three.js chunk size; it only loads on `/`.
- `public/og-image.jpg` (1200×630) is every page's link preview: the opening view with
  the Career lens on, the UI hidden and a name card on top. Re-shoot it if the map's
  look changes.
- `worker.ts` caches `/_nuxt/` build files for a year (they're fingerprinted, except
  `/_nuxt/builds/`) and the map textures under `/realm/` for a day.

## Where things are

| Path | What |
| --- | --- |
| `app/pages/index.vue` | The map page: state, map modes bar, county panel, town markers, records, Escape handling, layout padding |
| `app/pages/about.vue` | The old home page, linked from the map's skip link, its failure message and the character sheet |
| `app/components/realm/RealmMap.client.vue` | Mounts the renderer; exposes `flyTo`, `frameCounties`, `resetView`, `paintPlate`; pins `markers` over the map (`#marker` slot) |
| `app/utils/realm/realm-renderer.ts` | three.js scene, camera controller, picking, labels, flights |
| `app/utils/realm/shaders.ts` | Terrain/political/water/border shader |
| `app/utils/realm/map-modes.ts` | Base maps, lenses, and realm/career/education colors |
| `app/utils/realm/career.ts` | Jobs and schooling → towns (`TOWNS`, `LOCATION_TOWN`, `OFFICE_TOWN`, `SCHOOL_TOWN`), each holding with its full write-up |
| `app/utils/realm/dispatches.ts` | Event-queue order and read state (localStorage) |
| `app/data/character.ts` | Character sheet content (placeholders) and house arms |
| `app/components/realm/RealmCharacterBanner.vue`, `RealmCharacterSheet.vue` | Top-left banner and full sheet |
| `app/components/realm/RealmEvent.vue` | The frame every event pop-up shares (kicker, plate, title, options) |
| `app/components/realm/RealmDispatch.vue`, `RealmRecord.vue` | A blog post as a sealed letter; the full record of a post or degree |
| `app/components/realm/RealmLetter.vue`, `RealmLetterCase.vue`, `RealmSeal.vue` | An opened letter on parchment; the letter case; the wax seal and its break |
| `app/pages/index/blog/` | The letter and letter case routes, nested in the map page |
| `app/composables/useLetters.ts`, `useModalFocus.ts` | Letter routing and the seal-break delay; the focus trap every pop-up shares |
| `app/components/realm/RealmTown.vue` | A town's map marker: icon, nameplate, lens states |
| `app/components/realm/RealmHeraldicShield.vue` | SVG coats of arms (house arms or seeded per title) |
| `scripts/map/build-map.mjs`, `scripts/portrait/build-portrait.mjs` | Asset pipelines |

A new job in a new place needs a town in `TOWNS` (name, county FIPS, longitude/latitude)
and its location mapped in `LOCATION_TOWN` (or `OFFICE_TOWN` for a remote role) in
`career.ts`. `tests/realm-career.test.ts` fails until it has one, so a job can't silently
drop off the map.

## Letters

- `/blog` and `/blog/<slug>` are child routes of the map page (`app/pages/index/blog/`),
  rendered by a `<NuxtPage>` at the end of `index.vue`. The map page stays mounted, so
  opening and closing letters never reloads the map. A shared link prerenders as the map
  with the letter open: its text, title and canonical are in the HTML
  (`scripts/verify-generated.mjs` checks this on every build).
- They behave like a stack (`useLetterRoutes` in `app/composables/useLetters.ts`): opening
  pushes, paging (next letter, letter → letter case) replaces, and closing (Escape, ×,
  the backdrop, the last option) goes Back to the map or letter case it came from. A
  visitor who landed on a letter goes on to the map.
- A letter is **read** once it's open, not when its dispatch pop-up shows; that drives
  the unread badge and the seals in the letter case. The dispatch queue still opens
  unread first.
- Map keys (WASD, arrows) are ignored inside any `aria-modal` pop-up, so arrows scroll a
  letter instead of moving the camera.

## Gotchas

- **Stop the dev server before `typecheck` or `build`.** Running either alongside
  `nuxt dev` breaks the Nuxt Content SQLite DB ("no such table: _content_blog"); restart
  the dev server afterwards.
- Blog frontmatter uses `summary`, not `excerpt`: Nuxt Content overwrites `excerpt`.
- Components under `app/components/realm/` must be named `Realm*.vue` to auto-import as
  `<RealmX>` (otherwise Nuxt prefixes the folder name).
- `.client.vue` components need `await nextTick()` in `onMounted` before template refs
  exist.
- Don't name a GLSL function `luminance`; it collides with three's shader prefix.
- Town markers are DOM elements the renderer moves each frame (`setMarkers` /
  `placeMarkers`), not three.js sprites, so they're real buttons. Only the icon (and the
  nameplate while it shows) takes the pointer; the wheel listener is on the map's
  container so scrolling over a marker still zooms.
- `flyTo` returns a promise: true when the camera lands, false if anything interrupts
  the flight. Records open off that, so an interrupted flight never pops one up.
- Hot-reloading `index.vue` in an open tab can throw Vue `Transition` errors ("reading
  'Symbol(_leaveCb)'") into the dev log. They're an HMR artifact; a page reload clears
  them and fresh loads don't produce them.
- Label textures are uploaded at load (`initTexture`). Left lazy, the first zoom that
  revealed dozens of county labels uploaded them in one frame and hitched.
- Headless SwiftShader renders ~1 fps (less mid-flight), so measure motion by stepping
  `tick` with a fake clock and stubbed `render` rather than timing real frames. Vue's
  `<Transition>` needs two frames to start, so the county panel can sit invisible for
  seconds in a headless shot: wait until no `.fade-enter-active` remains before shooting.
- If the mesh exaggeration changes, update `SHADING_RELIEF` in `build-map.mjs` and rebuild.
- The renderer's world scale is fixed in km (`KM_PER_UNIT`), so changing `BOUNDS` and
  rebuilding doesn't change how zoom levels, labels or tilt feel. `MAP_WIDTH` stays 4096
  px (the largest texture every WebGL device takes), so wider bounds cost detail per km.
- Lake Erie's water level is applied by region (`LAKE_ERIE` in `build-map.mjs`); other
  water is sea level. Widening north to Lake Ontario would need its level added too.
- The event pop-ups and letters are modal: `useModalFocus` keeps Tab inside them. The
  character sheet isn't modal and doesn't.
- Headless SwiftShader also slows the browser's smooth scrolling: a second key press
  inside a letter can look ignored for seconds. It isn't; wait longer.
- `scripts/verify-preview.mjs` still checks the pre-map site (the side nav on `/`, the
  old blog pages), so it fails against the current site until it's rewritten.

## Verifying visually

Every visual change was checked with headless screenshots at 1920×960 (a real browser
window's shape), 1440×900 and 390×844. WebGL
needs SwiftShader in headless Chromium, which is slow, so use long timeouts and
`animations: 'disabled'`:

```js
chromium.launch({
  executablePath: '~/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
// wait until `.realm-veil` is gone before shooting
```

If WebGL hangs on `getContext`, run the script with `env -u DISPLAY -u WAYLAND_DISPLAY`:
when WSLg's X server is wedged, Chromium's GPU process waits on it forever.

## Possible next steps (ask first)

- Make the neighbors' counties real provinces (hover names, selectable). There's room
  in the 8-bit county id, but the client assumes every county id is a PA county.
- Replace the stopgap portrait with a painted one.
- `DEFAULT_DESCRIPTION` in `app/utils/site.ts` and the side nav's subtitle still say
  "Software Engineer · AI Systems"; the NESL title is IT Solutions Architect.
- Pick up the deferred items above once the map feels finished.
