<script setup lang="ts">
import resumeData from '~/data/resume.json'
import type { Resume } from '~/types'

useSiteSeo('Work History — Mitchell Ponchione', '/work-history')

const { experience, education } = resumeData as Resume
</script>

<template>
  <div class="mt-6">
    <header class="mb-8 space-y-2">
      <h1 class="text-3xl font-bold tracking-[-0.025em]">Work History</h1>
    </header>

    <div class="space-y-4">
      <WorkListing
        v-for="(job, index) in experience"
        :key="job.id"
        :job="job"
        :initial-expanded="index === 0"
      />
    </div>

    <section class="space-y-3 pt-8">
      <h2 class="text-sm font-medium text-muted-foreground">Education</h2>
      <article class="ui-card border-t-2 border-t-foreground/5">
        <header class="ui-card-header">
          <h3 class="ui-card-title">
            <a :href="education.url" target="_blank" rel="noopener noreferrer" class="hover:underline">
              {{ education.school }}
            </a>
          </h3>
          <p class="ui-card-description">{{ education.level }} in {{ education.degree }}</p>
          <p class="ui-card-description">{{ education.year }}</p>
        </header>
      </article>
    </section>
  </div>
</template>
