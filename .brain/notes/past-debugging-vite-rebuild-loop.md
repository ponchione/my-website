# Past debugging: vite rebuild loop

Date: 2026-04-07
Family: debug-history
Symptom: vite dev server kept restarting in a tight rebuild loop the moment the
project was opened. The terminal scrolled forever with `page reload` and
`hmr update` lines and the browser tab never finished loading.

## Root cause

A postbuild step was emitting a generated TypeScript barrel file directly into
`src/generated/index.ts`, and `src/` was inside vite's default watch path. Each
rebuild rewrote the barrel, vite saw the watched file change, and that
triggered another rebuild. Classic feedback loop.

## Fix

Moved the generated barrel out of `src/` entirely. The new path is
`.generated/barrel.ts` at the repo root, and the import in `src/main.ts` was
updated to a path alias (`@generated/barrel`) configured in `vite.config.ts`
and `tsconfig.json`. The `.generated/` directory is gitignored and excluded
from vite's watcher via `server.watch.ignored`.

## Workaround

Before the proper fix landed, the temporary workaround was to start vite with
`--force` and then immediately kill the postbuild watcher: `pkill -f
"postbuild --watch"`. That broke the loop but also broke the generated barrel
refresh, so it was only acceptable for short debugging sessions.

## Why this matters

Anything written into a vite-watched directory by a build-time step is a
landmine. Generated files MUST live outside `src/` (or any other watched
path) and MUST be referenced via a path alias so the source tree never has
to know where they really live. If you see a vite rebuild loop again, the
first thing to check is whether some script is writing into a watched
directory.
