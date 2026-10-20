<script setup lang="ts">
import { Briefcase, ChevronRight, Eraser, GraduationCap, Landmark, Mountain } from '@lucide/vue'
import type { ComponentPublicInstance } from 'vue'
import { heldTown, heldTowns, holdingsIn, type HeldTown, type Holding } from '~/utils/realm/career'
import { dispatchQueue, loadReadDispatches, saveReadDispatches, type Dispatch } from '~/utils/realm/dispatches'
import { HOME_REALM_CODE, countyByFips, countyById, locate, mapData, realmById, type MapPick } from '~/utils/realm/map-data'
import { BASE_MAPS, LENSES, mapModePalette, type BaseMapId, type LensId, type MapModePalette } from '~/utils/realm/map-modes'
import type { ViewPadding } from '~/utils/realm/realm-renderer'
import { REALM_STAGE, type ArmyBanner } from '~/utils/realm/stage'

definePageMeta({ layout: false })

useSiteSeo('Mitchell Ponchione', '/')
useHead({
  link: [
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap' },
  ],
})

const BASE_ICONS = { political: Landmark, terrain: Mountain }
const LENS_ICONS = { career: Briefcase, education: GraduationCap }
const lensColor = (id: LensId) => `rgb(${LENSES.find(option => option.id === id)!.color.join(' ')})`

// The towns something happened in, as markers on the map. Each belongs to a lens.
const townMarkers = heldTowns.map((town) => {
  const lens: LensId = town.kind === 'schooling' ? 'education' : 'career'
  return { id: town.id, at: locate(town.at), town, county: countyByFips(town.fips)?.id, lens, color: lensColor(lens) }
})

const { data: posts } = await useAsyncData('realm-dispatches', () => queryCollection('blog')
  .select('path', 'title', 'date', 'summary', 'readingTime', 'tags')
  .order('date', 'DESC')
  .all())
const dispatches = computed<Dispatch[]>(() => posts.value ?? [])
const route = useRoute()
const letters = useLetterRoutes()
// Under /blog, a letter or the letter case is open over the map.
const overLetters = computed(() => route.path.startsWith('/blog'))
// At /play, Keystone is played on the map and the résumé steps aside.
const playing = computed(() => route.path === '/play')
const openLetter = computed(() => dispatches.value.find(dispatch => dispatch.path === route.path) ?? null)
const homeRealm: MapPick = { kind: 'realm', id: mapData.realms.find(realm => realm.code === HOME_REALM_CODE)!.id }

const base = ref<BaseMapId>('political')
const lens = ref<LensId | null>(null)
const selected = ref<MapPick | null>(null)
const hovered = ref<MapPick | null>(null)
const pointer = ref({ x: 0, y: 0 })
const status = ref<'loading' | 'ready' | 'failed'>('loading')
// Dispatches open as a queue of events; the order is fixed while it's open.
const eventQueue = ref<Dispatch[]>([])
const eventIndex = ref(0)
const activeDispatch = computed(() => eventQueue.value[eventIndex.value] ?? null)
const read = ref(new Set<string>())
// A record opens among its town's records, most recent first.
const records = shallowRef<{ queue: Holding[], index: number } | null>(null)
const activeRecord = computed(() => records.value?.queue[records.value.index] ?? null)
const sheetOpen = ref(false)
const map = ref<{
  flyTo: (target: MapPick | readonly [number, number]) => Promise<boolean>
  resetView: () => void
  frameCounties: (countyIds: readonly number[]) => Promise<boolean>
  paintPlate: (canvas: HTMLCanvasElement, subject: MapPick, mark?: readonly [number, number]) => void
}>()
// Whether the camera has left the opening view.
const away = ref(false)
const pristine = computed(() => !lens.value && base.value === 'political' && !selected.value && !away.value)
const banner = useTemplateRef<ComponentPublicInstance>('banner')
const modes = useTemplateRef<HTMLElement>('modes')
const panel = useTemplateRef<HTMLElement>('panel')

// What a game on the map paints and pins over it, in place of the map modes and towns.
const gamePalette = shallowRef<MapModePalette | null>(null)
const armies = shallowRef<ArmyBanner[]>([])
provide(REALM_STAGE, {
  ready: computed(() => status.value === 'ready'),
  palette: gamePalette,
  armies,
})
const palette = computed(() => gamePalette.value ?? mapModePalette(base.value, lens.value))
const markers = computed<((typeof townMarkers)[number] | ArmyBanner)[]>(() => (playing.value ? armies.value : townMarkers))

const unreadCount = computed(() => dispatches.value.filter(dispatch => !read.value.has(dispatch.path)).length)

// The opening view frames Pennsylvania with some of its neighbors around it. On narrow
// screens it instead keeps clear of the banner and the map-mode bar, which would
// otherwise cover most of it. Flights land clear of the place panel while it's open.
function viewPadding(): ViewPadding {
  const gap = 16
  // Once nothing is selected the panel is only fading out.
  const open = selectedPlace.value ? panel.value?.getBoundingClientRect() : undefined
  if (window.innerWidth >= 640) {
    const x = Math.round(window.innerWidth * 0.07)
    const y = Math.round(window.innerHeight * 0.09)
    return { top: y, right: x, bottom: y, left: open ? Math.max(x, Math.round(open.right) + gap) : x }
  }
  const bannerElement = banner.value?.$el as HTMLElement | undefined
  const top = bannerElement ? bannerElement.getBoundingClientRect().bottom + gap : 160
  const below = open ?? modes.value?.getBoundingClientRect()
  // A tall panel can leave only a sliver; keep some room to land in.
  const bottom = below ? Math.min(window.innerHeight - below.top + gap, window.innerHeight - top - 120) : 80
  return { top, right: 8, bottom, left: 8 }
}

type Place = {
  name: string
  kind: string
  areaKm2?: number
  holdings: ReturnType<typeof holdingsIn>
}

function describe(pick: MapPick | null): Place | null {
  if (!pick) return null
  if (pick.kind === 'county') {
    const county = countyById(pick.id)
    if (!county) return null
    return {
      name: `${county.name} County`,
      kind: 'Pennsylvania',
      areaKm2: county.areaKm2,
      holdings: holdingsIn(county.fips),
    }
  }
  const realm = realmById(pick.id)
  if (!realm) return null
  return { name: realm.name, kind: realm.code === HOME_REALM_CODE ? 'The home realm' : 'Neighboring realm', holdings: [] }
}

const hoveredPlace = computed(() => describe(hovered.value))
const selectedPlace = computed(() => describe(selected.value))

// Keep the tooltip on screen: flip it to the cursor's other side near the right/bottom edges.
const tooltipStyle = computed(() => {
  const { x, y } = pointer.value
  const flipX = import.meta.client && x > window.innerWidth - 260
  const flipY = import.meta.client && y > window.innerHeight - 120
  return {
    transform: `translate(${flipX ? `calc(${x - 14}px - 100%)` : `${x + 18}px`}, ${flipY ? `calc(${y - 14}px - 100%)` : `${y + 18}px`})`,
  }
})

function onHover(pick: MapPick | null, x: number, y: number) {
  hovered.value = pick
  pointer.value = { x, y }
}

async function onSelect(pick: MapPick | null) {
  if (playing.value) return
  selected.value = pick
  if (pick?.kind !== 'county') return
  // Let the panel open first, so the flight lands clear of it.
  await nextTick()
  map.value?.flyTo(pick)
}

// Fly to a town and select its county. The record unrolls once the camera lands, unless
// the visitor has moved on by then (a flight that's interrupted never lands).
async function travel(town: HeldTown, holding = town.holdings[0]!) {
  const county = countyByFips(town.fips)
  selected.value = county ? { kind: 'county', id: county.id } : null
  await nextTick()
  const landed = await map.value?.flyTo(locate(town.at))
  const still = selected.value?.kind === 'county' && selected.value.id === county?.id
  if (landed && still && !sheetOpen.value && !activeDispatch.value && !overLetters.value) openRecord(holding)
}

// The counties each lens lights up.
const lensCounties = Object.fromEntries(LENSES.map(option => [
  option.id,
  [...new Set(option.holdings.map(holding => countyByFips(holding.fips)?.id).filter(id => id !== undefined))],
])) as Record<LensId, number[]>

// Switching a lens on brings its counties into view if they aren't already (on a phone
// the career counties are wider than the screen).
function toggleLens(id: LensId) {
  lens.value = lens.value === id ? null : id
  if (lens.value) map.value?.frameCounties(lensCounties[lens.value])
}

// From the character sheet: go to where a post or school was, in the matching lens.
function visit(holding: Holding) {
  sheetOpen.value = false
  lens.value = holding.kind === 'schooling' ? 'education' : 'career'
  const town = heldTown(holding.town)
  if (town) travel(town, holding)
}

function openRecord(holding: Holding) {
  const queue = heldTown(holding.town)?.holdings ?? [holding]
  records.value = { queue, index: Math.max(0, queue.indexOf(holding)) }
}

function nextRecord() {
  if (records.value) records.value = { ...records.value, index: (records.value.index + 1) % records.value.queue.length }
}

function closeRecord() {
  records.value = null
}

// A record's plate: its county, with its town inked in.
function paintRecordPlate(canvas: HTMLCanvasElement, holding: Holding) {
  const county = countyByFips(holding.fips)
  const town = heldTown(holding.town)
  if (county) map.value?.paintPlate(canvas, { kind: 'county', id: county.id }, town && locate(town.at))
}

// Back to how the map opened: Political, no lens, nothing selected, the realm in view.
function clearMap() {
  lens.value = null
  base.value = 'political'
  selected.value = null
  map.value?.resetView()
}

// A letter counts as read once its seal is broken and it's open, not when its dispatch
// merely arrives.
function markRead(dispatch: Dispatch | null) {
  if (!dispatch || read.value.has(dispatch.path)) return
  read.value = new Set([...read.value, dispatch.path])
  saveReadDispatches(read.value)
}

watch(openLetter, markRead)

function openDispatches() {
  eventQueue.value = dispatchQueue(dispatches.value, read.value)
  eventIndex.value = 0
}

function nextDispatch() {
  eventIndex.value = (eventIndex.value + 1) % eventQueue.value.length
}

function closeDispatches() {
  eventQueue.value = []
}

// Whatever was open gives way to a letter or the letter case, however it was reached
// (a dispatch, the browser's Forward button).
watch(overLetters, (open) => {
  if (!open) return
  closeDispatches()
  closeRecord()
  sheetOpen.value = false
})

// Entering the game clears the résumé off the map and flies back to the opening view.
watch(playing, (entered) => {
  if (!entered) return
  closeDispatches()
  closeRecord()
  sheetOpen.value = false
  lens.value = null
  selected.value = null
  map.value?.resetView()
})

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || playing.value) return
  if (overLetters.value) letters.close()
  else if (activeDispatch.value) closeDispatches()
  else if (activeRecord.value) closeRecord()
  else if (sheetOpen.value) sheetOpen.value = false
  else selected.value = null
}

onMounted(() => {
  read.value = loadReadDispatches()
  // Someone who arrived on a letter has just read it.
  markRead(openLetter.value)
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

const HOLDING_KINDS = { post: 'Post', schooling: 'Schooling' } as const
const formatArea = (km2: number) => `${km2.toLocaleString('en-US')} km²`
const formatSpan = (start: string, end: string) => (start ? `${start} – ${end}` : end)
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`
const lensSummary = ({ holdings, unit }: (typeof LENSES)[number]) =>
  `${plural(holdings.length, ...unit)} · ${plural(new Set(holdings.map(holding => holding.fips)).size, 'county', 'counties')}`
</script>

<template>
  <div class="realm">
    <!-- First stop for the keyboard and screen readers, and a way in for crawlers: the
         map itself is a canvas. -->
    <NuxtLink to="/about" class="realm-skip">Skip the map for the plain pages</NuxtLink>
    <!-- An open letter has its own title. -->
    <h1 v-if="!openLetter && !playing" class="sr-only">Mitchell Ponchione — a map of the realm</h1>

    <RealmMap
      ref="map"
      :palette="palette"
      :selected="selected"
      :view-padding="viewPadding"
      :markers="markers"
      @hover="onHover"
      @select="onSelect"
      @away="(value) => away = value"
      @ready="status = 'ready'"
      @failed="status = 'failed'"
    >
      <template #marker="{ marker }">
        <RealmTown
          v-if="'town' in marker"
          :town="marker.town"
          :color="marker.color"
          :lit="lens === marker.lens"
          :dimmed="lens !== null && lens !== marker.lens"
          :active="selected?.kind === 'county' && selected.id === marker.county"
          @visit="travel(marker.town)"
        />
        <!-- Only /play has armies, so the home page never loads their code. -->
        <LazyKeystoneArmy v-else :banner="marker" />
      </template>
    </RealmMap>

    <Transition name="fade">
      <div v-if="status !== 'ready'" class="realm-veil">
        <p v-if="status === 'loading'" class="realm-veil-text">Surveying the land…</p>
        <div v-else class="realm-veil-text">
          <p>The map could not be drawn here.</p>
          <NuxtLink to="/about" class="realm-link">Take the old road instead</NuxtLink>
        </div>
      </div>
    </Transition>

    <Transition name="slide-left">
    <div v-if="!playing" class="realm-left">
      <RealmCharacterBanner
        ref="banner"
        :dispatch-count="dispatches.length"
        :unread-count="unreadCount"
        @open="sheetOpen = true"
        @dispatches="openDispatches"
      />

      <Transition name="fade">
        <aside v-if="selectedPlace" ref="panel" class="realm-panel" aria-live="polite">
        <button class="realm-close" type="button" aria-label="Close" @click="selected = null">×</button>
        <h2 class="realm-panel-title">{{ selectedPlace.name }}</h2>
        <p class="realm-muted">
          {{ selectedPlace.kind }}<template v-if="selectedPlace.areaKm2"> · {{ formatArea(selectedPlace.areaKm2) }}</template>
        </p>
        <template v-if="selected?.kind === 'county'">
          <h3 class="realm-rule"><span>Holdings</span></h3>
          <ul v-if="selectedPlace.holdings.length" class="realm-holdings">
            <li v-for="holding in selectedPlace.holdings" :key="holding.id">
              <button type="button" class="realm-holding" @click="openRecord(holding)">
                <RealmHeraldicShield class="realm-holding-arms" :seed="holding.institution" />
                <span class="realm-holding-text">
                  <span class="realm-holding-kind">{{ HOLDING_KINDS[holding.kind] }}</span>
                  <span class="realm-holding-title">{{ holding.title }}</span>
                  <span class="realm-muted">{{ holding.institution }}</span>
                  <span v-if="holding.detail" class="realm-muted">{{ holding.detail }}</span>
                  <span class="realm-muted">{{ formatSpan(holding.start, holding.end) }}</span>
                  <span v-if="holding.projects.length" class="realm-muted realm-projects">{{ holding.projects.map(project => project.name).join(' · ') }}</span>
                  <span class="realm-holding-read">Read the record<ChevronRight class="size-3.5" aria-hidden="true" /></span>
                </span>
              </button>
            </li>
          </ul>
          <p v-else class="realm-muted realm-empty">Unclaimed. Nothing has happened here yet.</p>
        </template>
        </aside>
      </Transition>
    </div>
    </Transition>

    <RealmCharacterSheet v-if="sheetOpen" @close="sheetOpen = false" @visit="visit" />

    <div
      v-if="hoveredPlace && status === 'ready' && !activeDispatch && !activeRecord && !overLetters && !playing"
      class="realm-tooltip"
      :style="tooltipStyle"
      aria-hidden="true"
    >
      <p class="realm-tooltip-title">{{ hoveredPlace.name }}</p>
      <p class="realm-muted">{{ hoveredPlace.kind }}</p>
      <p v-if="hoveredPlace.holdings.length" class="realm-tooltip-holdings">
        {{ plural(hoveredPlace.holdings.length, 'holding', 'holdings') }}
      </p>
    </div>

    <!-- The lenses are the point of the map; the base map is a quieter setting beside them. -->
    <Transition name="slide-down">
    <div v-if="!playing" ref="modes" class="realm-dock">
      <div class="realm-lenses" role="group" aria-label="Show on the map">
        <button
          v-for="option in LENSES"
          :key="option.id"
          type="button"
          class="realm-lens"
          :style="{ '--lens': `rgb(${option.color.join(' ')})` }"
          :aria-pressed="lens === option.id"
          :aria-description="option.hint"
          @click="toggleLens(option.id)"
        >
          <span class="realm-lens-seal">
            <component :is="LENS_ICONS[option.id]" class="size-[18px]" aria-hidden="true" />
          </span>
          <span class="realm-lens-text">
            <span class="realm-lens-label">{{ option.label }}</span>
            <span class="realm-lens-summary">{{ lensSummary(option) }}</span>
          </span>
        </button>
      </div>
      <div class="realm-dock-side">
        <div class="realm-clear-group">
          <button type="button" class="realm-clear" :disabled="pristine" @click="clearMap">
            <Eraser class="size-3.5" aria-hidden="true" />
            Clear
          </button>
        </div>
        <div class="realm-bases" role="group" aria-label="Base map">
          <button
            v-for="option in BASE_MAPS"
            :key="option.id"
            type="button"
            class="realm-base"
            :aria-pressed="base === option.id"
            :aria-label="option.label"
            @click="base = option.id"
          >
            <component :is="BASE_ICONS[option.id]" class="size-4" aria-hidden="true" />
            <span class="realm-base-tip" aria-hidden="true">
              <strong>{{ option.label }}</strong>
              <span>{{ option.hint }}</span>
            </span>
          </button>
        </div>
      </div>
    </div>
    </Transition>

    <Transition name="fade">
      <p v-if="!playing" class="realm-controls" aria-hidden="true">Drag or WASD to move · Scroll to zoom · Click a town or county</p>
    </Transition>

    <RealmDispatch
      v-if="activeDispatch && map"
      :dispatch="activeDispatch"
      :index="eventIndex"
      :total="eventQueue.length"
      :paint-plate="(canvas) => map?.paintPlate(canvas, homeRealm)"
      @next="nextDispatch"
      @close="closeDispatches"
      @open="letters.open"
    />

    <RealmRecord
      v-if="activeRecord && records && map"
      :key="activeRecord.id"
      :holding="activeRecord"
      :index="records.index"
      :total="records.queue.length"
      :paint-plate="(canvas) => paintRecordPlate(canvas, activeRecord!)"
      @next="nextRecord"
      @close="closeRecord"
    />

    <!-- A letter (/blog/<slug>) or the letter case (/blog), or Keystone (/play), over the map. -->
    <NuxtPage :transition="{ name: 'letter', mode: 'out-in' }" :dispatches="dispatches" :read="read" />
  </div>
</template>

<style scoped>
.realm {
  --ink: #e9dfc7;
  --ink-muted: #b3a688;
  --gold: #d9b56b;
  --gold-dim: #8a6f3e;
  --panel: linear-gradient(180deg, rgb(38 34 28 / 0.94), rgb(22 20 17 / 0.94));
  --panel-edge: #6e5a36;

  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #111214;
  color: var(--ink);
  font-family: "EB Garamond", Georgia, serif;
  font-size: 17px;
  user-select: none;
  scrollbar-color: var(--gold-dim) transparent;
  scrollbar-width: thin;
}

.realm-panel,
.realm-tooltip,
.realm-lenses,
.realm-clear-group,
.realm-bases {
  background: var(--panel);
  border: 1px solid var(--panel-edge);
  box-shadow: inset 0 0 0 1px rgb(255 230 170 / 0.06), 0 10px 30px rgb(0 0 0 / 0.45);
}

/* The character banner with the selected county's panel tucked beneath it. */
.realm-left {
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 380px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 32px);
  pointer-events: none;
}

.realm-left > * {
  pointer-events: auto;
}

.realm-skip {
  position: absolute;
  top: 16px;
  left: 50%;
  z-index: 20;
  padding: 8px 14px;
  border: 1px solid var(--panel-edge);
  border-radius: 4px;
  background: var(--panel);
  color: var(--ink);
  font-family: Cinzel, Georgia, serif;
  font-size: 14px;
  letter-spacing: 0.04em;
  text-decoration: none;
  transform: translate(-50%, -200%);
}

.realm-skip:focus {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
  transform: translate(-50%, 0);
}

.realm-link {
  color: var(--ink);
  text-decoration: none;
  border-bottom: 1px solid transparent;
}

.realm-link:hover {
  color: var(--gold);
  border-bottom-color: var(--gold-dim);
}

.realm-panel {
  position: relative;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 18px 18px;
  border-radius: 4px;
  user-select: text;
}

.realm-panel-title {
  font-family: Cinzel, Georgia, serif;
  font-weight: 700;
  font-size: 24px;
  letter-spacing: 0.04em;
  color: var(--gold);
  padding-right: 24px;
}

.realm-close {
  position: absolute;
  top: 8px;
  right: 10px;
  font-size: 22px;
  line-height: 1;
  color: var(--ink-muted);
}

.realm-close:hover {
  color: var(--gold);
}

.realm-rule {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 14px 0 10px;
  font-family: Cinzel, Georgia, serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-muted);
}

.realm-rule::before,
.realm-rule::after {
  content: "";
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold-dim), transparent);
}

.realm-projects {
  font-size: 15px;
  font-style: italic;
}

.realm-holdings {
  display: grid;
  gap: 8px;
}

.realm-holding {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #4e4129;
  border-radius: 3px;
  background: rgb(0 0 0 / 0.18);
  text-align: left;
  transition: border-color 150ms ease, background 150ms ease;
}

.realm-holding:hover,
.realm-holding:focus-visible {
  border-color: var(--gold);
  background: rgb(217 181 107 / 0.07);
  outline: none;
}

.realm-holding-text {
  display: grid;
  min-width: 0;
}

.realm-holding-read {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-top: 5px;
  font-family: Cinzel, Georgia, serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--gold);
}

.realm-holding-arms {
  width: 26px;
  flex-shrink: 0;
  margin-top: 2px;
}

.realm-holding-kind {
  font-family: Cinzel, Georgia, serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--gold);
}

.realm-holding-title {
  font-weight: 600;
  line-height: 1.25;
}

.realm-muted {
  color: var(--ink-muted);
  line-height: 1.3;
}

.realm-empty {
  font-style: italic;
}

.realm-tooltip {
  position: fixed;
  top: 0;
  left: 0;
  padding: 8px 12px;
  border-radius: 3px;
  pointer-events: none;
  will-change: transform;
}

.realm-tooltip-title {
  font-family: Cinzel, Georgia, serif;
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 0.05em;
  color: var(--gold);
}

.realm-tooltip-holdings {
  color: var(--ink);
  font-style: italic;
}

.realm-dock {
  position: absolute;
  right: 16px;
  bottom: 16px;
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.realm-lenses,
.realm-bases {
  display: flex;
  gap: 5px;
  padding: 5px;
  border-radius: 4px;
}

.realm-dock-side {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.realm-clear-group {
  padding: 4px;
  border-radius: 4px;
}

.realm-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 4px 8px;
  border: 1px solid transparent;
  border-radius: 3px;
  font-family: Cinzel, Georgia, serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-muted);
}

.realm-clear:hover:enabled {
  color: var(--gold);
  border-color: var(--gold-dim);
  background: rgb(255 230 170 / 0.05);
}

.realm-clear:disabled {
  opacity: 0.4;
}

.realm-lens {
  --lens-soft: color-mix(in srgb, var(--lens) 30%, transparent);

  display: flex;
  align-items: center;
  gap: 11px;
  padding: 7px 18px 7px 7px;
  border: 1px solid rgb(138 111 62 / 0.5);
  border-radius: 3px;
  background: linear-gradient(180deg, rgb(255 230 170 / 0.06), rgb(0 0 0 / 0.14));
  text-align: left;
  transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease;
}

.realm-lens:hover {
  border-color: var(--gold-dim);
  background-color: rgb(255 230 170 / 0.06);
}

.realm-lens[aria-pressed="true"] {
  border-color: var(--lens);
  background-color: color-mix(in srgb, var(--lens) 14%, transparent);
  box-shadow: inset 0 0 14px var(--lens-soft), 0 0 12px var(--lens-soft);
}

/* The seal doubles as the legend: it's the color the lens paints counties. */
.realm-lens-seal {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: 1px solid var(--lens);
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, rgb(255 255 255 / 0.1), rgb(0 0 0 / 0.4));
  box-shadow: inset 0 0 0 2px rgb(0 0 0 / 0.4);
  color: var(--lens);
  transition: background-color 150ms ease, color 150ms ease;
}

.realm-lens[aria-pressed="true"] .realm-lens-seal {
  background-color: var(--lens);
  color: #1d1810;
}

.realm-lens-text {
  display: grid;
}

.realm-lens-label {
  font-family: Cinzel, Georgia, serif;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.09em;
  line-height: 1.2;
  text-transform: uppercase;
  color: var(--ink);
}

.realm-lens[aria-pressed="true"] .realm-lens-label {
  color: var(--gold);
}

.realm-lens-summary {
  font-size: 15px;
  font-style: italic;
  line-height: 1.2;
  white-space: nowrap;
  color: var(--ink-muted);
}

.realm-base {
  position: relative;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid transparent;
  border-radius: 3px;
  color: var(--ink-muted);
}

.realm-base:hover {
  color: var(--ink);
  background: rgb(255 230 170 / 0.05);
}

.realm-base[aria-pressed="true"] {
  color: var(--gold);
  border-color: var(--gold-dim);
  background: rgb(217 181 107 / 0.1);
}

.realm-base-tip {
  position: absolute;
  right: -6px;
  bottom: calc(100% + 12px);
  display: grid;
  gap: 2px;
  width: max-content;
  padding: 7px 10px;
  border: 1px solid var(--panel-edge);
  border-radius: 3px;
  background: var(--panel);
  box-shadow: 0 8px 20px rgb(0 0 0 / 0.5);
  font-size: 15px;
  line-height: 1.3;
  text-align: left;
  color: var(--ink-muted);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 120ms ease;
}

.realm-base-tip strong {
  font-family: Cinzel, Georgia, serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--gold);
}

.realm-base:hover .realm-base-tip,
.realm-base:focus-visible .realm-base-tip {
  opacity: 1;
  visibility: visible;
}

.realm-lens:focus-visible,
.realm-base:focus-visible,
.realm-clear:focus-visible,
.realm-close:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}

.realm-controls {
  position: absolute;
  left: 16px;
  bottom: 18px;
  font-style: italic;
  font-size: 15px;
  color: rgb(233 223 199 / 0.6);
  text-shadow: 0 1px 2px rgb(0 0 0 / 0.8);
  pointer-events: none;
}

.realm-veil {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: #111214;
}

.realm-veil-text {
  display: grid;
  gap: 8px;
  text-align: center;
  font-size: 22px;
  font-style: italic;
  color: var(--ink-muted);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 400ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* The résumé stepping aside for the game, off the edges it sits on, and back. */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-down-enter-active,
.slide-down-leave-active {
  transition: opacity 500ms ease, transform 500ms ease;
}

.slide-left-enter-from,
.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-40px);
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(40px);
}

@media (max-width: 640px) {
  .realm-left {
    top: 10px;
    left: 10px;
    right: 10px;
    width: auto;
    max-width: none;
  }

  /* On phones the county panel sits above the map-mode bar instead. */
  .realm-panel {
    position: fixed;
    left: 10px;
    right: 10px;
    bottom: 108px;
    max-height: 45vh;
  }

  .realm-dock {
    right: 10px;
    bottom: 10px;
    left: 10px;
    gap: 6px;
  }

  .realm-lenses {
    flex: 1;
  }

  .realm-lens {
    flex: 1;
    gap: 8px;
    padding: 5px 8px 5px 5px;
  }

  .realm-lens-seal {
    width: 30px;
    height: 30px;
  }

  .realm-lens-label {
    font-size: 13px;
    letter-spacing: 0.05em;
  }

  .realm-lens-summary {
    display: none;
  }

  .realm-base {
    width: 36px;
    height: 40px;
  }
}

@media (max-width: 900px) {
  .realm-controls {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fade-enter-active,
  .fade-leave-active,
  .slide-left-enter-active,
  .slide-left-leave-active,
  .slide-down-enter-active,
  .slide-down-leave-active,
  .realm-lens,
  .realm-lens-seal,
  .realm-base-tip,
  .realm-holding {
    transition: none;
  }
}
</style>
