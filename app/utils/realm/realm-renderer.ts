import * as THREE from 'three'
import { HOME_REALM_CODE, mapData, type MapPick } from './map-data'
import type { MapModePalette } from './map-modes'
import { terrainFragmentShader, terrainVertexShader } from './shaders'

// World units: the map is centered on the origin, north toward -z. A unit is a fixed
// distance on the ground, so the camera's distances below keep their feel whatever
// extent scripts/map/build-map.mjs gives the map.
const KM_PER_UNIT = 5.881
const MAP_WIDTH = mapData.terrain.groundWidthKm / KM_PER_UNIT
const MAP_DEPTH = MAP_WIDTH * (mapData.map.height / mapData.map.width)
// Lighting normals are baked by scripts/map/build-map.mjs (SHADING_RELIEF there is this
// times a 1.3 shading boost); rebuild the map if this changes.
const VERTICAL_EXAGGERATION = 8
// A mesh vertex about every 575 m.
const SEGMENTS_X = Math.round(mapData.terrain.groundWidthKm / 0.575)

// Camera: tilts toward the horizon as you zoom in, and flattens out to nearly straight
// down by the zoom-out limit, which the screen sets (see limitZoom).
const MIN_DISTANCE = 11
const MAX_DISTANCE = 120
const NEAR_TILT = 0.86
const FAR_TILT = 0.12
// How far inside the map's edge the screen's edge stays, clear of the mist drawn there.
const EDGE = 0.8

// Markers shrink to MARKER_FAR_SCALE as the camera pulls back through MARKER_SHRINK, and
// are told they're near (to show their names) inside MARKER_NEAR.
const MARKER_SHRINK = [30, 80] as const
const MARKER_FAR_SCALE = 0.78
const MARKER_NEAR = 50

const COUNTY_LABEL_FADE = [52, 36] as const
const HOME_LABEL_FADE = [40, 62] as const
const LABEL_FONT = '"Cinzel", "Cormorant SC", Georgia, serif'
const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
// Input on the map that can change what it shows. Listened for in the capture phase,
// which also catches pointerleave, an event that does not bubble.
const WAKE_EVENTS = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'pointerleave', 'wheel'] as const

export type RealmRendererCallbacks = {
  onHover: (pick: MapPick | null, clientX: number, clientY: number) => void
  onSelect: (pick: MapPick | null) => void
  // The camera left the opening view (true), or flew back to it (false).
  onAway: (away: boolean) => void
}

export type ViewPadding = { top: number, right: number, bottom: number, left: number }

// An element to keep pinned over a spot on the map (normalized map coordinates, as the
// label anchors are). Its transform, visibility, --marker-scale and data-near are the
// renderer's to set. With `glide` (ms), an element already pinned walks from where it
// stands to its new spot instead of jumping there.
export type MapMarker = { element: HTMLElement, at: readonly [number, number], glide?: number }

// A line drawn over the map through spots (normalized map coordinates), as SVG
// polylines the renderer keeps in place. With `follow`, the line starts wherever that
// marker's element stands, so it stays attached while the marker glides.
export type MapRoute = {
  lines: SVGPolylineElement[]
  end: SVGGraphicsElement | null // moved onto the last spot
  at: readonly (readonly [number, number])[]
  follow: HTMLElement | null
}

type PlacedMarker = {
  element: HTMLElement
  x: number
  z: number
  from: { x: number, z: number, start: number, duration: number } | null
  transform: string
  scale: string
  near: boolean | null
}

type PixelBox = { minX: number, maxX: number, minY: number, maxY: number }

type View = { x: number, z: number, distance: number }

// A view by where it sits within the positions its zoom level allows (see viewRange):
// 0 at one end of each axis, 1 at the other.
type Placement = { u: number, v: number, distance: number }

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

type Label = {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  fade: readonly [number, number]
  opacity: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
// Whether a value lies in a range whose ends may come in either order (see viewRange).
const within = ([a, b]: readonly [number, number], value: number) => value >= Math.min(a, b) - 1e-3 && value <= Math.max(a, b) + 1e-3
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

async function loadBitmap(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
  return createImageBitmap(await response.blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' })
}

function readPixels(bitmap: ImageBitmap) {
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('2D canvas unavailable')
  context.drawImage(bitmap, 0, 0)
  return context.getImageData(0, 0, bitmap.width, bitmap.height).data
}

function dataTexture(data: Uint8Array, width: number, height: number, filter: THREE.MagnificationTextureFilter) {
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.UnsignedByteType)
  texture.magFilter = filter
  texture.minFilter = filter === THREE.NearestFilter ? THREE.NearestFilter : THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = filter !== THREE.NearestFilter
  texture.flipY = false
  texture.needsUpdate = true
  return texture
}

function labelTexture(text: string, style: { weight: number, color: string, halo?: string, spacing: number }) {
  const fontSize = 96
  const font = `${style.weight} ${fontSize}px ${LABEL_FONT}`
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  context.font = font
  const characters = [...text]
  const spacing = style.spacing * fontSize
  const widths = characters.map(character => context.measureText(character).width)
  const textWidth = widths.reduce((sum, width) => sum + width, 0) + spacing * (characters.length - 1)
  const padding = fontSize * 0.35
  canvas.width = Math.ceil(textWidth + padding * 2)
  canvas.height = Math.ceil(fontSize * 1.45)

  context.font = font
  context.textBaseline = 'middle'
  context.lineJoin = 'round'
  const draw = (paint: (character: string, x: number, y: number) => void) => {
    let x = padding
    characters.forEach((character, i) => {
      paint(character, x, canvas.height / 2)
      x += widths[i]! + spacing
    })
  }
  if (style.halo) {
    context.strokeStyle = style.halo
    context.lineWidth = fontSize * 0.14
    draw((character, x, y) => context.strokeText(character, x, y))
  }
  context.fillStyle = style.color
  draw((character, x, y) => context.fillText(character, x, y))

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return { texture, aspect: canvas.width / canvas.height, textAspect: textWidth / fontSize }
}

export class RealmRenderer {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(36, 1, 0.1, 500)
  // A stand-in for the camera, posed at the origin to measure what a zoom level shows.
  private readonly probe = new THREE.PerspectiveCamera(36, 1, 0.1, 500)
  private readonly raycaster = new THREE.Raycaster()
  private readonly resizeObserver: ResizeObserver
  private readonly uniforms = {
    uMapSize: { value: new THREE.Vector2(MAP_WIDTH, MAP_DEPTH) },
    uMapPixels: { value: new THREE.Vector2(mapData.map.width, mapData.map.height) },
    uRanges: { value: new THREE.Vector3(mapData.ranges.countyBorder, mapData.ranges.realmBorder, mapData.ranges.water) },
    uSunDirection: { value: new THREE.Vector3(-0.55, 0.72, -0.42).normalize() },
    uProvinces: { value: null as THREE.Texture | null },
    uFields: { value: null as THREE.Texture | null },
    uRelief: { value: null as THREE.Texture | null },
    uCountyColors: { value: dataTexture(new Uint8Array(256 * 4), 256, 1, THREE.NearestFilter) },
    uRealmColors: { value: dataTexture(new Uint8Array(256 * 4), 256, 1, THREE.NearestFilter) },
    uCountyGroups: { value: dataTexture(new Uint8Array(256 * 4), 256, 1, THREE.NearestFilter) },
    uHomeRealm: { value: mapData.realms.find(realm => realm.code === HOME_REALM_CODE)?.id ?? 1 },
    uHoverCounty: { value: -1 },
    uHoverRealm: { value: -1 },
    uSelectedCounty: { value: -1 },
    uSelectedRealm: { value: -1 },
    uOverlay: { value: 1 },
    uZoom: { value: 1 },
    uTime: { value: 0 },
  }

  private heights = new Float32Array(0)
  private terrainSize = { width: 1, height: 1 }
  private countyBounds = new Map<number, PixelBox>()
  private homeBounds: PixelBox | null = null
  private homeCentroid = { x: 0, y: 0 }
  private minHeight = 0
  private maxHeight = 0
  private pickIds = new Uint8Array(0)
  private labels: Label[] = []
  private disposables: { dispose(): void }[] = []

  private readonly target = new THREE.Vector3()
  private readonly goal = { x: 0, z: 0, distance: MAX_DISTANCE }
  private distance = MAX_DISTANCE
  // Where the map just fills the screen; the tilt has flattened out by then.
  private coverDistance = MAX_DISTANCE
  // How far out the opening view sits.
  private homeDistance = 0
  // How far out the whole home realm fits, sides included (phones only; 0 elsewhere).
  private wholeDistance = 0
  // Zoom-out limit: the map filling the screen (further on phones; see limitZoom).
  private maxDistance = MAX_DISTANCE
  // Whether the camera has left the opening view; until it does, resizing refits it.
  private away = false
  private readonly keys = new Set<string>()
  private readonly pointers = new Map<number, { x: number, y: number }>()
  private drag: { x: number, y: number, moved: boolean, anchor: THREE.Vector3 | null } | null = null
  private pinch: { span: number, distance: number } | null = null
  // A scripted camera move (flyTo); any direct input cancels it.
  // Placements are set when the straight path would leave the map (see flyToView).
  private flight: {
    from: View
    to: View
    placed: { from: Placement, to: Placement } | null
    start: number
    duration: number
    lift: number
    // Told whether the camera landed (true) or was interrupted on the way.
    settle: (landed: boolean) => void
  } | null = null
  private markers: PlacedMarker[] = []
  private route: (MapRoute & { points: string, endTransform: string }) | null = null
  private readonly scratch = new THREE.Vector3()
  private hoverAt: { x: number, y: number } | null = null
  private mouse: { x: number, y: number } | null = null
  private hovered: MapPick | null = null

  private frame = 0
  private loaded = false
  private lastTime = 0
  private time = 0
  private disposed = false

  constructor(
    private readonly container: HTMLElement,
    private readonly callbacks: RealmRendererCallbacks,
    private readonly options: { reducedMotion: boolean, viewPadding: () => ViewPadding },
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.domElement.style.display = 'block'
    this.renderer.domElement.style.touchAction = 'none'
    this.renderer.domElement.style.cursor = 'grab'
    this.scene.background = new THREE.Color(0x111214)
    container.appendChild(this.renderer.domElement)

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(container)
    this.resize()
  }

  async load(assetBase: string) {
    const [provincesBitmap, fieldsBitmap, heightBitmap, normalsBitmap] = await Promise.all([
      loadBitmap(`${assetBase}/provinces.webp`),
      loadBitmap(`${assetBase}/fields.webp`),
      loadBitmap(`${assetBase}/height.webp`),
      loadBitmap(`${assetBase}/normals.webp`),
      document.fonts.load(`600 48px ${LABEL_FONT}`).catch(() => undefined),
    ])
    if (this.disposed) return

    // Province ids: GPU copy for drawing, CPU copy for picking.
    const provincePixels = readPixels(provincesBitmap)
    this.pickIds = new Uint8Array(provincesBitmap.width * provincesBitmap.height * 2)
    for (let i = 0; i < this.pickIds.length / 2; i++) {
      this.pickIds[i * 2] = provincePixels[i * 4]!
      this.pickIds[i * 2 + 1] = provincePixels[i * 4 + 1]!
    }
    const provinces = dataTexture(new Uint8Array(provincePixels.buffer), provincesBitmap.width, provincesBitmap.height, THREE.NearestFilter)
    provincesBitmap.close()
    this.measureBounds()

    const fields = new THREE.Texture(fieldsBitmap)
    fields.flipY = false
    fields.generateMipmaps = true
    fields.minFilter = THREE.LinearMipmapLinearFilter
    fields.anisotropy = this.renderer.capabilities.getMaxAnisotropy()
    fields.needsUpdate = true

    const relief = this.buildRelief(heightBitmap, normalsBitmap)
    heightBitmap.close()
    normalsBitmap.close()

    this.uniforms.uProvinces.value = provinces
    this.uniforms.uFields.value = fields
    this.uniforms.uRelief.value = relief

    const geometry = this.buildGeometry()
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: terrainVertexShader,
      fragmentShader: terrainFragmentShader,
    })
    this.scene.add(new THREE.Mesh(geometry, material))
    this.disposables.push(provinces, fields, relief, geometry, material, this.uniforms.uCountyColors.value, this.uniforms.uRealmColors.value, this.uniforms.uCountyGroups.value)

    this.buildLabels()
    this.attachEvents()
    this.fitHome()
    this.loaded = true
    this.wake()
  }

  // Draw a frame soon. With motion reduced nothing on the map moves by itself, so the
  // frames stop once it settles and start again when something changes: input, a resize
  // or a call from the page.
  private wake = () => {
    if (this.frame || this.disposed || !this.loaded) return
    this.lastTime = performance.now()
    this.frame = requestAnimationFrame(this.tick)
  }

  setPalette(palette: MapModePalette) {
    const counties = this.uniforms.uCountyColors.value
    const realms = this.uniforms.uRealmColors.value
    ;(counties.image.data as Uint8Array).set(palette.counties)
    ;(realms.image.data as Uint8Array).set(palette.realms)
    counties.needsUpdate = true
    realms.needsUpdate = true
    const groups = this.uniforms.uCountyGroups.value
    const groupData = groups.image.data as Uint8Array
    groupData.fill(0)
    palette.groups?.forEach((group, id) => (groupData[id * 4] = group))
    groups.needsUpdate = true
    this.uniforms.uOverlay.value = palette.overlay
    this.wake()
  }

  setSelected(pick: MapPick | null) {
    this.uniforms.uSelectedCounty.value = pick?.kind === 'county' ? pick.id : -1
    this.uniforms.uSelectedRealm.value = pick?.kind === 'realm' ? pick.id : -1
    this.wake()
  }

  // Glide to a county or realm, or to a spot on the map (normalized map coordinates).
  // Resolves true once the camera lands, or false if something interrupts it first.
  flyTo(target: MapPick | readonly [number, number], distance = 28): Promise<boolean> {
    const realm = 'kind' in target && target.kind === 'realm'
    const at = 'kind' in target
      ? (realm ? mapData.realms : mapData.counties).find(place => place.id === target.id)?.label
      : target
    if (!at) return Promise.resolve(false)
    const zoom = realm ? clamp(this.goal.distance, 60, this.maxDistance) : Math.min(this.goal.distance, distance)
    // Land with the spot in the middle of what the UI leaves free, not under a panel.
    const offset = this.freeOffset(zoom)
    return this.flyToView({
      x: (at[0]! - 0.5) * MAP_WIDTH - offset.x,
      z: (at[1]! - 0.5) * MAP_DEPTH - offset.z,
      distance: zoom,
    })
  }

  // Bring these counties into view, inside the part of the screen the UI leaves free,
  // unless they're all there already. Resolves like flyTo.
  frameCounties(countyIds: readonly number[]): Promise<boolean> {
    const boxes = countyIds.map(id => this.countyBounds.get(id)).filter(box => box !== undefined)
    if (!boxes.length) return Promise.resolve(false)
    const bounds = boxes.reduce((a, b) => ({
      minX: Math.min(a.minX, b.minX),
      maxX: Math.max(a.maxX, b.maxX),
      minY: Math.min(a.minY, b.minY),
      maxY: Math.max(a.maxY, b.maxY),
    }))
    if (this.shows(bounds)) return Promise.resolve(true)
    const center = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 }
    // No closer than a flight to a town would go.
    const view = this.fitView(bounds, center, { min: 28, max: this.maxDistance })
    if (!view) return Promise.resolve(false)
    // Zoomed out that far on a phone, the map no longer fills the screen; keep it under
    // the free area at least, so what's past its edge hides behind the UI.
    const range = this.freeRange(view.distance)
    const contain = ([a, b]: readonly [number, number], value: number) => clamp(value, Math.min(a, b), Math.max(a, b))
    view.x = contain(range.x, view.x)
    view.z = contain(range.z, view.z)
    return this.flyToView(view)
  }

  // Glide back to the opening view.
  resetView() {
    const view = this.homeView()
    if (!view) return
    void this.flyToView(view)
    this.setAway(false)
  }

  // Keep these elements pinned over their spots as the camera moves.
  setMarkers(markers: MapMarker[]) {
    const now = performance.now()
    const before = new Map(this.markers.map(marker => [marker.element, marker]))
    this.markers = markers.map(({ element, at, glide }) => {
      const x = (at[0] - 0.5) * MAP_WIDTH
      const z = (at[1] - 0.5) * MAP_DEPTH
      const old = before.get(element)
      // A glide starts from wherever the marker stands now, even mid-glide.
      const from = old && glide && !this.options.reducedMotion ? this.spotOf(old, now) : null
      const moves = from && Math.hypot(from.x - x, from.z - z) > 1e-4
      return {
        element,
        x,
        z,
        from: moves ? { ...from, start: now, duration: glide! } : null,
        transform: old?.transform ?? '',
        scale: old?.scale ?? '',
        near: old?.near ?? null,
      }
    })
    this.wake()
  }

  // Keep this line drawn over the map, or none.
  setRoute(route: MapRoute | null) {
    this.route = route && { ...route, points: '', endTransform: '' }
    this.placeRoute()
    this.wake()
  }

  // Where a marker stands at a moment: on its spot, or on its way there.
  private spotOf(marker: PlacedMarker, now: number) {
    if (!marker.from) return { x: marker.x, z: marker.z }
    const t = clamp((now - marker.from.start) / marker.from.duration, 0, 1)
    if (t >= 1) marker.from = null
    return { x: marker.from ? marker.from.x + (marker.x - marker.from.x) * t : marker.x, z: marker.from ? marker.from.z + (marker.z - marker.from.z) * t : marker.z }
  }

  // Long trips pull back mid-flight so you see where you're going, like a camera on a
  // crane.
  private flyToView(to: View): Promise<boolean> {
    this.wake()
    this.setAway(true)
    this.endFlight(false)
    // Places near the edge of the map can't be centered without showing past it.
    this.clampView(to)
    Object.assign(this.goal, to)
    const from: View = { x: this.target.x, z: this.target.z, distance: this.distance }
    const travel = Math.hypot(to.x - from.x, to.z - from.z)
    // With motion reduced the view just cuts there; and it may be there already.
    if (this.options.reducedMotion || (travel < 0.5 && Math.abs(to.distance - from.distance) < 0.5)) return Promise.resolve(true)
    // The view has to stay over the map the whole way, so trips near its edge pull back
    // less, or not at all. Where even a straight glide would cross the edge (setting off
    // from the zoomed-out view), steer by placement instead.
    const stays = (lift: number) => {
      for (let i = 1; i < 24; i++) {
        const view = this.flightView(from, to, lift, i / 24)
        const range = this.viewRange(view.distance)
        if (!within(range.x, view.x) || !within(range.z, view.z)) return false
      }
      return true
    }
    let lift = 0
    if (stays(0)) {
      let lo = 0
      let hi = Math.max(0, travel * 0.7 - Math.abs(to.distance - from.distance) * 0.5)
      if (stays(hi)) lo = hi
      for (let i = 0; i < 8 && lo < hi; i++) {
        const mid = (lo + hi) / 2
        if (stays(mid)) lo = mid
        else hi = mid
      }
      lift = lo
    }
    return new Promise((settle) => {
      this.flight = {
        from,
        to,
        placed: lift || stays(0) ? null : { from: this.placement(from), to: this.placement(to) },
        start: performance.now(),
        duration: clamp(0.9 + travel / 45, 1, 2.2) * 1000,
        lift,
        settle,
      }
    })
  }

  private endFlight(landed: boolean) {
    const flight = this.flight
    this.flight = null
    flight?.settle(landed)
  }

  // An engraved atlas plate of a county or the home realm: relief shading on parchment,
  // the subject outlined in ink, its surroundings hatched. Drawn from the map's own data.
  // A mark (normalized map coordinates) is inked in as a town.
  paintPlate(canvas: HTMLCanvasElement, subject: MapPick, mark?: readonly [number, number]) {
    const box = subject.kind === 'county' ? this.countyBounds.get(subject.id) : this.homeBounds
    const context = canvas.getContext('2d')
    if (!box || !context) return
    const { width: mapWidth, height: mapHeight } = mapData.map
    const { width, height } = canvas
    const margin = subject.kind === 'county' ? 1.45 : 1.1
    let cropWidth = (box.maxX - box.minX + 1) * margin
    let cropHeight = (box.maxY - box.minY + 1) * margin
    if (cropWidth / cropHeight < width / height) cropWidth = cropHeight * (width / height)
    else cropHeight = cropWidth / (width / height)
    const scale = cropWidth / width
    // Center on the county, but slide the window back inside the map near its edges.
    const left = clamp((box.minX + box.maxX + 1) / 2 - cropWidth / 2, 0, Math.max(0, mapWidth - cropWidth))
    const top = clamp((box.minY + box.maxY + 1) / 2 - cropHeight / 2, 0, Math.max(0, mapHeight - cropHeight))

    // County id, or 1000 + realm id outside the counties (1000 itself is water).
    const ids = (mx: number, my: number) => {
      const x = Math.floor(mx), y = Math.floor(my)
      if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) return -1
      const i = (y * mapWidth + x) * 2
      return this.pickIds[i]! || 1000 + this.pickIds[i + 1]!
    }
    const inside = (id: number) => subject.kind === 'county'
      ? id === subject.id
      : (id > 0 && id < 1000) || id === 1000 + subject.id
    const sun = this.uniforms.uSunDirection.value
    const step = Math.max(scale / mapWidth, 1 / this.terrainSize.width) * MAP_WIDTH
    const image = context.createImageData(width, height)
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const mx = left + (px + 0.5) * scale
        const my = top + (py + 0.5) * scale
        const id = ids(mx, my)
        const i = (py * width + px) * 4
        if (id < 0) {
          image.data.set([196, 182, 150, 255], i)
          continue
        }
        const x = (mx / mapWidth - 0.5) * MAP_WIDTH
        const z = (my / mapHeight - 0.5) * MAP_DEPTH
        const nx = -(this.heightAt(x + step, z) - this.heightAt(x - step, z)) / (2 * step) * 2.5
        const nz = -(this.heightAt(x, z + step) - this.heightAt(x, z - step)) / (2 * step) * 2.5
        const lambert = (nx * sun.x + sun.y + nz * sun.z) / Math.hypot(nx, 1, nz)
        const shade = clamp(0.8 + 0.6 * (lambert - 0.62), 0.55, 1.15)

        const within = inside(id)
        let color = id === 1000 ? [146, 166, 162] : within ? [238, 226, 194] : [214, 200, 168]
        if (!within && id !== 1000 && (px + py) % 7 === 0) color = color.map(c => c * 0.9)
        color = color.map(c => c * shade)

        const across = [ids(mx + scale * 1.5, my), ids(mx, my + scale * 1.5), ids(mx - scale * 1.5, my), ids(mx, my - scale * 1.5)]
        const outline = across.some(other => inside(other) !== within)
        const border = across.some(other => other !== id)
        if (outline) color = [58, 42, 26]
        else if (border) color = color.map(c => c * 0.62)

        const grain = (Math.sin(px * 12.9898 + py * 78.233) * 43758.5453) % 1 * 10
        image.data[i] = color[0]! + grain
        image.data[i + 1] = color[1]! + grain
        image.data[i + 2] = color[2]! + grain
        image.data[i + 3] = 255
      }
    }
    context.putImageData(image, 0, 0)
    if (!mark) return
    const x = (mark[0] * mapWidth - left) / scale
    const y = (mark[1] * mapHeight - top) / scale
    const radius = Math.max(3, height * 0.024)
    context.lineWidth = radius * 0.5
    context.strokeStyle = 'rgb(58 42 26)'
    context.fillStyle = 'rgb(240 230 200)'
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fill()
    context.stroke()
    context.fillStyle = 'rgb(58 42 26)'
    context.beginPath()
    context.arc(x, y, radius * 0.32, 0, Math.PI * 2)
    context.fill()
  }

  dispose() {
    this.disposed = true
    this.endFlight(false)
    cancelAnimationFrame(this.frame)
    this.resizeObserver.disconnect()
    this.detachEvents()
    for (const label of this.labels) {
      label.mesh.material.map?.dispose()
      label.mesh.material.dispose()
    }
    this.labels[0]?.mesh.geometry.dispose()
    for (const item of this.disposables) item.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  // --- construction ---------------------------------------------------------

  private measureBounds() {
    const { width, height } = mapData.map
    const home = this.uniforms.uHomeRealm.value
    const grow = (box: PixelBox | undefined, x: number, y: number): PixelBox => box
      ? { minX: Math.min(box.minX, x), maxX: Math.max(box.maxX, x), minY: Math.min(box.minY, y), maxY: Math.max(box.maxY, y) }
      : { minX: x, maxX: x, minY: y, maxY: y }
    let sumX = 0, sumY = 0, count = 0
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 2
        const county = this.pickIds[i]!
        if (county) this.countyBounds.set(county, grow(this.countyBounds.get(county), x, y))
        if (this.pickIds[i + 1] === home) {
          this.homeBounds = grow(this.homeBounds ?? undefined, x, y)
          sumX += x
          sumY += y
          count++
        }
      }
    }
    if (count) this.homeCentroid = { x: sumX / count, y: sumY / count }
  }

  // Frame the home realm inside the part of the screen the UI leaves free, centered on
  // its mass rather than its bounding box (the Erie triangle would pull it off center).
  private homeView(): View | null {
    if (!this.homeBounds) return null
    // The tilt at each zoom depends on where the map fills the screen.
    this.limitZoom()
    // On tall screens fit the realm's height and let it run off the sides; fitting its
    // width there would leave it a sliver between bands of empty map. On wide screens
    // stop where the map fills the screen, even if that trims the realm's edges.
    const portrait = this.portrait()
    const view = this.fitView(this.homeBounds, this.homeCentroid, portrait ? { fitWidth: false } : { max: this.coverDistance })
    if (!view) return null
    this.homeDistance = view.distance
    // Phones may still zoom out far enough to see all of it, sides included.
    this.wholeDistance = portrait ? this.fitView(this.homeBounds, this.homeCentroid)?.distance ?? 0 : 0
    this.limitZoom()
    return view
  }

  // The view that fits a box of the map (in map pixels) inside the part of the screen the
  // UI leaves free, with a point of it (map pixels too) in the middle. Without fitWidth
  // only its height has to fit; the zoom stays within min and max either way.
  private fitView(bounds: PixelBox, center: { x: number, y: number }, { fitWidth = true, min = MIN_DISTANCE, max = Infinity } = {}): View | null {
    const free = this.freeArea()
    if (!free) return null
    const { width, height } = free
    // The search below moves the camera; put it back afterwards.
    const saved = { target: this.target.clone(), distance: this.distance }
    const outline = this.outline(bounds)
    const ground = (sx: number, sy: number) => {
      this.raycaster.setFromCamera(new THREE.Vector2((sx / width) * 2 - 1, 1 - (sy / height) * 2), this.camera)
      return this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.target.y), new THREE.Vector3())
    }

    const centroid = new THREE.Vector3(
      (center.x / mapData.map.width - 0.5) * MAP_WIDTH,
      0,
      (center.y / mapData.map.height - 0.5) * MAP_DEPTH,
    )
    centroid.y = this.heightAt(centroid.x, centroid.z)
    this.target.copy(centroid)
    const fitDistance = () => {
      let lo = MIN_DISTANCE, hi = MAX_DISTANCE * 3
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2
        this.distance = mid
        const box = this.screenBox(outline)
        const fits = (!fitWidth || (box.minX >= free.left && box.maxX <= free.right)) && box.minY >= free.top && box.maxY <= free.bottom
        if (fits) hi = mid
        else lo = mid
      }
      return clamp(hi, min, max)
    }
    let distance = fitDistance()
    for (let pass = 0; pass < 4; pass++) {
      // Put the center in the middle of the free area, then refit.
      this.distance = distance
      this.placeCamera()
      this.camera.updateMatrixWorld()
      const p = centroid.clone().project(this.camera)
      const from = ground(((p.x + 1) / 2) * width, ((1 - p.y) / 2) * height)
      const to = ground((free.left + free.right) / 2, (free.top + free.bottom) / 2)
      if (from && to) {
        this.target.x += from.x - to.x
        this.target.z += from.z - to.z
      }
      distance = fitDistance()
    }
    const view = { x: this.target.x, z: this.target.z, distance }
    this.target.copy(saved.target)
    this.distance = saved.distance
    this.placeCamera()
    return view
  }

  // Whether a box of the map already sits inside the free part of the screen, from where
  // the camera is (or is headed).
  private shows(bounds: PixelBox) {
    const free = this.freeArea()
    if (!free) return false
    const saved = { target: this.target.clone(), distance: this.distance }
    this.target.set(this.goal.x, this.heightAt(this.goal.x, this.goal.z), this.goal.z)
    this.distance = this.goal.distance
    const box = this.screenBox(this.outline(bounds))
    this.target.copy(saved.target)
    this.distance = saved.distance
    this.placeCamera()
    return box.minX >= free.left && box.maxX <= free.right && box.minY >= free.top && box.maxY <= free.bottom
  }

  // The part of the screen the UI leaves free, in pixels from its top left.
  private freeArea() {
    const { clientWidth: width, clientHeight: height } = this.container
    if (!width || !height) return null
    const padding = this.options.viewPadding()
    return { width, height, left: padding.left, right: width - padding.right, top: padding.top, bottom: height - padding.bottom }
  }

  // Where a spot has to sit, relative to the point the camera looks at, to show in the
  // middle of the free area at a zoom level.
  private freeOffset(distance: number) {
    const free = this.freeArea()
    if (!free) return { x: 0, z: 0 }
    const tilt = this.tiltAt(distance)
    this.probe.position.set(0, distance * Math.cos(tilt), distance * Math.sin(tilt))
    this.probe.lookAt(0, 0, 0)
    this.probe.updateMatrixWorld()
    const x = ((free.left + free.right) / free.width) - 1
    const y = 1 - ((free.top + free.bottom) / free.height)
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.probe)
    const point = this.raycaster.ray.intersectPlane(GROUND, new THREE.Vector3())
    return point ? { x: point.x, z: point.z } : { x: 0, z: 0 }
  }

  // Like viewRange, for the free part of the screen rather than all of it.
  private freeRange(distance: number) {
    const free = this.freeArea()
    if (!free) return this.viewRange(distance)
    const tilt = this.tiltAt(distance)
    this.probe.position.set(0, distance * Math.cos(tilt), distance * Math.sin(tilt))
    this.probe.lookAt(0, 0, 0)
    this.probe.updateMatrixWorld()
    const ground = (sx: number, sy: number) => {
      this.raycaster.setFromCamera(new THREE.Vector2((sx / free.width) * 2 - 1, 1 - (sy / free.height) * 2), this.probe)
      return this.raycaster.ray.intersectPlane(GROUND, new THREE.Vector3()) ?? new THREE.Vector3()
    }
    const middle = (free.left + free.right) / 2
    // The view is a trapezoid, widest along the top.
    const [top, bottom, left, right] = [ground(middle, free.top), ground(middle, free.bottom), ground(free.left, free.top), ground(free.right, free.top)]
    const halfWidth = MAP_WIDTH / 2 - EDGE
    const halfDepth = MAP_DEPTH / 2 - EDGE
    return {
      x: [-halfWidth - left.x, halfWidth - right.x] as const,
      z: [-halfDepth - top.z, halfDepth - bottom.z] as const,
    }
  }

  // The edge of a box of the map, as points on the ground.
  private outline(bounds: PixelBox) {
    const x0 = (bounds.minX / mapData.map.width - 0.5) * MAP_WIDTH
    const x1 = ((bounds.maxX + 1) / mapData.map.width - 0.5) * MAP_WIDTH
    const z0 = (bounds.minY / mapData.map.height - 0.5) * MAP_DEPTH
    const z1 = ((bounds.maxY + 1) / mapData.map.height - 0.5) * MAP_DEPTH
    const points: THREE.Vector3[] = []
    for (let i = 0; i <= 8; i++) {
      const t = i / 8
      for (const [x, z] of [[x0 + (x1 - x0) * t, z0], [x0 + (x1 - x0) * t, z1], [x0, z0 + (z1 - z0) * t], [x1, z0 + (z1 - z0) * t]] as const) {
        points.push(new THREE.Vector3(x, this.heightAt(x, z), z))
      }
    }
    return points
  }

  // Where points fall on screen with the camera placed for the current target and
  // distance: their bounding box, in pixels.
  private screenBox(points: THREE.Vector3[]) {
    const { clientWidth: width, clientHeight: height } = this.container
    this.placeCamera()
    this.camera.updateMatrixWorld()
    const box = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    for (const point of points) {
      const p = point.clone().project(this.camera)
      const sx = ((p.x + 1) / 2) * width, sy = ((1 - p.y) / 2) * height
      box.minX = Math.min(box.minX, sx)
      box.maxX = Math.max(box.maxX, sx)
      box.minY = Math.min(box.minY, sy)
      box.maxY = Math.max(box.maxY, sy)
    }
    return box
  }

  private fitHome() {
    const view = this.homeView()
    if (!view) return
    this.endFlight(false)
    this.target.set(view.x, this.heightAt(view.x, view.z), view.z)
    this.distance = view.distance
    Object.assign(this.goal, view)
    this.placeCamera()
  }

  private setAway(away: boolean) {
    if (this.away === away) return
    this.away = away
    this.callbacks.onAway(away)
  }

  private portrait() {
    return this.camera.aspect < 0.9
  }

  private tiltAt(distance: number) {
    return NEAR_TILT + (FAR_TILT - NEAR_TILT) * smoothstep(MIN_DISTANCE, this.coverDistance, distance)
  }

  // The ground the screen covers at a zoom level, relative to the point the camera looks
  // at: half its width, and how far it reaches north (negative z) and south. The tilt
  // makes it a trapezoid, widest along the top of the screen.
  private footprint(distance: number, tilt = this.tiltAt(distance)) {
    this.probe.position.set(0, distance * Math.cos(tilt), distance * Math.sin(tilt))
    this.probe.lookAt(0, 0, 0)
    this.probe.updateMatrixWorld()
    const corner = (x: number, y: number) => {
      this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.probe)
      return this.raycaster.ray.intersectPlane(GROUND, new THREE.Vector3()) ?? new THREE.Vector3(Infinity, 0, y * -Infinity)
    }
    const top = corner(1, 1)
    const bottom = corner(1, -1)
    return { halfWidth: Math.max(top.x, bottom.x), north: top.z, south: bottom.z }
  }

  // Zoom out no further than the map filling the screen (looking straight down, as the
  // camera does by then), so it never shrinks into a tile floating in the dark. Phones may
  // go further to fit the home realm: the banner and map-mode bar cover most of what's
  // past it.
  private limitZoom() {
    let lo = MIN_DISTANCE, hi = MAX_DISTANCE * 3
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2
      const { halfWidth, north, south } = this.footprint(mid, FAR_TILT)
      if (halfWidth <= MAP_WIDTH / 2 - EDGE && south - north <= MAP_DEPTH - EDGE * 2) lo = mid
      else hi = mid
    }
    this.coverDistance = lo
    this.maxDistance = this.portrait() ? Math.max(lo, this.homeDistance, this.wholeDistance) : lo
    this.goal.distance = Math.min(this.goal.distance, this.maxDistance)
  }

  // Where the view's center may sit at a zoom level, per axis, for the screen to stay over
  // the map. If the view is bigger than the map that way, lo passes hi, and anything
  // between them keeps the whole map in sight instead.
  private viewRange(distance: number) {
    const { halfWidth, north, south } = this.footprint(distance)
    const right = MAP_WIDTH / 2 - EDGE
    const bottom = MAP_DEPTH / 2 - EDGE
    return {
      x: [halfWidth - right, right - halfWidth] as const,
      z: [-bottom - north, bottom - south] as const,
    }
  }

  private clampView(view: View) {
    const range = this.viewRange(view.distance)
    const contain = ([a, b]: readonly [number, number], value: number) => clamp(value, Math.min(a, b), Math.max(a, b))
    view.x = contain(range.x, view.x)
    view.z = contain(range.z, view.z)
  }

  // Where a flight is at progress e (eased), on a straight glide.
  private flightView(from: View, to: View, lift: number, e: number): View {
    return {
      x: from.x + (to.x - from.x) * e,
      z: from.z + (to.z - from.z) * e,
      distance: from.distance + (to.distance - from.distance) * e + lift * Math.sin(Math.PI * e),
    }
  }

  // Flights that can't glide straight travel through placements instead: as the zoom
  // opens up the range of positions, the camera moves out into it, never past the edge.
  private placement(view: View): Placement {
    const range = this.viewRange(view.distance)
    const along = ([lo, hi]: readonly [number, number], value: number) => (Math.abs(hi - lo) < 1e-6 ? 0.5 : (value - lo) / (hi - lo))
    return { u: along(range.x, view.x), v: along(range.z, view.z), distance: view.distance }
  }

  // Heights drive the mesh and picking; the baked normals drive the lighting.
  private buildRelief(heightBitmap: ImageBitmap, normalsBitmap: ImageBitmap) {
    const { width, height } = heightBitmap
    const heightPixels = readPixels(heightBitmap)
    const normalPixels = readPixels(normalsBitmap)
    const { minElevation, maxElevation } = mapData.terrain
    const toWorld = VERTICAL_EXAGGERATION / 1000 / KM_PER_UNIT
    this.heights = new Float32Array(width * height)
    const relief = new Uint8Array(width * height * 4)
    for (let i = 0; i < this.heights.length; i++) {
      const level = heightPixels[i * 4]!
      this.heights[i] = (minElevation + (level / 255) * (maxElevation - minElevation)) * toWorld
      relief[i * 4] = normalPixels[i * 4]!
      relief[i * 4 + 1] = normalPixels[i * 4 + 1]!
      relief[i * 4 + 2] = normalPixels[i * 4 + 2]!
      relief[i * 4 + 3] = level
    }
    this.minHeight = minElevation * toWorld
    this.maxHeight = maxElevation * toWorld
    this.terrainSize = { width, height }
    const texture = dataTexture(relief, width, height, THREE.LinearFilter)
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy()
    return texture
  }

  private buildGeometry() {
    const segmentsZ = Math.round(SEGMENTS_X * (MAP_DEPTH / MAP_WIDTH))
    const geometry = new THREE.PlaneGeometry(MAP_WIDTH, MAP_DEPTH, SEGMENTS_X, segmentsZ)
    geometry.rotateX(-Math.PI / 2)
    const position = geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < position.count; i++) {
      position.setY(i, this.heightAt(position.getX(i), position.getZ(i)))
    }
    geometry.computeBoundingSphere()
    geometry.computeBoundingBox()
    return geometry
  }

  private buildLabels() {
    const plane = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
    const add = (text: string, place: { label: number[], labelRadius: number }, size: number, style: Parameters<typeof labelTexture>[1], fade: readonly [number, number], order: number) => {
      const { texture, aspect, textAspect } = labelTexture(text, style)
      texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy()
      // Upload now, behind the loading veil. Left to the first frame a label shows in, a
      // zoom that brought dozens into view uploaded them all at once and hitched.
      this.renderer.initTexture(texture)
      const radius = place.labelRadius * MAP_WIDTH
      // Fit the text inside the place's largest inscribed circle.
      const textHeight = Math.min((radius * size) / textAspect, radius * 0.42)
      const height = textHeight * 1.45
      const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, opacity: 0 })
      const mesh = new THREE.Mesh(plane, material)
      const x = (place.label[0]! - 0.5) * MAP_WIDTH
      const z = (place.label[1]! - 0.5) * MAP_DEPTH
      mesh.position.set(x, this.heightAt(x, z) + 0.05, z)
      mesh.scale.set(height * aspect, 1, height)
      mesh.renderOrder = order
      this.scene.add(mesh)
      this.labels.push({ mesh, fade, opacity: 0 })
    }

    for (const realm of mapData.realms) {
      if (realm.labelRadius < 0.02) continue
      const home = realm.code === HOME_REALM_CODE
      add(realm.name.toUpperCase(), realm, home ? 1.7 : 1.6, {
        weight: 700,
        color: home ? 'rgba(18, 16, 30, 0.6)' : 'rgba(24, 18, 12, 0.55)',
        spacing: 0.35,
      }, home ? HOME_LABEL_FADE : [14, 30], 3)
    }
    for (const county of mapData.counties) {
      add(county.name.toUpperCase(), county, 1.5, {
        weight: 600,
        color: 'rgba(16, 13, 9, 0.8)',
        spacing: 0.08,
      }, COUNTY_LABEL_FADE, 2)
    }
  }

  // --- terrain queries ------------------------------------------------------

  private heightAt(x: number, z: number) {
    const { width, height } = this.terrainSize
    const fx = clamp((x / MAP_WIDTH + 0.5) * width - 0.5, 0, width - 1)
    const fy = clamp((z / MAP_DEPTH + 0.5) * height - 0.5, 0, height - 1)
    const x0 = Math.floor(fx), y0 = Math.floor(fy)
    const x1 = Math.min(x0 + 1, width - 1), y1 = Math.min(y0 + 1, height - 1)
    const tx = fx - x0, ty = fy - y0
    const h = this.heights
    const top = h[y0 * width + x0]! * (1 - tx) + h[y0 * width + x1]! * tx
    const bottom = h[y1 * width + x0]! * (1 - tx) + h[y1 * width + x1]! * tx
    return top * (1 - ty) + bottom * ty
  }

  private ray(clientX: number, clientY: number) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
    this.raycaster.setFromCamera(ndc, this.camera)
    return this.raycaster.ray
  }

  private planePoint(clientX: number, clientY: number, height: number) {
    return this.ray(clientX, clientY).intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -height), new THREE.Vector3())
  }

  // March the view ray through the heightfield; exact enough for picking at any tilt.
  private terrainPoint(clientX: number, clientY: number) {
    const { origin, direction } = this.ray(clientX, clientY)
    if (direction.y >= 0) return null
    const t0 = Math.max(0, (this.maxHeight + 0.01 - origin.y) / direction.y)
    const t1 = (this.minHeight - 0.01 - origin.y) / direction.y
    const below = (t: number) => origin.y + direction.y * t <= this.heightAt(origin.x + direction.x * t, origin.z + direction.z * t)
    let previous = t0
    for (let step = 1; step <= 256; step++) {
      const t = t0 + ((t1 - t0) * step) / 256
      if (below(t)) {
        let lo = previous, hi = t
        for (let k = 0; k < 10; k++) {
          const mid = (lo + hi) / 2
          if (below(mid)) hi = mid
          else lo = mid
        }
        return new THREE.Vector3(origin.x + direction.x * hi, origin.y + direction.y * hi, origin.z + direction.z * hi)
      }
      previous = t
    }
    return null
  }

  private pickAt(clientX: number, clientY: number): MapPick | null {
    const point = this.terrainPoint(clientX, clientY)
    if (!point) return null
    const u = point.x / MAP_WIDTH + 0.5
    const v = point.z / MAP_DEPTH + 0.5
    if (u < 0 || u >= 1 || v < 0 || v >= 1) return null
    const index = (Math.floor(v * mapData.map.height) * mapData.map.width + Math.floor(u * mapData.map.width)) * 2
    const county = this.pickIds[index]!
    const realm = this.pickIds[index + 1]!
    if (county) return { kind: 'county', id: county }
    if (realm) return { kind: 'realm', id: realm }
    return null
  }

  // --- input ----------------------------------------------------------------

  private attachEvents() {
    const canvas = this.renderer.domElement
    canvas.addEventListener('pointerdown', this.onPointerDown)
    canvas.addEventListener('pointermove', this.onPointerMove)
    canvas.addEventListener('pointerup', this.onPointerUp)
    canvas.addEventListener('pointercancel', this.onPointerUp)
    canvas.addEventListener('pointerleave', this.onPointerLeave)
    // On the container, so the wheel also zooms with the pointer over a marker.
    this.container.addEventListener('wheel', this.onWheel, { passive: false })
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.onBlur)
    for (const name of WAKE_EVENTS) this.container.addEventListener(name, this.wake, { capture: true, passive: true })
    for (const name of ['keydown', 'keyup', 'blur']) window.addEventListener(name, this.wake)
  }

  private detachEvents() {
    const canvas = this.renderer.domElement
    canvas.removeEventListener('pointerdown', this.onPointerDown)
    canvas.removeEventListener('pointermove', this.onPointerMove)
    canvas.removeEventListener('pointerup', this.onPointerUp)
    canvas.removeEventListener('pointercancel', this.onPointerUp)
    canvas.removeEventListener('pointerleave', this.onPointerLeave)
    this.container.removeEventListener('wheel', this.onWheel)
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.onBlur)
    for (const name of WAKE_EVENTS) this.container.removeEventListener(name, this.wake, { capture: true })
    for (const name of ['keydown', 'keyup', 'blur']) window.removeEventListener(name, this.wake)
  }

  private onPointerDown = (event: PointerEvent) => {
    this.setAway(true)
    this.endFlight(false)
    this.renderer.domElement.setPointerCapture(event.pointerId)
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (this.pointers.size === 1) {
      this.drag = { x: event.clientX, y: event.clientY, moved: false, anchor: this.planePoint(event.clientX, event.clientY, this.target.y) }
    }
    else if (this.pointers.size === 2) {
      this.drag = null
      this.pinch = { span: this.pointerSpan(), distance: this.goal.distance }
    }
  }

  private onPointerMove = (event: PointerEvent) => {
    if (this.pointers.has(event.pointerId)) {
      this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    }
    if (this.pinch && this.pointers.size === 2) {
      this.goal.distance = clamp(this.pinch.distance * (this.pinch.span / Math.max(this.pointerSpan(), 1)), MIN_DISTANCE, this.maxDistance)
      return
    }
    if (this.drag) {
      if (!this.drag.moved && Math.hypot(event.clientX - this.drag.x, event.clientY - this.drag.y) > 4) {
        this.drag.moved = true
        this.renderer.domElement.style.cursor = 'grabbing'
      }
      if (this.drag.moved && this.drag.anchor) {
        const point = this.planePoint(event.clientX, event.clientY, this.drag.anchor.y)
        if (point) {
          this.panBy(this.drag.anchor.x - point.x, this.drag.anchor.z - point.z, true)
        }
      }
      return
    }
    if (event.pointerType === 'mouse') {
      this.mouse = { x: event.clientX, y: event.clientY }
      this.hoverAt = this.mouse
    }
  }

  private onPointerUp = (event: PointerEvent) => {
    this.pointers.delete(event.pointerId)
    if (this.drag && !this.drag.moved && this.pointers.size === 0) {
      this.callbacks.onSelect(this.pickAt(event.clientX, event.clientY))
    }
    if (this.pointers.size < 2) this.pinch = null
    this.drag = null
    this.renderer.domElement.style.cursor = this.hovered ? 'pointer' : 'grab'
  }

  private onPointerLeave = () => {
    if (this.pointers.size) return
    this.mouse = null
    this.hoverAt = null
    this.setHovered(null, 0, 0)
  }

  private onWheel = (event: WheelEvent) => {
    event.preventDefault()
    this.setAway(true)
    this.endFlight(false)
    const scale = event.deltaMode === 1 ? 0.05 : 0.0012
    const next = clamp(this.goal.distance * Math.exp(event.deltaY * scale), MIN_DISTANCE, this.maxDistance)
    const point = this.terrainPoint(event.clientX, event.clientY)
    if (point) {
      // Zoom toward the cursor.
      const pull = 1 - next / this.goal.distance
      this.goal.x += (point.x - this.goal.x) * pull
      this.goal.z += (point.z - this.goal.z) * pull
      this.clampView(this.goal)
    }
    this.goal.distance = next
    this.clampView(this.goal)
  }

  private onKeyDown = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return
    // Keys typed into a field or pressed in a pop-up over the map (where arrows scroll a
    // letter) aren't for the camera.
    if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable], [aria-modal="true"]')) return
    const key = event.key.toLowerCase()
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', '=', '+', '-', '_'].includes(key)) {
      this.keys.add(key)
      this.setAway(true)
      this.endFlight(false)
      if (key.startsWith('arrow')) event.preventDefault()
    }
  }

  private onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.key.toLowerCase())
  }

  private onBlur = () => this.keys.clear()

  private pointerSpan() {
    const [a, b] = [...this.pointers.values()]
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 1
  }

  private panBy(dx: number, dz: number, immediate = false) {
    this.goal.x += dx
    this.goal.z += dz
    this.clampView(this.goal)
    if (immediate) {
      this.target.x = this.goal.x
      this.target.z = this.goal.z
      this.placeCamera()
    }
  }

  private setHovered(pick: MapPick | null, clientX: number, clientY: number) {
    const same = pick?.kind === this.hovered?.kind && pick?.id === this.hovered?.id
    this.hovered = pick
    this.uniforms.uHoverCounty.value = pick?.kind === 'county' ? pick.id : -1
    this.uniforms.uHoverRealm.value = pick?.kind === 'realm' ? pick.id : -1
    if (!this.drag) this.renderer.domElement.style.cursor = pick ? 'pointer' : 'grab'
    if (!same || pick) this.callbacks.onHover(pick, clientX, clientY)
  }

  // --- frame ----------------------------------------------------------------

  private resize() {
    const { clientWidth, clientHeight } = this.container
    if (!clientWidth || !clientHeight) return
    this.renderer.setSize(clientWidth, clientHeight)
    this.camera.aspect = this.probe.aspect = clientWidth / clientHeight
    this.camera.updateProjectionMatrix()
    this.probe.updateProjectionMatrix()
    if (!this.away) this.fitHome()
    else this.limitZoom()
    this.wake()
  }

  private placeCamera() {
    const tilt = this.tiltAt(this.distance)
    this.camera.position.set(
      this.target.x,
      this.target.y + this.distance * Math.cos(tilt),
      this.target.z + this.distance * Math.sin(tilt),
    )
    this.camera.lookAt(this.target)
  }

  // Move each marker's element over its spot on the ground, hiding those off screen.
  // Styles are only written when they change, so a still camera costs nothing.
  private placeMarkers() {
    if (!this.markers.length) return
    this.camera.updateMatrixWorld()
    const { clientWidth: width, clientHeight: height } = this.container
    const scale = (1 - (1 - MARKER_FAR_SCALE) * smoothstep(MARKER_SHRINK[0], MARKER_SHRINK[1], this.distance)).toFixed(3)
    const near = this.distance < MARKER_NEAR
    const now = performance.now()
    for (const marker of this.markers) {
      const spot = this.spotOf(marker, now)
      const point = this.scratch.set(spot.x, this.heightAt(spot.x, spot.z), spot.z).project(this.camera)
      const x = ((point.x + 1) / 2) * width
      const y = ((1 - point.y) / 2) * height
      const shown = x > -80 && x < width + 80 && y > -20 && y < height + 120
      const transform = shown ? `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)` : ''
      if (transform !== marker.transform) {
        marker.transform = transform
        marker.element.style.transform = transform
        marker.element.style.visibility = shown ? 'visible' : 'hidden'
      }
      if (scale !== marker.scale) {
        marker.scale = scale
        marker.element.style.setProperty('--marker-scale', scale)
      }
      if (near !== marker.near) {
        marker.near = near
        marker.element.toggleAttribute('data-near', near)
      }
    }
  }

  // Draw the route through its spots on the ground. Segments are cut where they pass
  // behind the camera, which would otherwise project them back onto the screen.
  private placeRoute() {
    const route = this.route
    if (!route || !this.heights.length) return
    this.camera.updateMatrixWorld()
    const { clientWidth: width, clientHeight: height } = this.container
    const spots = route.at.map(([u, v]) => ({ x: (u - 0.5) * MAP_WIDTH, z: (v - 0.5) * MAP_DEPTH }))
    const followed = route.follow && this.markers.find(marker => marker.element === route.follow)
    if (followed && spots.length) spots[0] = this.spotOf(followed, performance.now())
    const near = -this.camera.near * 2
    const view = spots.map(({ x, z }) => new THREE.Vector3(x, this.heightAt(x, z), z).applyMatrix4(this.camera.matrixWorldInverse))
    const screen = (p: THREE.Vector3) => {
      const ndc = p.clone().applyMatrix4(this.camera.projectionMatrix)
      return `${(((ndc.x + 1) / 2) * width).toFixed(1)},${(((1 - ndc.y) / 2) * height).toFixed(1)}`
    }
    const points: string[] = []
    for (let i = 0; i < view.length; i++) {
      const p = view[i]!
      const previous = view[i - 1]
      if (previous && (previous.z > near) !== (p.z > near)) points.push(screen(previous.clone().lerp(p, (near - previous.z) / (p.z - previous.z))))
      if (p.z <= near) points.push(screen(p))
    }
    const joined = points.join(' ')
    if (joined !== route.points) {
      route.points = joined
      for (const line of route.lines) line.setAttribute('points', joined)
    }
    const last = view[view.length - 1]
    const endTransform = last && last.z <= near ? `translate(${screen(last).replace(',', 'px, ')}px)` : 'scale(0)'
    if (route.end && endTransform !== route.endTransform) {
      route.endTransform = endTransform
      route.end.style.transform = endTransform
    }
  }

  private tick = (now: number) => {
    if (this.disposed) return
    this.frame = 0
    const dt = clamp((now - this.lastTime) / 1000, 0, 0.05)
    this.lastTime = now

    const speed = this.goal.distance * 0.9 * dt
    if (this.keys.has('w') || this.keys.has('arrowup')) this.panBy(0, -speed)
    if (this.keys.has('s') || this.keys.has('arrowdown')) this.panBy(0, speed)
    if (this.keys.has('a') || this.keys.has('arrowleft')) this.panBy(-speed, 0)
    if (this.keys.has('d') || this.keys.has('arrowright')) this.panBy(speed, 0)
    if (this.keys.has('=') || this.keys.has('+')) this.goal.distance = clamp(this.goal.distance * (1 - dt * 1.5), MIN_DISTANCE, this.maxDistance)
    if (this.keys.has('-') || this.keys.has('_')) this.goal.distance = clamp(this.goal.distance * (1 + dt * 1.5), MIN_DISTANCE, this.maxDistance)

    const moving = this.flight !== null || Math.abs(this.goal.distance - this.distance) + Math.abs(this.goal.x - this.target.x) + Math.abs(this.goal.z - this.target.z) > 0.01
    // The map can slide under a resting cursor (zoom, keys, flights), so re-pick.
    if (moving && this.mouse && !this.drag) this.hoverAt = this.mouse
    if (this.flight) {
      const { from, to, placed, start, duration, lift } = this.flight
      const t = Math.min(1, (now - start) / duration)
      const e = easeInOut(t)
      const view = this.flightView(from, to, lift, e)
      if (placed) {
        const range = this.viewRange(view.distance)
        view.x = range.x[0] + (range.x[1] - range.x[0]) * (placed.from.u + (placed.to.u - placed.from.u) * e)
        view.z = range.z[0] + (range.z[1] - range.z[0]) * (placed.from.v + (placed.to.v - placed.from.v) * e)
      }
      this.target.x = view.x
      this.target.z = view.z
      this.distance = view.distance
      if (t >= 1) this.endFlight(true)
    }
    else {
      this.clampView(this.goal)
      const ease = this.options.reducedMotion ? 1 : 1 - Math.exp(-dt * 9)
      this.distance += (this.goal.distance - this.distance) * ease
      this.target.x += (this.goal.x - this.target.x) * ease
      this.target.z += (this.goal.z - this.target.z) * ease
    }
    // The goal is clamped for where the zoom ends up; on the way there the view could
    // still swing past the edge.
    const view: View = { x: this.target.x, z: this.target.z, distance: this.distance }
    this.clampView(view)
    this.target.x = view.x
    this.target.z = view.z
    const follow = this.options.reducedMotion ? 1 : 1 - Math.exp(-dt * 9)
    this.target.y += (this.heightAt(this.target.x, this.target.z) - this.target.y) * follow
    this.placeCamera()

    if (!this.options.reducedMotion) this.time += dt
    this.uniforms.uTime.value = this.time
    this.uniforms.uZoom.value = smoothstep(MIN_DISTANCE + 6, MAX_DISTANCE - 10, this.distance)

    for (const label of this.labels) {
      const [from, to] = label.fade
      const opacity = smoothstep(from, to, this.distance)
      label.mesh.material.opacity = opacity
      label.mesh.visible = opacity > 0.01
    }

    if (this.hoverAt) {
      this.setHovered(this.pickAt(this.hoverAt.x, this.hoverAt.y), this.hoverAt.x, this.hoverAt.y)
      this.hoverAt = null
    }

    this.placeMarkers()
    this.placeRoute()
    this.renderer.render(this.scene, this.camera)

    const settling = Math.abs(this.goal.distance - this.distance) + Math.abs(this.goal.x - this.target.x) + Math.abs(this.goal.z - this.target.z) > 0.01
    if (!this.options.reducedMotion || settling || this.keys.size || this.flight || this.markers.some(marker => marker.from)) {
      this.frame = requestAnimationFrame(this.tick)
    }
  }
}
