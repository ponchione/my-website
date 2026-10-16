// The 67 counties as scripts/map/build-map.mjs wrote them: who borders whom, how
// developed each starts, and its terrain. Fixed for the whole campaign.

import map from '../../data/map/pennsylvania.json' with { type: 'json' }
import type { MapCounty, Terrain } from '../realm/map-data.ts'

export type { Terrain }

// The map's county id, 1–67, in alphabetical order.
export type CountyId = number

export type County = {
  id: CountyId
  name: string
  neighbors: CountyId[]
  development: number
  terrain: Terrain
}

const counties = map.counties as MapCounty[]

export const COUNTY_IDS: CountyId[] = counties.map(c => c.id).sort((a, b) => a - b)

// Indexed by id; slot 0 is empty.
const COUNTIES: County[] = []
for (const c of counties) {
  COUNTIES[c.id] = { id: c.id, name: c.name, neighbors: c.neighbors, development: c.development, terrain: c.terrain }
}

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
