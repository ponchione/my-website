<script setup lang="ts" generic="Marker extends { id: string, at: readonly [number, number], glide?: number }">
import type { ComponentPublicInstance } from 'vue'
import type { MapPick } from '~/utils/realm/map-data'
import type { MapModePalette } from '~/utils/realm/map-modes'
import { RealmRenderer, type ViewPadding } from '~/utils/realm/realm-renderer'

const props = defineProps<{
  palette: MapModePalette
  selected: MapPick | null
  viewPadding: () => ViewPadding
  // Things to pin over spots on the map (normalized map coordinates). Each draws itself
  // in the `marker` slot, standing on its spot: the slot's origin is the spot itself.
  markers?: Marker[]
  // A line over the map through spots (normalized map coordinates). `follow` names the
  // marker it starts from, so it stays attached while that marker walks.
  route?: { at: readonly (readonly [number, number])[], follow?: string } | null
}>()

const emit = defineEmits<{
  hover: [pick: MapPick | null, clientX: number, clientY: number]
  select: [pick: MapPick | null]
  away: [away: boolean]
  ready: []
  failed: []
}>()

defineSlots<{ marker?: (props: { marker: Marker }) => unknown }>()

const container = useTemplateRef<HTMLDivElement>('container')
let renderer: RealmRenderer | null = null

const pins = new Map<string, HTMLElement>()

function setPin(id: string, element: Element | ComponentPublicInstance | null) {
  if (element instanceof HTMLElement) pins.set(id, element)
  else pins.delete(id)
}

function pinMarkers() {
  renderer?.setMarkers((props.markers ?? []).flatMap((marker) => {
    const element = pins.get(marker.id)
    return element ? [{ element, at: marker.at, glide: marker.glide }] : []
  }))
}

const routeCasing = useTemplateRef<SVGPolylineElement>('routeCasing')
const routeLine = useTemplateRef<SVGPolylineElement>('routeLine')
const routeEnd = useTemplateRef<SVGGElement>('routeEnd')

function drawRoute() {
  const route = props.route
  renderer?.setRoute(route && routeCasing.value && routeLine.value
    ? { lines: [routeCasing.value, routeLine.value], end: routeEnd.value, at: route.at, follow: (route.follow && pins.get(route.follow)) || null }
    : null)
}

onMounted(async () => {
  // .client components render their template only after mounting.
  await nextTick()
  try {
    if (!container.value) throw new Error('Map container missing')
    renderer = new RealmRenderer(container.value, {
      onHover: (pick, x, y) => emit('hover', pick, x, y),
      onSelect: pick => emit('select', pick),
      onAway: away => emit('away', away),
    }, {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      viewPadding: props.viewPadding,
    })
    renderer.setPalette(props.palette)
    renderer.setSelected(props.selected)
    pinMarkers()
    await renderer.load('/realm')
    drawRoute()
    emit('ready')
  }
  catch (error) {
    // Visitors get a way to the plain pages; the reason is for whoever opens the console.
    console.error('The map could not be drawn:', error)
    emit('failed')
  }
})

watch(() => props.palette, palette => renderer?.setPalette(palette))
watch(() => props.selected, pick => renderer?.setSelected(pick))
watch(() => props.markers, pinMarkers, { flush: 'post' })
watch(() => props.route, drawRoute, { flush: 'post' })

onBeforeUnmount(() => {
  renderer?.dispose()
  renderer = null
})

defineExpose({
  flyTo: (target: MapPick | readonly [number, number]) => renderer?.flyTo(target) ?? Promise.resolve(false),
  resetView: () => renderer?.resetView(),
  frameCounties: (countyIds: readonly number[]) => renderer?.frameCounties(countyIds) ?? Promise.resolve(false),
  paintPlate: (canvas: HTMLCanvasElement, subject: MapPick, mark?: readonly [number, number]) => renderer?.paintPlate(canvas, subject, mark),
})
</script>

<template>
  <div ref="container" class="absolute inset-0 isolate">
    <div class="realm-pins">
      <svg v-if="route" class="realm-route" aria-hidden="true">
        <polyline ref="routeCasing" class="realm-route-casing" />
        <polyline ref="routeLine" class="realm-route-line" />
        <g ref="routeEnd" class="realm-route-end">
          <circle r="6" />
        </g>
      </svg>
      <div v-for="marker in markers" :key="marker.id" :ref="element => setPin(marker.id, element)" class="realm-pin">
        <slot name="marker" :marker="marker" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Above the map's canvas, which the renderer adds to the container. The container is
   its own stacking context (isolate), which keeps the pins under the page's other UI. */
.realm-pins {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: hidden;
  pointer-events: none;
}

/* A route over the map (an army's march): a dashed gold line on a dark casing,
   ending in a ring. The renderer sets the points each frame. */
.realm-route {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.realm-route polyline {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.realm-route-casing {
  stroke: rgb(20 16 10 / 0.75);
  stroke-width: 6px;
}

.realm-route-line {
  stroke: #e9c77a;
  stroke-width: 2.5px;
  stroke-dasharray: 8 7;
  animation: realm-route-march 900ms linear infinite;
}

.realm-route-end {
  transform: scale(0);
}

.realm-route-end circle {
  fill: rgb(20 16 10 / 0.55);
  stroke: #e9c77a;
  stroke-width: 2.5px;
}

/* The dashes walk toward the destination. */
@keyframes realm-route-march {
  to {
    stroke-dashoffset: -15;
  }
}

@media (prefers-reduced-motion: reduce) {
  .realm-route-line {
    animation: none;
  }
}

/* A point, moved onto its spot by the renderer each frame; hidden until it has been. */
.realm-pin {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  visibility: hidden;
  will-change: transform;
}
</style>
