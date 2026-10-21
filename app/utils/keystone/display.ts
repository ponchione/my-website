// How a campaign looks on the realm map: house colors, the counties' palette, army
// banners and chronicle lines. The UI's side of Keystone; the rules don't use it.

import { countyById, realmById } from '~/utils/realm/map-data'
import { NEUTRAL, palette, shade, type MapModePalette, type Rgb } from '~/utils/realm/map-modes'
import type { ArmyBanner, ArmyRoute } from '~/utils/realm/stage'
import {
  county, crossing, dateOf, eventById, nextStep, outcome, routes, type CountyId, type Effect, type Entry, type GameState, type House, type HouseId,
} from './engine.ts'

// One per house, by house id: strong enough to read over the terrain, apart from one
// another, and none of them the unclaimed parchment.
export const HOUSE_COLORS: Rgb[] = [
  [178, 54, 46], // crimson
  [48, 92, 170], // azure
  [60, 128, 66], // green
  [214, 164, 50], // gold
  [118, 66, 148], // purple
  [40, 140, 140], // teal
  [206, 108, 44], // orange
  [196, 96, 146], // rose
  [118, 84, 54], // brown
]

const UNCLAIMED: Rgb = [214, 196, 154]

export const houseColor = (id: HouseId) => `rgb(${HOUSE_COLORS[id]!.join(' ')})`

// Each county in its owner's color (`owner` gives -1 for none yet: parchment), and the
// neighboring realms in grey. Each house's counties are one group, so a thick border
// runs between houses.
export function campaignPalette(owner: (countyId: number) => HouseId): MapModePalette {
  const groups = new Uint8Array(256)
  for (let id = 1; id < 256; id++) if (countyById(id)) groups[id] = owner(id) + 1
  return {
    groups,
    counties: palette((id) => {
      if (!countyById(id)) return undefined
      const holder = owner(id)
      return holder < 0 ? [...shade(UNCLAIMED, id, 0.04), 255] : [...shade(HOUSE_COLORS[holder]!, id), 255]
    }),
    realms: palette(id => (realmById(id) ? [...NEUTRAL, 120] : undefined)),
    overlay: 1,
  }
}

const labelOf = (c: CountyId) => {
  const [x, y] = countyById(c)!.label
  return [x!, y!] as const
}

// The next county an army's march takes it into, if it's on its way.
function nextOf(s: GameState, h: House): CountyId | null {
  const army = h.army!
  return army.target === null ? null : nextStep(s, h.id, army.county, army.target)
}

// A raised army stands at its county's label point, or partway along the road to the
// next county, as far as its months of marching have taken it (a mountain county takes
// two). Until it enters, it stays on its own side of the border, about halfway between
// the two label points, so two armies marching on each other's counties never seem to
// meet. Two in one county (about to fight) stand side by side. `glide` is how long each
// takes to walk there from where it stood.
export function armyBanners(s: GameState, glide = 0): ArmyBanner[] {
  const raised = s.houses.filter(h => h.army)
  return raised.map((h) => {
    const army = h.army!
    const here = raised.filter(other => other.army!.county === army.county)
    const [x, y] = labelOf(army.county)
    const next = nextOf(s, h)
    const [nx, ny] = next === null ? [x, y] : labelOf(next)
    const along = next === null ? 0 : (army.march / crossing(next)) * 0.5
    const shift = (here.indexOf(h) - (here.length - 1) / 2) * 0.012
    return {
      id: `army-${h.id}`,
      at: [x + (nx - x) * along + shift, y + (ny - y) * along],
      house: h.name,
      color: houseColor(h.id),
      men: army.men,
      glide,
    }
  })
}

// The visitor's army's march, county by county along the quickest legal route, or null
// if it isn't marching.
export function armyRoute(s: GameState): ArmyRoute | null {
  const h = s.player === null ? null : s.houses[s.player]!
  const army = h?.army
  if (!h || !army || army.target === null || nextOf(s, h) === null) return null
  const { previous } = routes(s, h.id, army.county)
  const path = [army.target]
  while (path[0] !== army.county) path.unshift(previous[path[0]!]!)
  return { at: path.map(labelOf), follow: `army-${h.id}` }
}

// A chronicle entry as a line of text, with each house's name marked for its color.
export type LinePart = { text: string, house?: HouseId }

export function chronicleLine(s: GameState, entry: Entry): LinePart[] {
  const who = { text: s.houses[entry.house]!.name, house: entry.house }
  if (entry.kind === 'died') return [{ text: `${entry.ruler} of ` }, who, { text: ` died at ${entry.age}; ${entry.heir} succeeds` }]
  if (entry.kind === 'event') {
    const choice = eventById(entry.event).choices[entry.choice]!
    return [{ text: `${entry.ruler} of ` }, who, { text: ` ${fill(choice.past, entry.ruler, entry.county)}` }]
  }
  const other = { text: s.houses[entry.other]!.name, house: entry.other }
  switch (entry.kind) {
    case 'war': return [who, { text: ' declared war on ' }, other]
    case 'peace': return [who, { text: ' made peace with ' }, other]
    case 'fell': return [who, { text: ' fell to ' }, other]
    case 'battle': return [who, { text: ' beat ' }, other, { text: ` in ${county(entry.county).name}` }]
    case 'taken': return [who, { text: ` took ${county(entry.county).name} from ` }, other]
  }
}

// "March 1203": the month an entry happened in.
export const entryDate = (entry: Entry) => dateOf(entry.month).slice(2)

// An event's words with the ruler's and the county's names in.
export const fill = (text: string, ruler: string, c: number) => text.replaceAll('{ruler}', ruler).replaceAll('{county}', county(c).name)

const SKILLS = { martial: 'Martial', stewardship: 'Stewardship', learning: 'Learning', health: 'health' } as const

// What a choice does, as the event pop-up lists it: "−88 gold · +1 Martial".
export function effectText(s: GameState, effect: Effect, c: number): string {
  const o = outcome(s, effect)
  const signed = (n: number) => (n > 0 ? `+${n}` : `−${-n}`)
  const parts = [
    o.gold && `${signed(o.gold)} gold`,
    o.levies && `${signed(o.levies)} levies`,
    o.development && `${signed(o.development)} development in ${county(c).name}`,
    ...(['martial', 'stewardship', 'learning', 'health'] as const).map(k => o[k] && `${signed(o[k])} ${SKILLS[k]}`),
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : 'Nothing changes'
}
