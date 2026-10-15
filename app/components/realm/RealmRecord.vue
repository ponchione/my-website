<script setup lang="ts">
import { heldTown, type Holding } from '~/utils/realm/career'
import { countyByFips } from '~/utils/realm/map-data'

// The full record of a post or of schooling: everything the resume says about it.

const props = defineProps<{
  holding: Holding
  // Position among the town's records, for "1 of 2".
  index: number
  total: number
  paintPlate: (canvas: HTMLCanvasElement) => void
}>()

const emit = defineEmits<{
  close: []
  next: []
}>()

const county = computed(() => countyByFips(props.holding.fips)?.name ?? '')
const place = computed(() => [heldTown(props.holding.town)?.name, county.value && `${county.value} County`].filter(Boolean).join(', '))
const span = computed(() => (props.holding.start ? `${props.holding.start} – ${props.holding.end}` : `Conferred ${props.holding.end}`))
const kicker = computed(() => {
  const kind = props.holding.kind === 'schooling' ? 'A record of study' : 'A record of service'
  return props.total > 1 ? `${kind} · ${props.index + 1} of ${props.total}` : kind
})
const unwritten = computed(() => props.holding.kind === 'post' && !props.holding.duties.length && !props.holding.projects.length)
</script>

<template>
  <RealmEvent
    :kicker="kicker"
    :title="holding.title"
    :plate-caption="county"
    :paint-plate="paintPlate"
    wide
    @close="emit('close')"
  >
    <div class="record-head">
      <RealmHeraldicShield class="record-arms" :seed="holding.institution" />
      <div>
        <a :href="holding.url" class="record-institution" target="_blank" rel="noopener noreferrer">{{ holding.institution }}</a>
        <p class="record-muted">{{ place }} · {{ span }}</p>
        <p v-if="holding.detail" class="record-muted">{{ holding.detail }}</p>
      </div>
    </div>

    <template v-if="holding.duties.length || holding.projects.length">
      <h3 class="record-rule"><span>Deeds</span></h3>
      <ul v-if="holding.duties.length" class="record-deeds">
        <li v-for="duty in holding.duties" :key="duty">{{ duty }}</li>
      </ul>
      <section v-for="project in holding.projects" :key="project.name" class="record-project">
        <h4 class="record-project-name">{{ project.name }}</h4>
        <ul class="record-deeds">
          <li v-for="duty in project.duties" :key="duty">{{ duty }}</li>
        </ul>
      </section>
    </template>
    <p v-else-if="unwritten" class="record-unwritten">This chapter is still being written.</p>

    <template v-if="holding.skills.length">
      <h3 class="record-rule"><span>Tools of the Trade</span></h3>
      <ul class="record-tools">
        <li v-for="skill in holding.skills" :key="skill">{{ skill }}</li>
      </ul>
    </template>

    <template #options>
      <button v-if="total > 1" type="button" class="realm-event-option realm-event-option-primary" @click="emit('next')">
        Turn to the next record
      </button>
      <button type="button" class="realm-event-option" @click="emit('close')">
        Return to the map
      </button>
    </template>
  </RealmEvent>
</template>

<style scoped>
.record-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin: 8px 0 4px;
}

.record-arms {
  width: 34px;
  flex-shrink: 0;
  margin-top: 2px;
}

.record-institution {
  font-size: 19px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--ink);
  text-decoration: none;
  border-bottom: 1px solid var(--gold-dim);
}

.record-institution:hover,
.record-institution:focus-visible {
  color: var(--gold);
  border-bottom-color: var(--gold);
  outline: none;
}

.record-muted {
  line-height: 1.35;
  color: var(--ink-muted);
}

.record-rule {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 16px 0 10px;
  font-family: Cinzel, Georgia, serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-muted);
}

.record-rule::before,
.record-rule::after {
  content: "";
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold-dim), transparent);
}

.record-project + .record-project,
.record-deeds + .record-project {
  margin-top: 14px;
}

.record-project-name {
  margin-bottom: 6px;
  font-family: Cinzel, Georgia, serif;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.3;
  color: var(--gold);
}

.record-deeds {
  display: grid;
  gap: 8px;
  font-size: 17px;
  line-height: 1.42;
}

/* A small lozenge for each deed, as a scribe might mark them. */
.record-deeds li {
  position: relative;
  padding-left: 18px;
}

.record-deeds li::before {
  content: "";
  position: absolute;
  top: 0.55em;
  left: 3px;
  width: 6px;
  height: 6px;
  rotate: 45deg;
  background: var(--gold-dim);
}

.record-unwritten {
  margin-top: 14px;
  font-size: 18px;
  font-style: italic;
  color: var(--ink-muted);
}

.record-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.record-tools li {
  padding: 1px 9px 2px;
  border: 1px solid #5a4a2e;
  border-radius: 3px;
  background: rgb(0 0 0 / 0.2);
  font-size: 15px;
  color: var(--ink);
}
</style>
