<script setup lang="ts">
import projectsData from '~/data/projects.json'
import type { PersonalProject } from '~/types'

useSiteSeo('Projects — Mitchell Ponchione', '/projects')

const projects = projectsData as PersonalProject[]
</script>

<template>
  <div class="mt-6">
    <header class="mb-8 space-y-2">
      <h1 class="text-3xl font-bold tracking-[-0.025em]">Projects</h1>
      <p class="text-muted-foreground">
        A collection of personal and side projects I'm currently working on or have planned.
      </p>
    </header>
    <div class="space-y-4">
      <ProjectListing v-for="project in projects" :key="project.id" :project="project" />
    </div>
  </div>
</template>
