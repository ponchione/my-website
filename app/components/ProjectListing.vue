<script setup lang="ts">
import type { PersonalProject } from '~/types'
import { formatGitHubTimestamp } from '~/utils/github-projects'

defineProps<{
  project: PersonalProject
}>()

const statusClasses: Record<PersonalProject['status'], string> = {
  'In Progress': 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  'Planned': 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20',
  'Complete': 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20',
  'V1': 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/20',
  'Deprecated': '',
}
</script>

<template>
  <article class="ui-card border-t-2 border-t-foreground/5 motion-safe:transition-all motion-safe:duration-200 hover:border-foreground/10 hover:shadow-sm">
    <header class="ui-card-header">
      <h2 class="ui-card-title flex items-center gap-2">
        <a
          :href="project.github_url"
          target="_blank"
          rel="noopener noreferrer"
          class="hover:underline"
        >{{ project.name }}</a>
        <UiBadge
          :variant="project.status === 'Deprecated' ? 'default' : 'status'"
          :class="statusClasses[project.status]"
        >{{ project.status }}</UiBadge>
      </h2>
      <p class="ui-card-description">{{ project.description }}</p>
    </header>

    <div class="px-6">
      <p class="mb-4 text-sm text-muted-foreground">
        Last pushed: <time :datetime="project.last_pushed_at">{{ formatGitHubTimestamp(project.last_pushed_at) }}</time>
      </p>
      <div class="flex flex-wrap gap-2">
        <UiBadge v-for="tag in project.tags" :key="tag" variant="secondary">{{ tag }}</UiBadge>
      </div>
      <div class="mt-4">
        <a
          :href="project.github_url"
          target="_blank"
          rel="noopener noreferrer"
          class="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >github.com/{{ project.github_url.replace('https://github.com/', '') }}</a>
      </div>
    </div>
  </article>
</template>
