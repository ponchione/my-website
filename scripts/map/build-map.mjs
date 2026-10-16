// Builds the realm map assets from public Census, Natural Earth, and AWS terrain data.
//
//   node scripts/map/build-map.mjs
//
// Writes:
//   public/realm/provinces.webp  R = county id, G = realm id (0 = water). Sampled NEAREST.
//   public/realm/fields.webp     R = county border distance, G = realm border distance,
//                                B = signed water distance (128 = shoreline). Lossless.
//   public/realm/height.webp     8-bit elevation (for the mesh, coloring, and picking).
//   public/realm/normals.webp    Precomputed lighting normals (lossy; smooth data).
//   app/data/map/pennsylvania.json  ids, names, and label anchors for the above, plus each
//                                county's neighbors, development and terrain for Keystone.
//
// Everything is in normalized Web Mercator so the terrain tiles line up for free.
// Downloads are cached in .cache/map.

import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { unzipSync } from 'fflate'
import { PNG } from 'pngjs'
import polylabel from 'polylabel'
import sharp from 'sharp'

const require = createRequire(import.meta.url)
const shapefile = require('shapefile')

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const CACHE = join(ROOT, '.cache/map')
const OUT_PUBLIC = join(ROOT, 'public/realm')
const OUT_DATA = join(ROOT, 'app/data/map')

// Pennsylvania (about -80.5..-74.7, 39.7..42.3) with roughly a degree of its neighbors
// on every side, so the camera can frame it with country around it. The east edge stops
// short of Connecticut and Massachusetts, which would only show as slivers. The client
// keeps a fixed scale in km, so changing these doesn't change how zoom levels feel.
const BOUNDS = { west: -81.9, east: -73.75, south: 39.0, north: 43.05 }
// 4096 is the largest texture every WebGL device takes.
const MAP_WIDTH = 4096
const TERRAIN_WIDTH = 2400
const TERRAIN_ZOOM = 10
const LAKE_ERIE_LEVEL = 174
// Water north-west of here is Lake Erie, at its own level; all other water is at sea level.
const LAKE_ERIE = { south: 41.35, east: -78.85 }
// Relief used for the baked lighting normals. Matches the client's mesh exaggeration (8)
// times its extra shading boost (1.3); rebuild if those change.
const SHADING_RELIEF = 10.4

// Distance-field ranges, in MAP_WIDTH pixels. The client reads these from the JSON.
const RANGES = { countyBorder: 8, realmBorder: 16, water: 16 }

const SOURCES = {
  counties: 'https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_county_500k.zip',
  states: 'https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_state_500k.zip',
  countries: 'https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_0_countries_lakes.zip',
  rivers: 'https://naciscdn.org/naturalearth/10m/physical/ne_10m_rivers_lake_centerlines.zip',
  riversNorthAmerica: 'https://naciscdn.org/naturalearth/10m/physical/ne_10m_rivers_north_america.zip',
  terrain: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium',
  adjacency: 'https://www2.census.gov/geo/docs/reference/county_adjacency/county_adjacency2024.txt',
  population: 'https://www2.census.gov/geo/docs/reference/cenpop2020/county/CenPop2020_Mean_CO42.txt',
}

// Keystone's board. Two counties are neighbors when they share a border. The Census
// adjacency file also lists counties that touch only at a corner, so a pair must also
// share at least MIN_BORDER_PIXELS of edge on the province raster (about 1.3 km).
// NEIGHBOR_OVERRIDES settles every pair where the two disagree; the build fails on any
// it doesn't settle, and on overrides that no longer settle anything.
const MIN_BORDER_PIXELS = 8
const NEIGHBOR_OVERRIDES = {
  // The four-county corner at Freeport. Allegheny–Armstrong, the other diagonal, is in
  // neither source.
  'Butler/Westmoreland': false,
  'Elk/Warren': false, // the four-county corner with Forest and McKean
  'Forest/McKean': false,
  'Northumberland/Perry': false, // a corner in the Susquehanna
  'Dauphin/Juniata': false, // one shared boundary vertex
  'Butler/Clarion': true, // a real border, 0.6 km long
}
// Terrain from local relief: the elevation range within RELIEF_RADIUS terrain pixels
// (about 2.3 km) of each point, averaged over the county.
const RELIEF_RADIUS = 8
const TERRAIN_RELIEF = { hills: 150, mountains: 250 }

// Realm colors are set on the client; this only fixes names and order.
const NEIGHBOR_NAMES = { ON: 'Ontario' }

// --- projection -------------------------------------------------------------

const mercX = lon => (lon + 180) / 360
const mercY = lat => (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2
const X0 = mercX(BOUNDS.west)
const X1 = mercX(BOUNDS.east)
const Y0 = mercY(BOUNDS.north)
const Y1 = mercY(BOUNDS.south)
const ASPECT = (Y1 - Y0) / (X1 - X0)
const W = MAP_WIDTH
const H = Math.round(W * ASPECT)

const toPixel = ([lon, lat]) => [((mercX(lon) - X0) / (X1 - X0)) * W, ((mercY(lat) - Y0) / (Y1 - Y0)) * H]

// --- sources ----------------------------------------------------------------

async function cached(name, url) {
  const path = join(CACHE, name)
  if (!existsSync(path)) {
    console.log(`  downloading ${url}`)
    const response = await fetch(url)
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, Buffer.from(await response.arrayBuffer()))
  }
  return readFile(path)
}

async function readShapefile(url) {
  const zip = unzipSync(new Uint8Array(await cached(url.split('/').pop(), url)))
  const member = ext => Object.entries(zip).find(([name]) => name.endsWith(ext))?.[1]
  const source = await shapefile.open(member('.shp'), member('.dbf'), { encoding: 'utf-8' })
  const features = []
  for (let result = await source.read(); !result.done; result = await source.read()) {
    if (!result.value.geometry) continue
    // DBF text fields come back padded (with spaces or NULs) to their column width.
    for (const [key, value] of Object.entries(result.value.properties)) {
      if (typeof value === 'string') result.value.properties[key] = value.replace(/\0/g, '').trim()
    }
    features.push(result.value)
  }
  return features
}

// --- geometry helpers -------------------------------------------------------

function polygonsOf(geometry) {
  const polygons = geometry.type === 'Polygon'
    ? [geometry.coordinates]
    : geometry.type === 'MultiPolygon' ? geometry.coordinates : []
  return polygons.map(rings => rings.map(ring => ring.map(toPixel)))
}

function boundsOf(points) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of points) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  return { minX, minY, maxX, maxY }
}

function onMap(polygon, margin = 0) {
  const b = boundsOf(polygon[0])
  return b.maxX >= -margin && b.minX <= W + margin && b.maxY >= -margin && b.minY <= H + margin
}

function ringArea(ring) {
  let sum = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1])
  }
  return Math.abs(sum / 2)
}

// Even-odd scanline fill sampled at pixel centers, so shared edges never overlap or gap.
function fillPolygon(rings, target, value, width, height) {
  const b = boundsOf(rings[0])
  const row0 = Math.max(0, Math.ceil(b.minY - 0.5))
  const row1 = Math.min(height - 1, Math.ceil(b.maxY - 0.5) - 1)
  if (row1 < row0) return
  const crossings = Array.from({ length: row1 - row0 + 1 }, () => [])
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i++) {
      const [xa, ya] = ring[i]
      const [xb, yb] = ring[(i + 1) % ring.length]
      if (ya === yb) continue
      const r0 = Math.max(row0, Math.ceil(Math.min(ya, yb) - 0.5))
      const r1 = Math.min(row1, Math.ceil(Math.max(ya, yb) - 0.5) - 1)
      for (let r = r0; r <= r1; r++) {
        crossings[r - row0].push(xa + ((r + 0.5 - ya) * (xb - xa)) / (yb - ya))
      }
    }
  }
  for (let k = 0; k < crossings.length; k++) {
    const xs = crossings[k].sort((a, b) => a - b)
    const base = (row0 + k) * width
    for (let j = 0; j + 1 < xs.length; j += 2) {
      const c0 = Math.max(0, Math.ceil(xs[j] - 0.5))
      const c1 = Math.min(width - 1, Math.ceil(xs[j + 1] - 0.5) - 1)
      for (let c = c0; c <= c1; c++) target[base + c] = value
    }
  }
}

// Segments are packed as [ax, ay, bx, by, offset]; the field stores distance - offset.
const STRIDE = 5

function pushRingSegments(out, ring, keep, offset = 0) {
  for (let i = 0; i + 1 < ring.length; i++) {
    const [ax, ay] = ring[i]
    const [bx, by] = ring[i + 1]
    if (ax === bx && ay === by) continue
    if (Math.max(ax, bx) < -32 || Math.min(ax, bx) > W + 32 || Math.max(ay, by) < -32 || Math.min(ay, by) > H + 32) continue
    if (keep && !keep(ax, ay, bx, by)) continue
    out.push(ax, ay, bx, by, offset)
  }
}

function distanceField(segments, width, height, range) {
  const cell = 16
  const gw = Math.ceil(width / cell)
  const gh = Math.ceil(height / cell)
  const buckets = Array.from({ length: gw * gh }, () => [])
  let maxOffset = 0
  for (let s = 0; s < segments.length; s += STRIDE) maxOffset = Math.max(maxOffset, segments[s + 4])
  const reach = range + maxOffset

  for (let s = 0; s < segments.length; s += STRIDE) {
    const [ax, ay, bx, by] = [segments[s], segments[s + 1], segments[s + 2], segments[s + 3]]
    const cx0 = Math.max(0, Math.floor((Math.min(ax, bx) - reach) / cell))
    const cx1 = Math.min(gw - 1, Math.floor((Math.max(ax, bx) + reach) / cell))
    const cy0 = Math.max(0, Math.floor((Math.min(ay, by) - reach) / cell))
    const cy1 = Math.min(gh - 1, Math.floor((Math.max(ay, by) + reach) / cell))
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) buckets[cy * gw + cx].push(s)
    }
  }

  const field = new Float32Array(width * height).fill(range)
  for (let cy = 0; cy < gh; cy++) {
    for (let cx = 0; cx < gw; cx++) {
      const list = buckets[cy * gw + cx]
      if (!list.length) continue
      for (let py = cy * cell; py < Math.min(height, (cy + 1) * cell); py++) {
        for (let px = cx * cell; px < Math.min(width, (cx + 1) * cell); px++) {
          const x = px + 0.5
          const y = py + 0.5
          let best = range
          for (const s of list) {
            const ax = segments[s], ay = segments[s + 1]
            const dx = segments[s + 2] - ax, dy = segments[s + 3] - ay
            const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
            const d = Math.hypot(x - ax - t * dx, y - ay - t * dy) - segments[s + 4]
            if (d < best) best = d
          }
          field[py * width + px] = best
        }
      }
    }
  }
  return field
}

// Felzenszwalb & Huttenlocher exact Euclidean distance transform (squared, in place).
const FAR = 1e20

function squaredDistanceTransform(grid, width, height) {
  const n = Math.max(width, height)
  const f = new Float64Array(n)
  const d = new Float64Array(n)
  const v = new Int32Array(n)
  const z = new Float64Array(n + 1)
  const pass = (length) => {
    let k = 0
    v[0] = 0
    z[0] = -Infinity
    z[1] = Infinity
    for (let q = 1; q < length; q++) {
      const intersect = r => (f[q] + q * q - (f[r] + r * r)) / (2 * q - 2 * r)
      let s = intersect(v[k])
      while (s <= z[k]) {
        k--
        s = intersect(v[k])
      }
      k++
      v[k] = q
      z[k] = s
      z[k + 1] = Infinity
    }
    k = 0
    for (let q = 0; q < length; q++) {
      while (z[k + 1] < q) k++
      d[q] = (q - v[k]) ** 2 + f[v[k]]
    }
  }
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) f[y] = grid[y * width + x]
    pass(height)
    for (let y = 0; y < height; y++) grid[y * width + x] = d[y]
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) f[x] = grid[y * width + x]
    pass(width)
    for (let x = 0; x < width; x++) grid[y * width + x] = d[x]
  }
  return grid
}

// Distance (px) from each pixel to the nearest pixel where `isFeature` is true.
function distanceTo(isFeature, width, height) {
  const grid = new Float64Array(width * height)
  for (let i = 0; i < grid.length; i++) grid[i] = isFeature(i) ? 0 : FAR
  squaredDistanceTransform(grid, width, height)
  return grid.map(Math.sqrt)
}

// --- images -----------------------------------------------------------------

function pixels(width, height, channels, write) {
  const data = Buffer.alloc(width * height * channels)
  for (let i = 0; i < width * height; i++) data.set(write(i), i * channels)
  return data
}

async function writeImage(path, width, height, channels, data, format) {
  const image = sharp(data, { raw: { width, height, channels } })
  if (format === 'webp-lossless') await image.webp({ lossless: true, effort: 6 }).toFile(path)
  else await image.webp({ quality: 80, smartSubsample: true, effort: 6 }).toFile(path)
  if (format === 'webp-lossy') return
  // The client reads these values exactly, so make sure they survive the round trip.
  const { data: decoded, info } = await sharp(path).raw().toBuffer({ resolveWithObject: true })
  for (let i = 0; i < width * height; i++) {
    for (let c = 0; c < channels; c++) {
      if (decoded[i * info.channels + c] !== data[i * channels + c]) throw new Error(`${path} did not round-trip losslessly`)
    }
  }
}

const byte = value => Math.max(0, Math.min(255, Math.round(value)))
const round = (value, digits = 5) => Number(value.toFixed(digits))

// --- terrain ----------------------------------------------------------------

async function loadTerrainTiles() {
  const n = 2 ** TERRAIN_ZOOM
  const tiles = new Map()
  const jobs = []
  for (let ty = Math.floor(Y0 * n); ty <= Math.floor(Y1 * n); ty++) {
    for (let tx = Math.floor(X0 * n); tx <= Math.floor(X1 * n); tx++) {
      jobs.push([tx, ty])
    }
  }
  const worker = async () => {
    for (let job = jobs.pop(); job; job = jobs.pop()) {
      const [tx, ty] = job
      const name = `terrarium/${TERRAIN_ZOOM}/${tx}/${ty}.png`
      const png = PNG.sync.read(await cached(name, `${SOURCES.terrain}/${TERRAIN_ZOOM}/${tx}/${ty}.png`))
      const heights = new Float32Array(256 * 256)
      for (let i = 0; i < heights.length; i++) {
        heights[i] = png.data[i * 4] * 256 + png.data[i * 4 + 1] + png.data[i * 4 + 2] / 256 - 32768
      }
      tiles.set(`${tx}/${ty}`, heights)
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker))

  const at = (gx, gy) => {
    const tile = tiles.get(`${Math.floor(gx / 256)}/${Math.floor(gy / 256)}`)
    return tile ? tile[(gy % 256) * 256 + (gx % 256)] : 0
  }
  // Bilinear sample in global zoom-level pixel coordinates.
  return (gx, gy) => {
    const x = Math.floor(gx), y = Math.floor(gy)
    const fx = gx - x, fy = gy - y
    const top = at(x, y) * (1 - fx) + at(x + 1, y) * fx
    const bottom = at(x, y + 1) * (1 - fx) + at(x + 1, y + 1) * fx
    return top * (1 - fy) + bottom * fy
  }
}

// The terrain source has scattered voids (pits of -1000 m and worse). Replace any land
// pixel that strays far from its neighborhood median, and keep land above sea level.
function despike(heights, land, width, height, threshold = 60) {
  const window = []
  for (let pass = 0; pass < 3; pass++) {
    const source = heights.slice()
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = y * width + x
        if (!land[i]) continue
        window.length = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const j = i + dy * width + dx
            if ((dx || dy) && land[j]) window.push(source[j])
          }
        }
        if (!window.length) continue
        window.sort((a, b) => a - b)
        const median = window[window.length >> 1]
        if (Math.abs(source[i] - median) > threshold || source[i] < 0) heights[i] = Math.max(0, median)
      }
    }
  }
}

// Along Lake Erie the source stamps rectangular blocks of shore land at exactly the lake
// surface elevation. Treat those as voids and fill them with a smooth (harmonic) ramp
// between the shoreline and the real terrain around them.
function fillLakeshoreVoids(heights, land, width, height, rows, columns) {
  const voids = []
  for (let i = 0; i < rows * width; i++) {
    if (i % width < columns && land[i] && Math.abs(heights[i] - LAKE_ERIE_LEVEL) < 0.75) voids.push(i)
  }
  const isVoid = new Uint8Array(width * height)
  for (const i of voids) {
    isVoid[i] = 1
    heights[i] = LAKE_ERIE_LEVEL + 2
  }
  const neighbors = [-1, 1, -width, width]
  for (let pass = 0; pass < 2000; pass++) {
    for (const i of voids) {
      let sum = 0, count = 0
      for (const offset of neighbors) {
        const j = i + offset
        if (j < 0 || j >= heights.length) continue
        sum += land[j] ? heights[j] : LAKE_ERIE_LEVEL + 2
        count++
      }
      heights[i] = sum / count
    }
  }
  return voids.length
}

// --- Keystone board ---------------------------------------------------------

async function readNeighbors(counties, countyIds) {
  const byFips = new Map(counties.map(county => [county.fips, county]))
  const pairName = (a, b) => [a.name, b.name].sort().join('/')
  const pairs = new Map()
  const pair = (a, b) => {
    const name = pairName(a, b)
    if (!pairs.has(name)) pairs.set(name, { a, b, census: false, pixels: 0 })
    return pairs.get(name)
  }
  const text = (await cached(SOURCES.adjacency.split('/').pop(), SOURCES.adjacency)).toString('utf8')
  for (const line of text.split('\n').slice(1)) {
    const [, fipsA, , fipsB] = line.trim().split('|')
    const a = byFips.get(fipsA), b = byFips.get(fipsB)
    if (a && b && a !== b) pair(a, b).census = true
  }
  const byId = new Map(counties.map(county => [county.id, county]))
  const touch = (i, j) => {
    if (countyIds[i] && countyIds[j] && countyIds[i] !== countyIds[j]) pair(byId.get(countyIds[i]), byId.get(countyIds[j])).pixels++
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (x + 1 < W) touch(y * W + x, y * W + x + 1)
      if (y + 1 < H) touch(y * W + x, (y + 1) * W + x)
    }
  }

  const unsettled = []
  const neighbors = new Map(counties.map(county => [county.id, []]))
  for (const [name, { a, b, census, pixels }] of pairs) {
    const raster = pixels >= MIN_BORDER_PIXELS
    const override = NEIGHBOR_OVERRIDES[name]
    if (census !== raster && override === undefined) unsettled.push(`${name} (Census ${census}, raster ${pixels} px)`)
    if (census === raster && override !== undefined) unsettled.push(`${name} needs no override`)
    if (census === raster ? census : override) {
      neighbors.get(a.id).push(b.id)
      neighbors.get(b.id).push(a.id)
    }
  }
  for (const name of Object.keys(NEIGHBOR_OVERRIDES)) {
    if (!pairs.has(name)) unsettled.push(`${name} touches in neither source`)
  }
  if (unsettled.length) throw new Error(`Settle these in NEIGHBOR_OVERRIDES:\n  ${unsettled.join('\n  ')}`)
  for (const list of neighbors.values()) list.sort((a, b) => a - b)
  return neighbors
}

// Census 2020 population on a log scale: 1 for the smallest county, 5 for the largest.
async function readDevelopment(counties) {
  const text = (await cached(SOURCES.population.split('/').pop(), SOURCES.population)).toString('utf8').replace(/^\uFEFF/, '')
  const population = new Map()
  for (const line of text.trim().split('\n').slice(1)) {
    const [state, county, , , people] = line.split(',')
    population.set(state + county, Number(people))
  }
  const logs = counties.map((county) => {
    if (!population.get(county.fips)) throw new Error(`No 2020 population for ${county.name}`)
    return Math.log(population.get(county.fips))
  })
  const lo = Math.min(...logs), hi = Math.max(...logs)
  return new Map(counties.map((county, i) => [county.id, 1 + Math.round((4 * (logs[i] - lo)) / (hi - lo))]))
}

// Mean local relief (m) of each county, from the terrain grid.
function countyRelief(heights, width, height, countyIds) {
  const extreme = (source, pick) => {
    const rows = new Float32Array(source.length)
    const out = new Float32Array(source.length)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let best = source[y * width + x]
        for (let k = Math.max(0, x - RELIEF_RADIUS); k <= Math.min(width - 1, x + RELIEF_RADIUS); k++) best = pick(best, source[y * width + k])
        rows[y * width + x] = best
      }
    }
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let best = rows[y * width + x]
        for (let k = Math.max(0, y - RELIEF_RADIUS); k <= Math.min(height - 1, y + RELIEF_RADIUS); k++) best = pick(best, rows[k * width + x])
        out[y * width + x] = best
      }
    }
    return out
  }
  const highs = extreme(heights, Math.max)
  const lows = extreme(heights, Math.min)
  const sums = new Map()
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const id = countyIds[Math.floor(((j + 0.5) / height) * H) * W + Math.floor(((i + 0.5) / width) * W)]
      if (!id) continue
      const sum = sums.get(id) ?? { total: 0, count: 0 }
      sum.total += highs[j * width + i] - lows[j * width + i]
      sum.count++
      sums.set(id, sum)
    }
  }
  return new Map([...sums].map(([id, { total, count }]) => [id, total / count]))
}

const terrainOf = relief => relief >= TERRAIN_RELIEF.mountains ? 'mountains' : relief >= TERRAIN_RELIEF.hills ? 'hills' : 'flat'

// --- build ------------------------------------------------------------------

async function main() {
  console.log(`map ${W}x${H}, terrain ${TERRAIN_WIDTH}x${Math.round(TERRAIN_WIDTH * ASPECT)}`)
  await mkdir(OUT_PUBLIC, { recursive: true })
  await mkdir(OUT_DATA, { recursive: true })

  console.log('reading boundaries')
  const [countyFeatures, stateFeatures, countryFeatures] = await Promise.all([
    readShapefile(SOURCES.counties),
    readShapefile(SOURCES.states),
    readShapefile(SOURCES.countries),
  ])

  const counties = countyFeatures
    .filter(f => f.properties.STATEFP === '42')
    .sort((a, b) => a.properties.NAME.localeCompare(b.properties.NAME))
    .map((f, i) => ({
      id: i + 1,
      fips: f.properties.GEOID,
      name: f.properties.NAME,
      areaKm2: Math.round((f.properties.ALAND + f.properties.AWATER) / 1e6),
      polygons: polygonsOf(f.geometry),
    }))

  const neighbors = stateFeatures
    .filter(f => f.properties.STUSPS !== 'PA')
    .map(f => ({ code: f.properties.STUSPS, name: f.properties.NAME, polygons: polygonsOf(f.geometry).filter(p => onMap(p)) }))
  const canada = countryFeatures.find(f => f.properties.ADMIN === 'Canada')
  if (!canada) throw new Error('Canada not found in Natural Earth countries')
  neighbors.push({ code: 'ON', name: NEIGHBOR_NAMES.ON, polygons: polygonsOf(canada.geometry).filter(p => onMap(p)) })

  const pennsylvania = stateFeatures.find(f => f.properties.STUSPS === 'PA')
  const realms = [
    { code: 'PA', name: 'Pennsylvania', polygons: polygonsOf(pennsylvania.geometry) },
    ...neighbors.filter(r => r.polygons.length).sort((a, b) => a.name.localeCompare(b.name)),
  ].map((realm, i) => ({ ...realm, id: i + 1 }))

  console.log('rasterizing provinces')
  const countyIds = new Uint8Array(W * H)
  const realmIds = new Uint8Array(W * H)
  for (const realm of realms) {
    for (const polygon of realm.polygons) fillPolygon(polygon, realmIds, realm.id, W, H)
  }
  for (const county of counties) {
    for (const polygon of county.polygons) fillPolygon(polygon, countyIds, county.id, W, H)
  }
  const isLand = (x, y) => {
    const px = Math.floor(x), py = Math.floor(y)
    if (px < 0 || py < 0 || px >= W || py >= H) return true
    return realmIds[py * W + px] > 0
  }
  // A boundary segment is a land border (not coastline) when both of its sides are land.
  const landOnBothSides = (ax, ay, bx, by) => {
    const length = Math.hypot(bx - ax, by - ay)
    const nx = ((ay - by) / length) * 1.5
    const ny = ((bx - ax) / length) * 1.5
    const mx = (ax + bx) / 2, my = (ay + by) / 2
    return isLand(mx + nx, my + ny) && isLand(mx - nx, my - ny)
  }

  console.log('keystone board')
  const countyNeighbors = await readNeighbors(counties, countyIds)
  const development = await readDevelopment(counties)

  console.log('county borders')
  // Neighboring states' counties are drawn as borders too, but they aren't provinces.
  const neighborCounties = countyFeatures
    .filter(f => f.properties.STATEFP !== '42')
    .map(f => polygonsOf(f.geometry).filter(p => onMap(p, 32)))
  const countySegments = []
  for (const polygons of [...counties.map(county => county.polygons), ...neighborCounties]) {
    for (const polygon of polygons) {
      for (const ring of polygon) pushRingSegments(countySegments, ring, landOnBothSides)
    }
  }
  const countyBorder = distanceField(countySegments, W, H, RANGES.countyBorder)

  console.log('realm borders')
  const realmSegments = []
  for (const realm of realms) {
    for (const polygon of realm.polygons) {
      for (const ring of polygon) pushRingSegments(realmSegments, ring, landOnBothSides)
    }
  }
  const realmBorder = distanceField(realmSegments, W, H, RANGES.realmBorder)

  console.log('water')
  const toLand = distanceTo(i => realmIds[i] > 0, W, H)
  const toWater = distanceTo(i => realmIds[i] === 0, W, H)
  const riverSegments = []
  for (const url of [SOURCES.rivers, SOURCES.riversNorthAmerica]) {
    for (const feature of await readShapefile(url)) {
      if (feature.properties.featurecla !== 'River') continue
      const rank = feature.properties.scalerank
      const halfWidth = rank <= 3 ? 3.2 : rank <= 7 ? 2.8 : rank <= 8 ? 2.3 : rank <= 10 ? 1.6 : 1.2
      const lines = feature.geometry.type === 'LineString' ? [feature.geometry.coordinates] : feature.geometry.coordinates
      for (const line of lines) pushRingSegments(riverSegments, line.map(toPixel), null, halfWidth)
    }
  }
  const rivers = distanceField(riverSegments, W, H, RANGES.water)
  const waterDistance = new Float32Array(W * H)
  for (let i = 0; i < waterDistance.length; i++) {
    const coast = realmIds[i] > 0 ? toWater[i] - 0.5 : -(toLand[i] - 0.5)
    waterDistance[i] = Math.min(coast, rivers[i])
  }

  console.log('labels')
  const countyData = counties.map(county => {
    const largest = county.polygons.reduce((a, b) => (ringArea(b[0]) > ringArea(a[0]) ? b : a))
    const anchor = polylabel(largest, 0.5)
    return {
      id: county.id,
      fips: county.fips,
      name: county.name,
      areaKm2: county.areaKm2,
      label: [round(anchor[0] / W), round(anchor[1] / H)],
      labelRadius: round(anchor.distance / W),
      neighbors: countyNeighbors.get(county.id),
      development: development.get(county.id),
    }
  })
  // Realms are clipped by the map edge, so find the pole of inaccessibility on the raster.
  // The home realm is whole, so its name goes at its center of mass instead.
  const realmData = realms.map(realm => {
    const inside = distanceTo(i => realmIds[i] !== realm.id, W, H)
    let best = 0, bestIndex = 0
    for (let i = 0; i < inside.length; i++) {
      const x = i % W, y = (i - x) / W
      const d = Math.min(inside[i], x + 0.5, W - x - 0.5, y + 0.5, H - y - 0.5)
      if (d > best) {
        best = d
        bestIndex = i
      }
    }
    let x = bestIndex % W, y = (bestIndex - x) / W
    if (realm.code === 'PA') {
      let sumX = 0, sumY = 0, count = 0
      for (let i = 0; i < realmIds.length; i++) {
        if (realmIds[i] !== realm.id) continue
        sumX += i % W
        sumY += Math.floor(i / W)
        count++
      }
      x = sumX / count
      y = sumY / count
    }
    return { id: realm.id, code: realm.code, name: realm.name, label: [round((x + 0.5) / W), round((y + 0.5) / H)], labelRadius: round(best / W) }
  })

  console.log('terrain')
  const TW = TERRAIN_WIDTH
  const TH = Math.round(TW * ASPECT)
  const sampleTerrain = await loadTerrainTiles()
  const tilePixels = 2 ** TERRAIN_ZOOM * 256
  const erieRow = (mercY(LAKE_ERIE.south) - Y0) / (Y1 - Y0)
  const erieColumn = (mercX(LAKE_ERIE.east) - X0) / (X1 - X0)
  const heights = new Float32Array(TW * TH)
  const terrainLand = new Uint8Array(TW * TH)
  let minElevation = Infinity, maxElevation = -Infinity
  for (let j = 0; j < TH; j++) {
    for (let i = 0; i < TW; i++) {
      const u = (i + 0.5) / TW, v = (j + 0.5) / TH
      const land = realmIds[Math.floor(v * H) * W + Math.floor(u * W)] > 0
      let h = v < erieRow && u < erieColumn ? LAKE_ERIE_LEVEL : 0
      if (land) {
        // 2x2 supersample: the source tiles are finer than the output grid.
        h = 0
        for (const [sx, sy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
          const su = (i + sx) / TW, sv = (j + sy) / TH
          h += sampleTerrain((X0 + su * (X1 - X0)) * tilePixels - 0.5, (Y0 + sv * (Y1 - Y0)) * tilePixels - 0.5) / 4
        }
      }
      heights[j * TW + i] = h
      terrainLand[j * TW + i] = land ? 1 : 0
    }
  }
  despike(heights, terrainLand, TW, TH)
  fillLakeshoreVoids(heights, terrainLand, TW, TH, Math.ceil(erieRow * TH), Math.ceil(erieColumn * TW))
  for (const h of heights) {
    minElevation = Math.min(minElevation, h)
    maxElevation = Math.max(maxElevation, h)
  }
  const relief = countyRelief(heights, TW, TH, countyIds)
  for (const county of countyData) county.terrain = terrainOf(relief.get(county.id))
  if (process.env.KEYSTONE_DEBUG) {
    for (const county of countyData) console.log(`  ${county.name.padEnd(16)} relief ${relief.get(county.id).toFixed(0).padStart(4)} m  ${county.terrain.padEnd(9)} development ${county.development}  neighbors ${county.neighbors.length}`)
  }

  // Lighting normals from the full-precision heights, so the 8-bit height map doesn't band.
  const metersPerPixel = (((BOUNDS.east - BOUNDS.west) * 111320 * Math.cos(((BOUNDS.north + BOUNDS.south) / 360) * Math.PI)) / TW)
  const heightAt = (x, y) => heights[Math.min(TH - 1, Math.max(0, y)) * TW + Math.min(TW - 1, Math.max(0, x))]
  const normals = pixels(TW, TH, 3, (i) => {
    const x = i % TW, y = (i - x) / TW
    const nx = (-(heightAt(x + 1, y) - heightAt(x - 1, y)) / (2 * metersPerPixel)) * SHADING_RELIEF
    const nz = (-(heightAt(x, y + 1) - heightAt(x, y - 1)) / (2 * metersPerPixel)) * SHADING_RELIEF
    const length = Math.hypot(nx, 1, nz)
    return [byte((nx / length * 0.5 + 0.5) * 255), byte((1 / length * 0.5 + 0.5) * 255), byte((nz / length * 0.5 + 0.5) * 255)]
  })

  console.log('writing')
  await writeImage(join(OUT_PUBLIC, 'provinces.webp'), W, H, 3, pixels(W, H, 3, i => [countyIds[i], realmIds[i], 0]), 'webp-lossless')
  await writeImage(join(OUT_PUBLIC, 'fields.webp'), W, H, 3, pixels(W, H, 3, i => [
    byte((countyBorder[i] / RANGES.countyBorder) * 255),
    byte((realmBorder[i] / RANGES.realmBorder) * 255),
    byte(128 + (waterDistance[i] / RANGES.water) * 127),
  ]), 'webp-lossless')
  await writeImage(join(OUT_PUBLIC, 'height.webp'), TW, TH, 1, pixels(TW, TH, 1, i => [
    byte(((heights[i] - minElevation) / (maxElevation - minElevation)) * 255),
  ]), 'webp-lossless')
  await writeImage(join(OUT_PUBLIC, 'normals.webp'), TW, TH, 3, normals, 'webp-lossy')

  const midLatitude = (BOUNDS.north + BOUNDS.south) / 2
  const data = {
    sources: Object.values(SOURCES),
    bounds: BOUNDS,
    map: { width: W, height: H },
    terrain: {
      width: TW,
      height: TH,
      minElevation: round(minElevation, 1),
      maxElevation: round(maxElevation, 1),
      groundWidthKm: round((BOUNDS.east - BOUNDS.west) * 111.32 * Math.cos((midLatitude * Math.PI) / 180), 1),
    },
    ranges: RANGES,
    realms: realmData,
    counties: countyData,
  }
  await writeFile(join(OUT_DATA, 'pennsylvania.json'), `${JSON.stringify(data, null, 2)}\n`)
  console.log(`done: ${counties.length} counties, ${realms.length} realms, elevation ${minElevation.toFixed(0)}-${maxElevation.toFixed(0)} m`)
}

await main()
