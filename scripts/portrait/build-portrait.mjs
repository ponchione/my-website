// Turns a headshot into the painted portrait used on the character sheet.
//
//   node scripts/portrait/build-portrait.mjs <photo.jpg>
//
// Writes public/realm/portrait.webp. The pipeline: crop to head and shoulders, lift the
// subject off the plain studio backdrop, paint it with a generalized Kuwahara filter
// (flattens detail into brush-like patches while keeping edges), warm the colors, and
// set it on a dark painted ground with canvas grain. A stopgap until a hand-painted one.

import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import sharp from 'sharp'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const OUTPUT = join(ROOT, 'public/realm/portrait.webp')

// Head-and-shoulders crop of the source photo (pixels), and the output size (5:6).
const CROP = { left: 640, top: 150, width: 1620, height: 1944 }
const WIDTH = 500
const HEIGHT = 600
const BRUSH_RADIUS = 7

const source = process.argv[2]
if (!source) {
  console.error('usage: node scripts/portrait/build-portrait.mjs <photo.jpg>')
  process.exit(1)
}

const { data: photo } = await sharp(source)
  .rotate()
  .extract(CROP)
  .resize(WIDTH, HEIGHT)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

const N = WIDTH * HEIGHT
const at = (x, y) => (Math.min(HEIGHT - 1, Math.max(0, y)) * WIDTH + Math.min(WIDTH - 1, Math.max(0, x)))
const rgb = i => [photo[i * 3], photo[i * 3 + 1], photo[i * 3 + 2]]
const paint = i => [composed[i * 3], composed[i * 3 + 1], composed[i * 3 + 2]]

// --- subject mask: flood the light grey studio backdrop in from the edges --------

const backdrop = rgb(at(4, 4))
const isBackdrop = (i) => {
  const [r, g, b] = rgb(i)
  const chroma = Math.max(r, g, b) - Math.min(r, g, b)
  return chroma < 18 && Math.abs((r + g + b) / 3 - (backdrop[0] + backdrop[1] + backdrop[2]) / 3) < 26
}
const outside = new Uint8Array(N)
const stack = []
for (let x = 0; x < WIDTH; x++) stack.push(at(x, 0))
for (let y = 0; y < HEIGHT; y++) stack.push(at(0, y), at(WIDTH - 1, y))
while (stack.length) {
  const i = stack.pop()
  if (outside[i] || !isBackdrop(i)) continue
  outside[i] = 1
  const x = i % WIDTH, y = (i - x) / WIDTH
  if (x > 0) stack.push(i - 1)
  if (x < WIDTH - 1) stack.push(i + 1)
  if (y > 0) stack.push(i - WIDTH)
  if (y < HEIGHT - 1) stack.push(i + WIDTH)
}
// Soften the cut a little; the brush filter does the rest of the blending.
let mask = Float32Array.from(outside, v => 1 - v)
for (let pass = 0; pass < 1; pass++) {
  const next = new Float32Array(N)
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      let sum = 0
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += mask[at(x + dx, y + dy)]
      next[y * WIDTH + x] = sum / 9
    }
  }
  mask = next
}

// --- the ground ------------------------------------------------------------------

const hash = (x, y) => {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return h - Math.floor(h)
}
const smoothNoise = (x, y) => {
  const xi = Math.floor(x), yi = Math.floor(y)
  const fx = x - xi, fy = y - yi
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy)
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
const clamp = v => Math.max(0, Math.min(255, v))

// Deep blue-green, lit from behind the head, with long diagonal strokes.
function ground(x, y) {
  const u = x / WIDTH, v = y / HEIGHT
  const halo = Math.exp(-(((u - 0.5) / 0.42) ** 2 + ((v - 0.38) / 0.45) ** 2))
  const strokes = smoothNoise(x * 0.018 + y * 0.03, y * 0.012 - x * 0.006) * 0.6 + smoothNoise(x * 0.06, y * 0.02) * 0.4
  return [14 + 26 * halo + strokes * 14, 30 + 36 * halo + strokes * 16, 46 + 44 * halo + strokes * 16]
}

// Set the subject on the ground before painting, so the brush blends the edge into
// dark paint instead of dragging the studio grey around the head.
const composed = new Float32Array(N * 3)
for (let y = 0; y < HEIGHT; y++) {
  for (let x = 0; x < WIDTH; x++) {
    const i = y * WIDTH + x
    const m = mask[i]
    const back = ground(x, y)
    for (let c = 0; c < 3; c++) composed[i * 3 + c] = photo[i * 3 + c] * m + back[c] * (1 - m)
  }
}

// --- paint: generalized Kuwahara with 8 sectors ----------------------------------

const SECTORS = 8
const offsets = []
for (let dy = -BRUSH_RADIUS; dy <= BRUSH_RADIUS; dy++) {
  for (let dx = -BRUSH_RADIUS; dx <= BRUSH_RADIUS; dx++) {
    const r = Math.hypot(dx, dy)
    if (r > BRUSH_RADIUS) continue
    const weight = Math.exp(-(r * r) / (2 * (BRUSH_RADIUS * 0.6) ** 2))
    const sector = r === 0 ? -1 : Math.floor(((Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI)) * SECTORS) % SECTORS
    offsets.push({ dx, dy, weight, sector })
  }
}

const painted = new Float32Array(N * 3)
const mean = new Float64Array(SECTORS * 3)
const square = new Float64Array(SECTORS)
const total = new Float64Array(SECTORS)
for (let y = 0; y < HEIGHT; y++) {
  for (let x = 0; x < WIDTH; x++) {
    mean.fill(0)
    square.fill(0)
    total.fill(0)
    for (const { dx, dy, weight, sector } of offsets) {
      const [r, g, b] = paint(at(x + dx, y + dy))
      const luma = 0.299 * r + 0.587 * g + 0.114 * b
      for (let s = 0; s < SECTORS; s++) {
        // The center pixel and the sector's own pixels count fully; neighbors bleed a little.
        const w = sector === -1 || sector === s ? weight : sector === (s + 1) % SECTORS || sector === (s + SECTORS - 1) % SECTORS ? weight * 0.35 : 0
        if (!w) continue
        mean[s * 3] += r * w
        mean[s * 3 + 1] += g * w
        mean[s * 3 + 2] += b * w
        square[s] += luma * luma * w
        total[s] += w
      }
    }
    let r = 0, g = 0, b = 0, norm = 0
    for (let s = 0; s < SECTORS; s++) {
      const mr = mean[s * 3] / total[s], mg = mean[s * 3 + 1] / total[s], mb = mean[s * 3 + 2] / total[s]
      const luma = 0.299 * mr + 0.587 * mg + 0.114 * mb
      const variance = Math.max(0, square[s] / total[s] - luma * luma)
      // Flat sectors win: that is what turns texture into brush patches.
      const w = 1 / (1 + variance ** 1.6 / 400)
      r += mr * w
      g += mg * w
      b += mb * w
      norm += w
    }
    const i = (y * WIDTH + x) * 3
    painted[i] = r / norm
    painted[i + 1] = g / norm
    painted[i + 2] = b / norm
  }
}

// --- grade and canvas ---------------------------------------------------------------

const output = Buffer.alloc(N * 3)
for (let y = 0; y < HEIGHT; y++) {
  for (let x = 0; x < WIDTH; x++) {
    const i = y * WIDTH + x
    let [r, g, b] = [painted[i * 3], painted[i * 3 + 1], painted[i * 3 + 2]]

    // Warm, slightly muted, a touch more contrast: old varnish rather than studio light.
    const luma = 0.299 * r + 0.587 * g + 0.114 * b
    r = luma + (r - luma) * 0.88
    g = luma + (g - luma) * 0.88
    b = luma + (b - luma) * 0.88
    r = (r - 128) * 1.1 + 128 + 10
    g = (g - 128) * 1.1 + 128 + 2
    b = (b - 128) * 1.1 + 128 - 12

    // Light from the upper left, a vignette, and canvas weave.
    const u = x / WIDTH, v = y / HEIGHT
    const light = 1.1 - 0.2 * (u * 0.55 + v * 0.45)
    const vignette = 1 - 0.55 * Math.min(1, ((u - 0.5) ** 2 + (v - 0.45) ** 2) * 2.2)
    const weave = (Math.sin(x * 1.9) * Math.sin(y * 1.9)) * 3 + (hash(x, y) - 0.5) * 7
    output[i * 3] = clamp(r * light * vignette + weave)
    output[i * 3 + 1] = clamp(g * light * vignette + weave)
    output[i * 3 + 2] = clamp(b * light * vignette + weave)
  }
}

await sharp(output, { raw: { width: WIDTH, height: HEIGHT, channels: 3 } })
  .webp({ quality: 86, effort: 6 })
  .toFile(OUTPUT)
console.log(`wrote ${OUTPUT}`)
