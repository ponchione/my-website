// How a campaign looks on the realm map: house colors, the counties' palette, army
// banners and chronicle lines. The UI's side of Keystone; the rules don't use it.

import { countyById, realmById } from '~/utils/realm/map-data'
import { NEUTRAL, palette, shade, type MapModePalette, type Rgb } from '~/utils/realm/map-modes'
import type { ArmyBanner } from '~/utils/realm/stage'
import { county, dateOf, type Entry, type GameState, type HouseId } from './engine.ts'

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
// neighboring realms in grey.
export function campaignPalette(owner: (countyId: number) => HouseId): MapModePalette {
  return {
    counties: palette((id) => {
      if (!countyById(id)) return undefined
      const holder = owner(id)
      return holder < 0 ? [...shade(UNCLAIMED, id, 0.04), 255] : [...shade(HOUSE_COLORS[holder]!, id), 255]
    }),
    realms: palette(id => (realmById(id) ? [...NEUTRAL, 120] : undefined)),
    overlay: 1,
  }
}

// A raised army stands at its county's label point. Two in one county (about to fight)
// stand side by side.
export function armyBanners(s: GameState): ArmyBanner[] {
  const raised = s.houses.filter(h => h.army)
  return raised.map((h) => {
    const army = h.army!
    const here = raised.filter(other => other.army!.county === army.county)
    const label = countyById(army.county)!.label
    const shift = (here.indexOf(h) - (here.length - 1) / 2) * 0.012
    return { id: `army-${h.id}`, at: [label[0]! + shift, label[1]!], house: h.name, color: houseColor(h.id), men: army.men }
  })
}

// A chronicle entry as a line of text, with each house's name marked for its color.
export type LinePart = { text: string, house?: HouseId }

export function chronicleLine(s: GameState, entry: Entry): LinePart[] {
  const who = { text: s.houses[entry.house]!.name, house: entry.house }
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
