<script setup lang="ts">
import type { HeldTown } from '~/utils/realm/career'

// A town's marker on the map: a small drawn settlement standing on its spot, with a
// nameplate above it once the camera is near (or on hover). Its roofs and pennant take
// the color of its lens, so the marker says which lens it belongs to.

const props = defineProps<{
  town: HeldTown
  // The CSS color of the lens this town belongs to.
  color: string
  // Its lens is on.
  lit: boolean
  // Another lens is on.
  dimmed: boolean
  // Its county is the one selected.
  active: boolean
}>()

const emit = defineEmits<{ visit: [] }>()

const institutions = computed(() => [...new Set(props.town.holdings.map(holding => holding.institution))])
const summary = computed(() => {
  const count = (kind: 'post' | 'schooling', one: string, many: string) => {
    const total = props.town.holdings.filter(holding => holding.kind === kind).length
    return total ? [`${total} ${total === 1 ? one : many}`] : []
  }
  return [...count('post', 'post', 'posts'), ...count('schooling', 'degree', 'degrees')].join(' · ')
})
</script>

<template>
  <button
    type="button"
    class="town"
    :class="{ 'town-lit': lit, 'town-dimmed': dimmed, 'town-active': active }"
    :style="{ '--town': color }"
    :aria-label="`${town.name}: ${summary}. Read the record.`"
    @click="emit('visit')"
  >
    <span class="town-plate" aria-hidden="true">
      <span class="town-arms">
        <RealmHeraldicShield v-for="institution in institutions" :key="institution" :seed="institution" />
      </span>
      <span class="town-text">
        <span class="town-name">{{ town.name }}</span>
        <span class="town-summary">{{ summary }}</span>
      </span>
    </span>

    <svg class="town-icon" viewBox="0 0 48 44" aria-hidden="true">
      <ellipse class="town-ground" cx="24" cy="39.6" rx="20.5" ry="3.6" />
      <!-- A hall with a pediment and cupola for schooling; a walled keep for posts. -->
      <g v-if="town.kind === 'schooling'" class="town-art">
        <path class="town-stone" d="M21.2 14.6V8.8h5.6v5.8z" />
        <path class="town-roof" d="M20.4 9a3.6 3.6 0 0 1 7.2 0z" />
        <path class="town-pole" d="M24 5.4V1.4" />
        <path class="town-roof" d="M24 1.6l5.4 1.6L24 4.8z" />
        <path class="town-shade" d="M9 25.5h30V36H9z" />
        <path class="town-stone" d="M11.2 25.5H14V36h-2.8zM16.6 25.5h2.8V36h-2.8zM28.6 25.5h2.8V36h-2.8zM34 25.5h2.8V36H34z" />
        <path class="town-ink" d="M21.6 36v-5.4a2.4 2.4 0 0 1 4.8 0V36z" />
        <path class="town-stone" d="M7 22.5h34v3H7z" />
        <path class="town-roof" d="M6 22.5L24 13l18 9.5z" />
        <path class="town-stone" d="M6 36h36v3.4H6z" />
      </g>
      <g v-else class="town-art">
        <path class="town-pole" d="M24 12.4V2.6" />
        <path class="town-roof" d="M24 3l8.6 2.5L24 8z" />
        <path class="town-stone" d="M18 39.4V12.4h2.4V15h2.4v-2.6h2.4V15h2.4v-2.6H30v27z" />
        <path class="town-ink" d="M22.9 24.4v-3.6a1.1 1.1 0 0 1 2.2 0v3.6z" />
        <path class="town-shade" d="M7 39.4V23.5h8.5v15.9z" />
        <path class="town-roof" d="M5.5 23.5L11.25 13 17 23.5z" />
        <path class="town-shade" d="M32.5 39.4V23.5H41v15.9z" />
        <path class="town-roof" d="M31 23.5L36.75 13l5.75 10.5z" />
        <path class="town-stone" d="M13.5 39.4V29h2.4v-2.2h2.6V29h2.6v-2.2h5.8V29h2.6v-2.2h2.6V29h2.4v10.4z" />
        <path class="town-ink" d="M21.4 39.4v-4.6a2.6 2.6 0 0 1 5.2 0v4.6z" />
      </g>
    </svg>
  </button>
</template>

<style scoped>
/* The slot's origin is the town's spot; stand on it, centered. Only what's drawn takes
   the pointer (the icon, and the nameplate while it shows), so the map around a marker
   stays clickable. */
.town {
  position: absolute;
  bottom: -4px;
  left: 0;
  display: grid;
  justify-items: center;
  gap: 3px;
  translate: -50% 0;
  pointer-events: none;
  touch-action: none;
  transition: opacity 200ms ease, filter 200ms ease;
}

.town-dimmed {
  opacity: 0.55;
  filter: saturate(0.4);
}

.town-icon {
  display: block;
  width: calc(64px * var(--marker-scale, 1));
  overflow: visible;
  filter: drop-shadow(0 0 3px rgb(0 0 0 / 0.75)) drop-shadow(0 2px 2px rgb(0 0 0 / 0.6));
  pointer-events: auto;
  transition: scale 150ms ease, filter 200ms ease;
  transform-origin: 50% 90%;
}

.town:hover .town-icon,
.town:focus-visible .town-icon {
  scale: 1.12;
}

.town-lit .town-icon,
.town-active .town-icon,
.town:hover .town-icon,
.town:focus-visible .town-icon {
  filter: drop-shadow(0 0 6px var(--town)) drop-shadow(0 2px 2px rgb(0 0 0 / 0.6));
}

.town-art path {
  stroke: #1d1810;
  stroke-width: 1.2;
  stroke-linejoin: round;
}

.town-stone {
  fill: #e2d5b3;
}

.town-shade {
  fill: #b9a986;
}

.town-roof {
  fill: var(--town);
}

.town-ink {
  fill: #1d1810;
}

.town-pole {
  fill: none;
  stroke-linecap: round;
}

/* The ring it stands in breathes, so the eye finds the places worth opening. */
.town-ground {
  fill: rgb(0 0 0 / 0.4);
  stroke: var(--town);
  stroke-width: 1.4;
  animation: town-breathe 2.6s ease-in-out infinite;
}

.town-plate {
  position: relative;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 9px 4px 6px;
  border: 1px solid var(--panel-edge);
  border-radius: 3px;
  background: var(--panel);
  box-shadow: inset 0 0 0 1px rgb(255 230 170 / 0.06), 0 6px 16px rgb(0 0 0 / 0.5);
  white-space: nowrap;
  opacity: 0;
  translate: 0 4px;
  transition: opacity 150ms ease, translate 150ms ease, border-color 150ms ease;
}

/* Named once the camera is close (the renderer marks the pin it sits in), and from any
   distance while its lens is on. */
[data-near] .town-plate,
.town-lit .town-plate,
.town:hover .town-plate,
.town:focus-visible .town-plate,
.town-active .town-plate {
  opacity: 1;
  translate: 0 0;
  pointer-events: auto;
}

/* Covers the gap down to the icon, so the pointer can cross it without losing the hover. */
.town-plate::after {
  content: "";
  position: absolute;
  top: 100%;
  right: 0;
  left: 0;
  height: 6px;
}

.town:hover .town-plate,
.town:focus-visible .town-plate {
  border-color: var(--gold);
}

.town-arms {
  display: flex;
}

.town-arms > * {
  width: 15px;
}

.town-arms > * + * {
  margin-left: -5px;
}

.town-text {
  display: grid;
  text-align: left;
}

.town-name {
  font-family: Cinzel, Georgia, serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1.25;
  text-transform: uppercase;
  color: var(--gold);
}

.town-summary {
  display: none;
  font-size: 14px;
  font-style: italic;
  line-height: 1.2;
  color: var(--ink-muted);
}

.town:hover .town-summary,
.town:focus-visible .town-summary {
  display: block;
}

.town:focus-visible {
  outline: none;
}

.town:focus-visible .town-plate {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}

@keyframes town-breathe {
  0%, 100% { stroke-opacity: 0.45; }
  50% { stroke-opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .town,
  .town-icon,
  .town-plate {
    transition: none;
  }

  .town-ground {
    animation: none;
    stroke-opacity: 0.8;
  }
}
</style>
