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
}>()

const primary = useTemplateRef<{ $el: HTMLElement }>('primary')

onMounted(() => primary.value?.$el.focus())
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
    <p class="dispatch-meta">
      {{ formatDispatchDate(dispatch.date) }} · {{ dispatch.readingTime }}<template v-if="dispatch.tags.length"> · {{ dispatch.tags.join(', ') }}</template>
    </p>
    <div id="realm-dispatch-flavor" class="dispatch-flavor">
      <p>A courier arrives bearing a sealed letter in a familiar hand.</p>
      <blockquote>“{{ dispatch.summary }}”</blockquote>
    </div>
    <template #options>
      <NuxtLink ref="primary" :to="dispatch.path" class="realm-event-option realm-event-option-primary">
        Break the seal and read it
      </NuxtLink>
      <button v-if="total > 1" type="button" class="realm-event-option" @click="emit('next')">
        Open the next letter
      </button>
      <button type="button" class="realm-event-option" @click="emit('close')">
        Leave them for later
      </button>
    </template>
  </RealmEvent>
</template>

<style scoped>
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
</style>
