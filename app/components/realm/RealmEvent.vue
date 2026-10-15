<script setup lang="ts">
// The frame every event pop-up shares: a kicker, an engraved plate drawn from the map,
// a title, then whatever the event has to say and the options it offers.

const props = defineProps<{
  kicker: string
  title: string
  // Named in the plate's corner.
  plateCaption: string
  paintPlate: (canvas: HTMLCanvasElement) => void
  // The id of the element (in the default slot) that describes the event, if any.
  describedBy?: string
  // Events with a lot to read get more room, a shallower plate, and a close button.
  wide?: boolean
}>()

const emit = defineEmits<{ close: [] }>()

const dialog = useTemplateRef<HTMLElement>('dialog')
const plate = useTemplateRef<HTMLCanvasElement>('plate')
// Whatever opened the event gets the focus back when it closes.
let opener: Element | null = null

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// The event is modal, so Tab and Shift+Tab cycle through its own controls and never
// wander off to the map behind it.
function holdFocus(event: KeyboardEvent) {
  const frame = dialog.value
  if (event.key !== 'Tab' || !frame) return
  const controls = [...frame.querySelectorAll<HTMLElement>(FOCUSABLE)]
  const first = controls[0]
  const last = controls[controls.length - 1]
  const active = document.activeElement
  const inside = active instanceof Node && frame.contains(active)
  if (!first || !last) {
    event.preventDefault()
    frame.focus({ preventScroll: true })
  }
  else if (event.shiftKey ? !inside || active === first || active === frame : !inside || active === last) {
    event.preventDefault()
    ;(event.shiftKey ? last : first).focus()
  }
}

function paint() {
  const canvas = plate.value
  if (!canvas) return
  const ratio = Math.min(window.devicePixelRatio, 2)
  canvas.width = Math.round(canvas.clientWidth * ratio)
  canvas.height = Math.round(canvas.clientHeight * ratio)
  props.paintPlate(canvas)
}

onMounted(() => {
  paint()
  opener = document.activeElement
  // Somewhere for the keyboard to start; an event may then focus an option of its own.
  dialog.value?.focus({ preventScroll: true })
  document.addEventListener('keydown', holdFocus)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', holdFocus)
  if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true })
})
</script>

<template>
  <div class="realm-event-backdrop" @click.self="emit('close')">
    <section
      ref="dialog"
      class="realm-event"
      :class="{ 'realm-event-wide': wide }"
      role="dialog"
      aria-modal="true"
      aria-labelledby="realm-event-title"
      :aria-describedby="describedBy"
      tabindex="-1"
    >
      <button v-if="wide" type="button" class="realm-event-close" aria-label="Close" @click="emit('close')">×</button>
      <p class="realm-event-kicker">{{ kicker }}</p>
      <div class="realm-event-plate">
        <canvas ref="plate" aria-hidden="true" />
        <span class="realm-event-plate-caption" aria-hidden="true">{{ plateCaption }}</span>
      </div>
      <h2 id="realm-event-title" class="realm-event-title">{{ title }}</h2>
      <slot />
      <div class="realm-event-options">
        <slot name="options" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.realm-event-backdrop {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 16px;
  background: radial-gradient(ellipse at center, rgb(0 0 0 / 0.25), rgb(0 0 0 / 0.6));
  user-select: text;
}

.realm-event {
  position: relative;
  width: min(540px, 100%);
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  padding: 18px 22px 20px;
  border: 1px solid #6e5a36;
  border-radius: 4px;
  background:
    linear-gradient(180deg, rgb(255 236 190 / 0.05), transparent 120px),
    linear-gradient(180deg, #2a251e, #18150f);
  box-shadow:
    inset 0 0 0 1px rgb(255 230 170 / 0.06),
    inset 0 0 0 5px rgb(0 0 0 / 0.25),
    inset 0 0 0 6px rgb(184 149 90 / 0.35),
    0 24px 60px rgb(0 0 0 / 0.6);
  outline: none;
  animation: realm-event-in 260ms ease-out;
}

.realm-event-wide {
  width: min(680px, 100%);
}

.realm-event-close {
  position: absolute;
  top: 10px;
  right: 14px;
  font-size: 24px;
  line-height: 1;
  color: var(--ink-muted);
}

.realm-event-close:hover,
.realm-event-close:focus-visible {
  color: var(--gold);
  outline: none;
}

.realm-event-kicker {
  text-align: center;
  font-family: Cinzel, Georgia, serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-muted);
}

.realm-event-plate {
  position: relative;
  margin: 12px 0 14px;
  border: 1px solid #8a6f3e;
  box-shadow: 0 0 0 3px #1a1610, 0 0 0 4px rgb(184 149 90 / 0.45);
}

/* Roughly Pennsylvania's own proportions, so the plate never runs off the map. */
.realm-event-plate canvas {
  display: block;
  width: 100%;
  aspect-ratio: 19 / 10;
}

.realm-event-wide .realm-event-plate canvas {
  aspect-ratio: 3 / 1;
}

.realm-event-plate::after {
  content: "";
  position: absolute;
  inset: 0;
  box-shadow: inset 0 0 40px rgb(60 40 15 / 0.45);
  pointer-events: none;
}

.realm-event-plate-caption {
  position: absolute;
  top: 6px;
  right: 10px;
  font-family: Cinzel, Georgia, serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgb(58 42 26 / 0.85);
  /* A wash of bare parchment behind the letters, so the engraving doesn't swallow them. */
  text-shadow: 0 0 3px #e6d9b6, 0 0 6px #e6d9b6, 0 0 10px #e6d9b6, 0 0 14px #e6d9b6;
}

.realm-event-title {
  font-family: Cinzel, Georgia, serif;
  font-weight: 700;
  font-size: 22px;
  line-height: 1.2;
  letter-spacing: 0.03em;
  color: var(--gold);
}

.realm-event-options {
  display: grid;
  gap: 8px;
  margin-top: 18px;
}

:slotted(.realm-event-option) {
  display: block;
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #5a4a2e;
  border-radius: 3px;
  background: linear-gradient(180deg, #2f2920, #221e17);
  text-align: left;
  font-size: 17px;
  color: var(--ink);
  text-decoration: none;
  transition: border-color 150ms ease, background 150ms ease;
}

:slotted(.realm-event-option:hover),
:slotted(.realm-event-option:focus-visible) {
  border-color: var(--gold);
  background: linear-gradient(180deg, #3a3226, #29231a);
  outline: none;
}

:slotted(.realm-event-option-primary) {
  font-weight: 600;
  color: var(--gold);
}

@keyframes realm-event-in {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .realm-event {
    animation: none;
  }

  :slotted(.realm-event-option) {
    transition: none;
  }
}
</style>
