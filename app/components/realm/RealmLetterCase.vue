<script setup lang="ts">
import { formatDispatchDate, type Dispatch } from '~/utils/realm/dispatches'

// Every letter at once, newest first, each with its seal broken or not: the blog's index,
// kept in the realm.

const props = defineProps<{
  dispatches: Dispatch[]
  read: Set<string>
}>()

const emit = defineEmits<{
  close: []
  open: [path: string]
}>()

const letters = computed(() => [...props.dispatches].sort((a, b) => b.date.localeCompare(a.date)))
const sealed = computed(() => letters.value.filter(letter => !props.read.has(letter.path)).length)
const { breaking, breakSeal } = useSealBreak(path => emit('open', path))
</script>

<template>
  <RealmEvent kicker="The letter case" title="Dispatches" described-by="realm-case-flavor" wide @close="emit('close')">
    <p id="realm-case-flavor" class="case-flavor">
      <template v-if="sealed">{{ sealed === 1 ? 'One letter still bears its seal.' : `${sealed} letters still bear their seals.` }}</template>
      <template v-else>Every seal has been broken.</template>
    </p>
    <ul class="case-letters">
      <li v-for="letter in letters" :key="letter.path">
        <a
          :href="letter.path"
          class="case-letter"
          @click="breakSeal($event, letter.path, !read.has(letter.path))"
        >
          <RealmSeal class="case-seal" :broken="read.has(letter.path) || breaking === letter.path" />
          <span class="case-letter-text">
            <span class="case-letter-title">{{ letter.title }}</span>
            <span class="case-muted">
              {{ formatDispatchDate(letter.date) }} · {{ letter.readingTime }}<span class="sr-only">{{ read.has(letter.path) ? ' · read' : ' · sealed' }}</span>
            </span>
            <span class="case-summary">“{{ letter.summary }}”</span>
          </span>
        </a>
      </li>
    </ul>
    <template #options>
      <button type="button" class="realm-event-option" @click="emit('close')">
        Return to the map
      </button>
    </template>
  </RealmEvent>
</template>

<style scoped>
.case-flavor {
  margin-top: 4px;
  font-size: 18px;
  font-style: italic;
  color: var(--ink-muted);
}

.case-letters {
  display: grid;
  gap: 8px;
  margin-top: 14px;
}

.case-letter {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 10px 12px;
  border: 1px solid #4e4129;
  border-radius: 3px;
  background: rgb(0 0 0 / 0.18);
  color: var(--ink);
  text-decoration: none;
  transition: border-color 150ms ease, background 150ms ease;
}

.case-letter:hover,
.case-letter:focus-visible {
  border-color: var(--gold);
  background: rgb(217 181 107 / 0.07);
  outline: none;
}

.case-seal {
  width: 40px;
  flex-shrink: 0;
  margin-top: 2px;
}

.case-letter-text {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.case-letter-title {
  font-family: Cinzel, Georgia, serif;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: 0.02em;
  color: var(--gold);
}

.case-muted {
  font-size: 15px;
  color: var(--ink-muted);
}

.case-summary {
  margin-top: 2px;
  font-style: italic;
  line-height: 1.35;
}

@media (prefers-reduced-motion: reduce) {
  .case-letter {
    transition: none;
  }
}
</style>
