import pennsylvania from '~/data/map/pennsylvania.json'

// Shape of app/data/map/pennsylvania.json, written by scripts/map/build-map.mjs.
// Label anchors are normalized map coordinates (0,0 = north-west corner) and
// label radii are fractions of the map width.

export type MapLabel = {
  label: number[]
  labelRadius: number
}

export type Terrain = 'flat' | 'hills' | 'mountains'

// Keystone's board: neighbors share a border (corners don't count), development is
// 1–5 from Census 2020 population on a log scale, and terrain comes from local relief.
export type MapCounty = MapLabel & {
  id: number
  fips: string
  name: string
  areaKm2: number
  neighbors: number[]
  development: number
  terrain: Terrain
}

export type MapRealm = MapLabel & {
  id: number
  code: string
  name: string
}

export type RealmMapData = {
  bounds: { west: number, east: number, south: number, north: number }
  map: { width: number, height: number }
  terrain: { width: number, height: number, minElevation: number, maxElevation: number, groundWidthKm: number }
  ranges: { countyBorder: number, realmBorder: number, water: number }
  realms: MapRealm[]
  counties: MapCounty[]
}

// JSON imports type every string as string; the build writes only Terrain values.
export const mapData = pennsylvania as RealmMapData

export const HOME_REALM_CODE = 'PA'

export type MapPick =
  | { kind: 'county', id: number }
  | { kind: 'realm', id: number }

// Where a longitude/latitude falls on the map, in the label anchors' coordinates. The
// map is in Web Mercator, as scripts/map/build-map.mjs draws it.
export function locate([longitude, latitude]: readonly [number, number]): [number, number] {
  const y = (degrees: number) => Math.log(Math.tan(Math.PI / 4 + (degrees * Math.PI) / 360))
  const { west, east, south, north } = mapData.bounds
  return [(longitude - west) / (east - west), (y(north) - y(latitude)) / (y(north) - y(south))]
}

export function countyById(id: number) {
  return mapData.counties.find(county => county.id === id)
}

export function countyByFips(fips: string) {
  return mapData.counties.find(county => county.fips === fips)
}

export function realmById(id: number) {
  return mapData.realms.find(realm => realm.id === id)
}
