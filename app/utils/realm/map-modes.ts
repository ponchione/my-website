import { careerHoldings, educationHoldings, type Holding } from './career'
import { mapData } from './map-data'

// The base map is how the land is drawn; a lens lights up the counties where part of
// the story happened, on top of either base.
export type BaseMapId = 'political' | 'terrain'
export type LensId = 'career' | 'education'

export type MapModePalette = {
  // 256 RGBA entries indexed by county id / realm id. Alpha scales the overlay.
  counties: Uint8Array
  realms: Uint8Array
  // Overall strength of the color overlay on top of the terrain.
  overlay: number
}

export type Rgb = [number, number, number]

export const BASE_MAPS: { id: BaseMapId, label: string, hint: string }[] = [
  { id: 'political', label: 'Political', hint: 'Realms and their counties' },
  { id: 'terrain', label: 'Terrain', hint: 'The land itself' },
]

export const LENSES: { id: LensId, label: string, hint: string, unit: [string, string], color: Rgb, holdings: Holding[] }[] = [
  { id: 'career', label: 'Career', hint: 'Where the work happened', unit: ['post', 'posts'], color: [222, 172, 72], holdings: careerHoldings },
  { id: 'education', label: 'Education', hint: 'Where the schooling happened', unit: ['degree', 'degrees'], color: [92, 168, 196], holdings: educationHoldings },
]

const REALM_COLORS: Record<string, Rgb> = {
  PA: [68, 100, 162],
  NY: [124, 88, 156],
  NJ: [196, 142, 62],
  DE: [64, 146, 138],
  MD: [170, 72, 60],
  WV: [146, 148, 72],
  OH: [176, 64, 92],
  VA: [104, 136, 82],
  ON: [192, 82, 70],
}

export const NEUTRAL: Rgb = [150, 146, 136]

export function palette(fill: (id: number) => [...Rgb, number] | undefined) {
  const data = new Uint8Array(256 * 4)
  for (let id = 1; id < 256; id++) {
    const color = fill(id)
    if (color) data.set(color, id * 4)
  }
  return data
}

// A small, stable per-county shade so neighboring counties read as separate places.
export function shade([r, g, b]: Rgb, id: number, amount = 0.07): Rgb {
  const t = 1 + (((id * 2654435761) >>> 0) / 0xffffffff - 0.5) * 2 * amount
  return [Math.min(255, r * t), Math.min(255, g * t), Math.min(255, b * t)]
}

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

const homeRealm = mapData.realms.find(realm => realm.code === 'PA')!

const realmColor = (id: number) => {
  const realm = mapData.realms.find(r => r.id === id)
  return realm ? REALM_COLORS[realm.code] ?? NEUTRAL : undefined
}

const countyColor = (id: number) => (mapData.counties.some(c => c.id === id) ? shade(REALM_COLORS[homeRealm.code]!, id) : undefined)

export function mapModePalette(base: BaseMapId, lens: LensId | null): MapModePalette {
  const political = base === 'political'
  const lensed = LENSES.find(option => option.id === lens)
  if (!lensed) {
    return {
      counties: palette((id) => {
        const color = countyColor(id)
        return color && political ? [...color, 255] : undefined
      }),
      realms: palette((id) => {
        const color = realmColor(id)
        return color && political ? [...color, 255] : undefined
      }),
      overlay: political ? 1 : 0,
    }
  }
  // Under a lens the held counties take its color. On the political map everything else
  // fades toward grey so they stand out; on terrain the land is left as it is.
  const held = new Set(lensed.holdings.map(holding => holding.fips))
  return {
    counties: palette((id) => {
      const county = mapData.counties.find(c => c.id === id)
      if (!county) return undefined
      if (held.has(county.fips)) return [...lensed.color, 255]
      return political ? [...mix(countyColor(id)!, shade(NEUTRAL, id, 0.04), 0.7), 160] : undefined
    }),
    realms: palette((id) => {
      const color = realmColor(id)
      return color && political ? [...mix(color, NEUTRAL, 0.75), 120] : undefined
    }),
    overlay: 1,
  }
}
