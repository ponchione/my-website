<script setup lang="ts">
import { formatDispatchDate, type Dispatch } from '~/utils/realm/dispatches'

// A blog post, arriving as a sealed letter.

defineProps<{
  dispatch: Dispatch
  // Position in the queue, for "1 of 3".
  index: number
  total: number
  paintPlate: (canvas: HTMLCanvasElement) => void
}>()

const emit = defineEmits<{
  close: []
  next: []
  // Read the letter: its seal has finished breaking.
  open: [path: string]
}>()

const primary = useTemplateRef<HTMLElement>('primary')
const { breaking, breakSeal } = useSealBreak(path => emit('open', path))

onMounted(() => primary.value?.focus())
</script>

<template>
  <RealmEvent
    :kicker="total > 1 ? `A dispatch arrives · ${index + 1} of ${total}` : 'A dispatch arrives'"
    :title="dispatch.title"
    plate-caption="Pennsylvania"
    :paint-plate="paintPlate"
    described-by="realm-dispatch-flavor"
    @close="emit('close')"
  >
    <template #plate>
      <RealmSeal class="dispatch-seal" :broken="breaking === dispatch.path" />
    </template>
    <p class="dispatch-meta">
      {{ formatDispatchDate(dispatch.date) }} · {{ dispatch.readingTime }}<template v-if="dispatch.tags.length"> · {{ dispatch.tags.join(', ') }}</template>
    </p>
    <div id="realm-dispatch-flavor" class="dispatch-flavor">
      <p>A courier arrives bearing a sealed letter in a familiar hand.</p>
      <blockquote>“{{ dispatch.summary }}”</blockquote>
    </div>
    <template #options>
      <a ref="primary" :href="dispatch.path" class="realm-event-option realm-event-option-primary" @click="breakSeal($event, dispatch.path)">
        Break the seal and read it
      </a>
      <button v-if="total > 1" type="button" class="realm-event-option" @click="emit('next')">
        Open the next letter
      </button>
      <NuxtLink to="/blog" class="realm-event-option">
        Look through the letter case
      </NuxtLink>
      <button type="button" class="realm-event-option" @click="emit('close')">
        Leave them for later
      </button>
    </template>
  </RealmEvent>
</template>

<style scoped>
/* Pressed into the plate's corner. */
.dispatch-seal {
  position: absolute;
  right: 12px;
  bottom: 10px;
  z-index: 1;
  width: 64px;
}

.dispatch-meta {
  margin-top: 4px;
  font-size: 15px;
  color: var(--ink-muted);
}

.dispatch-flavor {
  display: grid;
  gap: 10px;
  margin-top: 14px;
  font-size: 18px;
  line-height: 1.45;
}

.dispatch-flavor p {
  font-style: italic;
  color: var(--ink-muted);
}

.dispatch-flavor blockquote {
  padding-left: 14px;
  border-left: 2px solid var(--gold-dim);
  color: var(--ink);
}

@media (max-width: 640px) {
  .dispatch-seal {
    width: 50px;
  }
}
</style>
