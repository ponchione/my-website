<script setup lang="ts" generic="Marker extends { id: string, at: readonly [number, number] }">
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
    return element ? [{ element, at: marker.at }] : []
  }))
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
