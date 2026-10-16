// The 67 counties as scripts/map/build-map.mjs wrote them to keystone.json: who borders
// whom, how developed each starts, and its terrain. Fixed for the whole campaign. It's a
// file of its own so the home page, which loads pennsylvania.json, doesn't carry it.

import board from '../../data/map/keystone.json' with { type: 'json' }

export type Terrain = 'flat' | 'hills' | 'mountains'

// The map's county id, 1–67, in alphabetical order.
export type CountyId = number

export type County = {
  id: CountyId
  name: string
  neighbors: CountyId[]
  development: number
  terrain: Terrain
}

// JSON imports type every string as string; the build writes only Terrain values.
const counties = board.counties as County[]

export const COUNTY_IDS: CountyId[] = counties.map(c => c.id).sort((a, b) => a - b)

// Indexed by id; slot 0 is empty.
const COUNTIES: County[] = []
for (const c of counties) COUNTIES[c.id] = c

export function county(id: CountyId): County {
  const found = COUNTIES[id]
  if (!found) throw new Error(`No county ${id}`)
  return found
}

// Fewest county-to-county steps from any of `sources` to every county, ignoring owners.
export function hops(sources: CountyId[]): number[] {
  const distance: number[] = Array(COUNTIES.length).fill(Infinity)
  const queue = [...sources]
  for (const c of sources) distance[c] = 0
  for (let i = 0; i < queue.length; i++) {
    const c = queue[i]!
    for (const n of county(c).neighbors) {
      if (distance[n] !== Infinity) continue
      distance[n] = distance[c]! + 1
      queue.push(n)
    }
  }
  return distance
}
