# Keystone: a campaign on the realm map

Status (2026-10-20): phases 1 (the engine) and 2 (the watchable realm) are built on the
`keystone` branch (`origin/keystone`), not merged to `main`; a push to `main` deploys.
The branch also carries the guided tour and the MP monogram. Phase 3's first playable
slice is in: `/play` asks for a starting county (or Let fate decide), your house plays
against eight computer houses, the top-left panel summarizes your house, and the
bottom-right county panel gives Develop, Raise levies here or Disband, March here,
Declare war and Offer (or Accept) peace; Move the army, then a click on a county, also
marches. The map page passes its clicks and selection through `REALM_STAGE`. Saves and
the end screens are next. The map build writes each county's neighbors, development and
terrain to `app/data/map/keystone.json`; the engine is under `app/utils/keystone/`, with
tests in `tests/keystone.test.ts` and the balance harness at `scripts/keystone/simulate.ts`,
which meets every target (see Testing). The numbers below are the tuned ones.

Phase 2 as built: the banner has a Play link (not prefetched). At `/play` the map page
(`index.vue`) hides the résumé (banner, county panel, dock, tour, towns, tooltip) and
provides a `REALM_STAGE` (`app/utils/realm/stage.ts`) that the game fills with its
palette and army banners; `RealmMap` takes its palette as a prop. `play.vue` generates a
seeded computer-only world, spreads the houses over 1.5 s, starts paused, and shows the
houses top left, the date, pause and speeds (Space, 1–3) top right and the chronicle
bottom left. Display code is `app/utils/keystone/display.ts`; the banner marker is
`KeystoneArmy.vue`. Two departures from "How it fits": the résumé UI still lives in
`index.vue`, hidden by `v-if`, rather than in its own component (the guided tour landed
there at the same time; do the split when it pays for itself), and the campaign isn't
saved yet (phase 3). `verify-generated.mjs` checks that the home page loads no engine
code.

## What it is

A short single-player grand-strategy game on the realm map, a hyper-distilled EU/CK. You
lead one of nine medieval houses carving up Pennsylvania's 67 counties. The campaign runs
fifty years in game time and ten to fifteen minutes in real time, then ends with a
chronicle and a score.

The site is still a résumé site first. A visitor finds the game by pressing Play; nobody
has to get past it to see the résumé.

## Constraints

Mitchell: "Remember, this is to be constrained."

- **The rules fit on one page.** The Rules section below is the whole game. A new
  mechanic gets written there first; if it doesn't fit, it doesn't go in.
- **No server.** No accounts, leaderboards or shared world. The game runs in the browser
  and saves to it.
- **The home page doesn't pay for the game.** `/` looks, loads and behaves as it does
  today. The game's code downloads only when someone presses Play.
- **The computer plays by your rules.** Computer houses get no hidden bonuses, so there are
  no extra rules to write.
- **Every phase ships on its own.** If work stops after any phase, the site is still whole.
- **The rules are plain TypeScript.** The engine knows nothing about Vue, the DOM or the
  renderer, so it runs and is tested in Node at full speed.

## Decided (don't relitigate)

- Name: **Keystone**.
- A separate page at **`/play`**. You enter it with a **Play** button on the top-left
  banner, and a transition plays (below).
- Medieval framing: houses, levies, keeps, gold, truces. Say **county**, never
  "province", as on the map.
- A seeded RNG generates every campaign: the houses, their rulers and the dice. The same
  seed and the same orders always play out the same way.
- Single player against eight computer houses.
- Saves are local only: one autosaved campaign per browser.
- No fog of war, as on the map.
- The game marks no county as Mitchell's home or capital. The visitor picks where their
  own house begins.

## Entering the game

`/play` is a child route of the map page, like the letters under `/blog`. It has a real
URL, so Back works, links work and the page can be prerendered. The map stays mounted, so
entering the game never reloads the 3D map. The "page transition" is an animation on that
one map:

1. **Play.** A Play link on the character banner pushes `/play`. It's a real link, so it
   can also be opened in a new tab.
2. **The résumé steps aside.** The banner, map-mode dock, county panel and town markers
   fade and slide off their edges, and any lens is cleared. The camera flies back to the
   opening view. Neighboring realms fade to grey and Pennsylvania to an unclaimed
   parchment tone.
3. **Choose where your house begins.** A prompt asks for a county and offers "Let fate
   decide" for a random one. If a campaign is saved, the prompt first asks Continue or
   New campaign.
4. **The houses rise.** Clicking a county generates the world. Each house's color spreads
   out from its seat, county by county, in the order the generator assigned them, over
   about 1.5 s. The animation is the world being generated.
5. **The court assembles.** Your house banner slides into the top-left corner where the
   résumé banner was, and the date ticker slides into the top-right. The game starts
   paused.

Leaving (Back, or "Return to the map") autosaves and plays the transition in reverse.
Opening `/play` directly shows the usual "Surveying the land…" veil, then skips to step 3.
With reduced motion, every step is a crossfade.

## The board

- The 67 Pennsylvania counties. Neighboring realms are scenery; armies can't enter them.
- The map build computes, for each county, and writes to `app/data/map/keystone.json`
  (kept out of `pennsylvania.json`, which the home page loads):
  - **Neighbors**, from the Census county adjacency file, cross-checked against the
    province raster: a pair must also share at least 8 pixels of edge (about 1.3 km).
    Counties that touch only at a corner don't count. `NEIGHBOR_OVERRIDES` in
    `build-map.mjs` settles the six pairs where the two disagree, and the build fails on
    any it doesn't settle. Allegheny–Armstrong turned out to be a corner: the four
    counties meet at Freeport, the Census file lists the other diagonal
    (Butler–Westmoreland, which shares 20 m), and neither diagonal counts. Elk–Warren and
    Forest–McKean (another four-county corner), Northumberland–Perry and Dauphin–Juniata
    (one shared vertex) are dropped too. Butler–Clarion is kept: a real border, 0.6 km
    long. That leaves 166 borders, and every county has 2–9 neighbors.
  - **Development** from Census 2020 population on a log scale between the smallest
    county and the largest, 1–5 at the start: Philadelphia, Allegheny and Montgomery are
    5, Cameron, Forest and Sullivan are 1, and the 67 add up to 204.
  - **Terrain** from local relief: the elevation range within about 2.3 km of each
    point, averaged over the county. Under 150 m is flat (23 counties), under 250 m
    hills (31) and the rest mountains (13). The ridge-and-valley belt and the Allegheny
    Front come out as hills and mountains, the Piedmont and the north-west as flat.

## Rules

Time advances a month per tick, Paradox style, with pause and three speeds (2 s, 1 s and
0.5 s per month). A campaign runs from 1 January 1200 to 1 January 1250: 600 months, or
about ten minutes at the middle speed. Gold and men are whole numbers, rounded down.

**Houses.** There are nine: yours and eight generated ones. The generator spreads nine
seats across the state, each as far as it can be from those before it, with yours at the
county you picked. It then grows each house outward one county at a time, taking turns:
each takes the free county nearest its seat that borders its land, until every county is
held. Every house starts with about seven counties (6–9 for nine in ten), no gold and a
full levy pool; what differs is their wealth and terrain. Starting in Philadelphia is the
easy game (about 30 development against the others' 22) and starting in Cameron is the
hard one (about 19 against 23). A house is named for its seat county ("House of
Westmoreland"). Each house shows a rank, which has no effect on play: Count (1–4
counties), Duke (5–14) or King (15+). Whoever holds all 67 is King of Pennsylvania.

**Gold.** Each month a house earns 1 gold per point of development it holds and pays
1 gold per 200 men in its army. If its gold would fall below zero, its army disbands.

**Levies.** A house's levy pool holds at most 100 men per point of development it holds,
and refills by 1/16 of that each month. **Raise levies** musters the whole pool as the
house's one army, in any county the house holds. **Disband** returns the survivors to the
pool.

**Develop.** Spend 100 × a county's development in gold to raise its development by 1.
The maximum is 10.

**War.** A house may **declare war** on a house it borders, as long as neither is already
at war and the two have no truce. A house fights one war at a time. During a war, its army
may enter its own counties and the enemy's, and nowhere else.

**Movement.** You pick a destination county, and the army takes the quickest legal route.
Each county takes one month to cross, or two if it's mountains. An army can't leave a
county that holds a hostile army; they fight first.

**Battles.** Hostile armies that share a county at a tick fight once. Each side's
strength is its men × a roll between 0.8 and 1.2. The army whose house holds the county
also gets ×1.25 in hills or ×1.5 in mountains. Let r be the winner's strength ÷ the
loser's. The loser loses 30% × r of its men (all of them once r reaches 3.33) and
retreats to its nearest other county. The winner loses 10% ÷ r. An army that drops below
100 men, or has nowhere to retreat, is destroyed.

**Taking counties.** An army that stands alone in an enemy county, neither marching nor
fighting, takes it after 2 months on flat land, 3 in hills or 4 in mountains, with 1 more
at a house's seat. The county changes hands at once. A house that loses its seat moves
the seat to its most developed county. A house with no counties left is gone.

**Peace.** Either side may **offer peace**, and counties stay with whoever holds them. A
war's score for each side is the development it has taken from the other minus the
development it has lost. A computer house accepts peace if its score is 0 or less, or once
the war has lasted 2 years. It offers peace when its score is below 0 and its army is
gone, or at 2 years. An offer that isn't taken stands, and the other side can take it
later. Peace disbands both armies and starts a 5-year truce between the two houses.

**The end.** Holding all 67 counties is victory, and losing your last county is defeat.
If you reach 1250, the game ends and scores you: your share of Pennsylvania's
development in percent, plus 10 for every surviving house you outrank. Every ending shows
the chronicle.

**Your actions** are develop, raise levies (or disband), move your army, and declare war
(or offer peace). Orders take effect at once, paused or not. Only the monthly tick rolls
dice.

**Rulers** (phase 4). Each house has a generated ruler with a name, an age and three
skills from 0 to 10. Each skill shifts one number by 4% per point away from 5: Martial
changes battle strength, Stewardship changes income, and Learning changes the cost to
develop (higher is cheaper). Rulers age and die, more likely the older they are, and a
generated heir succeeds them. Only the house carries over.

**Events** (phase 4). About a dozen events, each with two choices, open in the existing
event pop-up. One reaches you every 18–30 months. An event only changes numbers that
already exist: gold, levies, development, a skill or a ruler's health. No event adds a
mechanic. Computer houses don't get events.

**The chronicle.** The engine records the notable moments: wars declared and ended,
battles, counties taken, rulers who died and houses that fell. A short feed shows the
latest lines during play, and the end screen shows all of them.

## The computer houses

Every computer house works through the same short list each month and gives only legal
orders, through the same rules as yours:

- **Always:** develop its cheapest county when its gold covers the cost plus six months
  of full-army upkeep.
- **At peace:** disband. Each month there's a 1 in 12 chance it declares war on the
  weakest house it borders (by maximum levy). It only does so if its own maximum levy is
  at least the target's and it can afford six months of upkeep.
- **At war:** once its pool is at least a quarter full, raise levies in its most developed
  county on the enemy's border. Attack the enemy army if it is at least 10% stronger. If
  it is at least 10% weaker, fall back to its best defensive county within two counties
  of the enemy army. Otherwise keep besieging, or march on the enemy county with the most
  development per month of marching and siege.
- **Peace:** as in the rules.

The exact weights live in code (`RULES` in `rules.ts`, `AI` in `ai.ts`) and get tuned
with the balance harness, not by feel. Two findings from tuning: a losing house that
raised every trickle of 100 men kept the winner chasing it instead of besieging, so the
computer waits for a quarter of its pool; and with the starting numbers (5-year wars,
1/24 refill, sieges of 1–3 months, develop at 40 ×) one house united Pennsylvania in more
than half of all games and every county reached development 10 by the 1220s.

## Screens

- **Top-left, your house:** arms, name and rank; gold, with income per month; levies
  (available and maximum, or the army's size once raised); and counties held. During a
  war it also names the enemy and shows the war score. Phase 4 adds the ruler.
- **Top-right, the date:** a date such as "1 March 1203", a pause button and three speed
  pips. Space pauses, and 1–3 set the speed.
- **The map:** each county in its house's color, using the existing 256-entry palette with
  one entry per county, and the neighboring realms in grey. A raised army is a banner
  marker at its county's label point, like the town markers, with the house's arms and a
  number plate. To move yours, select it and then click a county.
- **Bottom-right, the selected county:** name, owner, development, terrain, the levies it
  provides and siege progress. Your own county offers Develop and either Raise levies
  here or Disband. A neighbor's county offers Declare war or Offer peace.
- **Bottom-left, the chronicle feed:** the last few lines.
- **End screen:** uses the event pop-up frame to show the outcome, the score and the
  chronicle, with New campaign and Return to the map.

The game pauses itself when war is declared on you, when an event arrives and when the
campaign ends.

## Saves

- One campaign is autosaved to `localStorage` (`keystone.campaign`) at every new month
  and when you leave `/play`.
- A save is `{ version, savedAt, state }` and takes a few KB. The state includes the RNG's
  position, so a loaded game continues exactly as it would have.
- When a rules change makes old saves meaningless, `version` goes up. An outdated save
  shows "This campaign was begun under older laws" with a New campaign button. Saves are
  never migrated.

## Engine

Plain TypeScript under `app/utils/keystone/`:

```ts
newGame(seed: number, start: CountyId | null): GameState // null: no player (phase 2)
apply(state: GameState, order: Order): GameState // one order, at once; throws if illegal
step(state: GameState): GameState // one month: computer houses, movement, battles, sieges, gold
```

- No Vue, Nuxt, DOM, `Math.random` or `Date` inside it. It uses one seeded RNG, whose
  state is part of `GameState`.
- Only arithmetic and `floor`/`round`/`min`/`max`, so every browser gets the same result.
  Anything like `log`, such as the development scale, is precomputed by the map build.
  The RNG is mulberry32, on 32-bit integer operations.
- Houses and counties are processed in id order.
- Only relative imports and erasable TypeScript (no enums), so Node 24 runs it directly
  for the harness.
- As a rough guard, if the engine grows past ~1,000 lines, something out of scope has
  crept in.

## How it fits into the site

- `app/pages/index.vue` (970 lines) becomes a thin shell holding the map, the loading veil
  and the child route. The résumé UI moves into its own component. The game UI lives
  under `app/pages/index/play.vue` and loads lazily.
- The palette and markers come from whichever side is showing, so `RealmMap` takes its
  palette as a prop instead of building it from `base`/`lens`.
- `overLetters` (`route.path !== '/'`) and the Escape handling have to stop treating
  `/play` as a letter.
- `/play` joins the known routes and the sitemap (`tests/routes.test.ts`).
- Components go in `app/components/keystone/` and are named `Keystone*.vue`, following the
  same rule as `Realm*`.

## Testing

- **Engine (vitest):**
  - The same seed and orders give an identical state after 600 months.
  - Adjacency is symmetric and connected, and includes the fixes.
  - The invariants hold every month over many seeds: each county has one owner, armies
    are only where they're allowed, each house has at most one war, truces are respected
    and gold never goes negative.
  - Saving, loading and continuing matches an uninterrupted run.
- **Balance harness** (`node scripts/keystone/simulate.ts --games 500`): plays
  computer-only campaigns and prints how often Pennsylvania is united and when, how many
  houses are alive in 1250, wars and battles per decade, and run time. Starting targets:
  - No house unites Pennsylvania before 1250 in at least 80% of games, which leaves the
    win to you.
  - At least three houses survive the median game.
  - Some war is going on most of the time.
  - 600 months run in under 200 ms.

  Phase 1 result, seeds 1–500 (seeds 501–1000 match within a point): Pennsylvania was
  never united. A median of 4 houses survive (3–5 from the 10th to the 90th percentile),
  and the first falls around 1207. Some war is on in 88% of months. Each decade has 8.4
  wars, 50 battles and 16 counties taken; the median war lasts its full 2 years and takes
  1 county (4 at the 90th percentile). Development grows from 204 to about 560. A
  campaign's 600 months run in 17 ms at the median and 70 ms at the slowest, in Node.
- **Site:**
  - The existing checks still pass.
  - Headless screenshots of `/`, taken before and after as `REDESIGN_HANDOFF.md`
    describes, show no change.
  - Every transition step and game screen is captured at 1920×960, 1440×900 and 390×844.
  - The home page's JavaScript grows by no more than the Play link.

## Phases

Each phase ends with something that works.

1. **The engine.** The map build additions (neighbors, development, terrain), the rules,
   the computer houses, the tests and the balance harness. Nothing on the site changes.
   Done when the harness meets its targets.
2. **The watchable realm.** The shell refactor, `/play`, the Play link and transition, house
   colors, army banners, the date and speeds, and the chronicle feed. There's no county
   pick yet: the world generates without you, and nine computer houses fight while you
   watch. This is the first phase that touches the live site.
3. **You play.** Picking a county, the actions, the county panel, saves and the end
   screens.
4. **Depth.** Rulers and succession, events and the full chronicle.
5. **Polish.** Thicker borders between houses (a shader change), armies that walk between
   counties instead of jumping, a route line for your army, a layout designed for phones
   (until then it only has to work on them) and a link preview for `/play`.

## Out of scope

- Alliances, and any diplomacy beyond war and peace.
- Vassals, marriages, and any characters beyond each house's ruler.
- More than one army per house, and navies.
- Trade, religion, culture and technology.
- Playing as the neighboring realms.
- Multiple save slots, shared seeds, leaderboards and multiplayer.
- Sound.
- Fog of war.

## Defaults (tweak later if needed)

Mitchell, 2026-10-16: use the best defaults for now. These were open questions:

- The start year is **1200**. Any medieval year works since the history is invented; it's
  `RULES.startYear` in `app/utils/keystone/rules.ts`.
- Houses are named for their **seat county** ("House of Westmoreland"), not generated
  family names: the name says where a house is on the map, and there's no name generator
  to build. It's `houseName` in `app/utils/keystone/engine.ts`.
- Keystone's county data lives in its own `keystone.json`, so the home page doesn't pay
  for it (the build first put it in `pennsylvania.json`, which added 0.8 KB gzipped).

## Backlog: a second game

A railroad-building game, a super-distilled Ticket to Ride on the same map. It would
probably use the industrial-Pennsylvania framing (coal, steel, rail) that Keystone passed
on. It hasn't been started; pick it up after Keystone ships. It could reuse Keystone's
county graph, its seeded-engine pattern, `/play` and the transition.
