<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import type { Holding, JourneyStop } from '~/utils/realm/career'
import { countyByFips } from '~/utils/realm/map-data'
import { LENSES } from '~/utils/realm/map-modes'

// The guided tour's card: the road from schooling to the current post as a row of
// stops, and the stop the camera is at. It sits where the county panel would.

const props = defineProps<{
  stops: JourneyStop[]
  index: number
}>()

const emit = defineEmits<{
  go: [index: number]
  record: [holding: Holding]
  close: []
}>()

const card = useTemplateRef<HTMLElement>('card')
const stop = computed(() => props.stops[props.index]!)
const last = computed(() => props.index === props.stops.length - 1)
const place = computed(() => {
  const county = countyByFips(stop.value.holding.fips)?.name
  return [stop.value.town.name, county && `${county} County`].filter(Boolean).join(', ')
})
const span = computed(() => {
  const { start, end } = stop.value.holding
  return start ? `${start} – ${end}` : `Conferred ${end}`
})
// A taste of the record: its first deed, or its projects' names.
const gist = computed(() => {
  const { duties, projects } = stop.value.holding
  return duties[0] ?? projects.map(project => project.name).join(' · ')
})
const color = (entry: JourneyStop) => {
  const lens = LENSES.find(option => option.id === (entry.holding.kind === 'schooling' ? 'education' : 'career'))!
  return `rgb(${lens.color.join(' ')})`
}

onMounted(() => card.value?.focus())
</script>

<template>
  <section ref="card" class="tour" aria-labelledby="realm-tour-title" tabindex="-1">
    <button class="tour-close" type="button" aria-label="End the tour" @click="emit('close')">×</button>
    <p class="tour-kicker">The road so far · {{ index + 1 }} of {{ stops.length }}</p>

    <ol class="tour-road">
      <li v-for="(entry, at) in stops" :key="entry.holding.id">
        <button
          type="button"
          class="tour-pip"
          :class="{ 'tour-pip-passed': at < index }"
          :style="{ '--stop': color(entry) }"
          :aria-current="at === index ? 'step' : undefined"
          :aria-label="`${entry.year}: ${entry.holding.title}, ${entry.holding.institution}`"
          @click="emit('go', at)"
        >
          <span class="tour-pip-dot" aria-hidden="true" />
          <span class="tour-pip-year" aria-hidden="true">{{ entry.year }}</span>
        </button>
      </li>
    </ol>

    <div class="tour-stop" aria-live="polite">
      <p class="tour-milestone" :style="{ color: color(stop) }">{{ stop.milestone }}</p>
      <h2 id="realm-tour-title" class="tour-title">{{ stop.holding.title }}</h2>
      <p class="tour-institution">{{ stop.holding.institution }}</p>
      <p class="tour-muted">{{ place }} · {{ span }}</p>
      <p v-if="stop.holding.detail" class="tour-muted">{{ stop.holding.detail }}</p>
      <p class="tour-move">{{ stop.move }}</p>
      <p v-if="gist" class="tour-gist">{{ gist }}</p>
    </div>

    <div class="tour-options">
      <button type="button" class="tour-option tour-option-primary" @click="emit('record', stop.holding)">
        Read the record
      </button>
      <div class="tour-steps">
        <button type="button" class="tour-option" :disabled="index === 0" @click="emit('go', index - 1)">
          <ChevronLeft class="size-4" aria-hidden="true" />Back
        </button>
        <button v-if="!last" type="button" class="tour-option" @click="emit('go', index + 1)">
          Next stop<ChevronRight class="size-4" aria-hidden="true" />
        </button>
        <button v-else type="button" class="tour-option" @click="emit('close')">
          End the tour
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.tour {
  position: relative;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 18px 16px;
  border: 1px solid var(--panel-edge);
  border-radius: 4px;
  background: var(--panel);
  box-shadow: inset 0 0 0 1px rgb(255 230 170 / 0.06), 0 10px 30px rgb(0 0 0 / 0.45);
  outline: none;
  user-select: text;
}

.tour-close {
  position: absolute;
  top: 8px;
  right: 10px;
  font-size: 22px;
  line-height: 1;
  color: var(--ink-muted);
}

.tour-close:hover {
  color: var(--gold);
}

.tour-kicker {
  padding-right: 24px;
  font-family: Cinzel, Georgia, serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-muted);
}

/* The stops strung along a road, oldest first. */
.tour-road {
  position: relative;
  display: flex;
  justify-content: space-between;
  margin: 12px 0 4px;
}

.tour-road::before {
  content: "";
  position: absolute;
  top: 9px;
  right: 14px;
  left: 14px;
  height: 1px;
  background: linear-gradient(90deg, var(--gold-dim), var(--gold-dim) 60%, rgb(138 111 62 / 0.4));
}

.tour-pip {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 3px;
  min-width: 30px;
  padding: 2px 0;
  border-radius: 3px;
}

.tour-pip-dot {
  width: 12px;
  height: 12px;
  margin-top: 2px;
  rotate: 45deg;
  border: 1px solid var(--stop);
  background: #1d1810;
  transition: background-color 150ms ease, box-shadow 150ms ease;
}

.tour-pip-passed .tour-pip-dot {
  background: color-mix(in srgb, var(--stop) 55%, #1d1810);
}

.tour-pip[aria-current="step"] .tour-pip-dot {
  background: var(--stop);
  box-shadow: 0 0 0 3px #1d1810, 0 0 0 4px var(--stop), 0 0 12px var(--stop);
}

.tour-pip-year {
  font-size: 13px;
  line-height: 1;
  color: var(--ink-muted);
}

.tour-pip[aria-current="step"] .tour-pip-year {
  color: var(--gold);
  font-weight: 600;
}

.tour-pip:hover .tour-pip-dot {
  box-shadow: 0 0 8px var(--stop);
}

.tour-stop {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgb(138 111 62 / 0.45);
}

.tour-milestone {
  font-family: Cinzel, Georgia, serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.tour-title {
  margin-top: 2px;
  font-family: Cinzel, Georgia, serif;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.03em;
  color: var(--gold);
}

.tour-institution {
  margin-top: 2px;
  font-weight: 600;
  line-height: 1.25;
}

.tour-muted {
  line-height: 1.3;
  color: var(--ink-muted);
}

.tour-move {
  margin-top: 6px;
  font-style: italic;
  color: var(--ink);
}

.tour-gist {
  display: -webkit-box;
  margin-top: 6px;
  overflow: hidden;
  font-size: 16px;
  line-height: 1.35;
  color: var(--ink-muted);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
}

.tour-options {
  display: grid;
  gap: 6px;
  margin-top: 12px;
}

.tour-steps {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.tour-option {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 7px 10px;
  border: 1px solid #5a4a2e;
  border-radius: 3px;
  background: linear-gradient(180deg, #2f2920, #221e17);
  font-size: 16px;
  color: var(--ink);
  transition: border-color 150ms ease, background 150ms ease;
}

.tour-option:hover:enabled,
.tour-option:focus-visible {
  border-color: var(--gold);
  background: linear-gradient(180deg, #3a3226, #29231a);
  outline: none;
}

.tour-option:disabled {
  opacity: 0.4;
}

.tour-option-primary {
  font-weight: 600;
  color: var(--gold);
}

.tour-close:focus-visible,
.tour-pip:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}

@media (max-width: 640px) {
  .tour {
    position: fixed;
    left: 10px;
    right: 10px;
    bottom: 108px;
    max-height: 52vh;
    padding: 12px 14px 14px;
  }

  .tour-gist {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tour-pip-dot,
  .tour-option {
    transition: none;
  }
}
</style>
