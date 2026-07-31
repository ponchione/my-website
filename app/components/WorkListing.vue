<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import type { WorkExperience } from '~/types'

const props = withDefaults(defineProps<{
  job: WorkExperience
  initialExpanded?: boolean
}>(), {
  initialExpanded: false,
})

const isExpanded = ref(props.initialExpanded)

function toggleExpanded() {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <article class="ui-card gap-0 overflow-hidden border-t-2 border-t-foreground/5 py-0">
    <div class="ui-card-header grid-cols-[1fr_auto] px-6 py-6">
      <h2 class="ui-card-title hover:underline">
        <a
          :href="job.url"
          target="_blank"
          rel="noopener noreferrer"
        >{{ job.company }}</a>
      </h2>
      <p class="ui-card-description col-start-1">{{ job.title }}</p>
      <p class="ui-card-description col-start-1">
        {{ job.startDate }} - {{ job.endDate }} &middot; {{ job.location }}
      </p>
      <button
        type="button"
        :aria-expanded="isExpanded"
        :aria-controls="`work-details-${job.id}`"
        :aria-label="`${isExpanded ? 'Collapse' : 'Expand'} work details for ${job.company}`"
        class="ui-button ui-button-ghost ui-button-icon col-start-2 row-span-3 row-start-1 self-start justify-self-end text-muted-foreground motion-reduce:transition-none"
        @click="toggleExpanded"
      >
        <ChevronDown
          class="motion-transform h-4 w-4 motion-safe:transition-transform motion-safe:duration-200"
          :class="{ 'rotate-180': isExpanded }"
          aria-hidden="true"
        />
      </button>
    </div>

    <Transition name="work-expand">
      <div v-if="isExpanded" :id="`work-details-${job.id}`" class="overflow-hidden">
        <div class="space-y-4 px-6 pb-6">
          <ul class="list-disc space-y-1 pl-4">
            <li v-for="point in job.responsibilities ?? []" :key="point">{{ point }}</li>
          </ul>

          <div v-if="job.projects?.length" class="space-y-4">
            <section v-for="project in job.projects" :key="project.id">
              <h3 class="font-semibold text-primary/90">{{ project.project }}</h3>
              <ul class="mt-1 list-disc space-y-1 pl-4">
                <li v-for="responsibility in project.responsibilities" :key="responsibility">
                  {{ responsibility }}
                </li>
              </ul>
            </section>
          </div>

          <div class="mt-4">
            <h3 class="mb-2 text-sm font-semibold text-primary/70">Technologies Used:</h3>
            <div class="flex flex-wrap gap-2">
              <UiBadge v-for="skill in job.skills" :key="skill" variant="secondary">{{ skill }}</UiBadge>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </article>
</template>

<style scoped>
.work-expand-enter-active,
.work-expand-leave-active {
  max-height: 3000px;
  transition: max-height 200ms ease-in-out, opacity 200ms ease-in-out;
}

.work-expand-enter-from,
.work-expand-leave-to {
  max-height: 0;
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .work-expand-enter-active,
  .work-expand-leave-active {
    transition-duration: 0s;
  }
}
</style>
