<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'

useHead({ title: 'Not Found — Mitchell Ponchione' })
useSeoMeta({ robots: 'noindex, follow' })
</script>

<template>
  <div class="mt-16 space-y-6">
    <h1 class="text-4xl font-bold tracking-tight">404</h1>
    <p class="text-lg text-muted-foreground">
      This page doesn't exist — but the rest of the site does.
    </p>
    <NuxtLink
      to="/"
      class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground motion-safe:transition-colors motion-safe:duration-150"
    >
      <ArrowLeft class="h-4 w-4" aria-hidden="true" />
      Back home
    </NuxtLink>
  </div>
</template>
