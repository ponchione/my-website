<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const title = computed(() => props.error.statusCode === 404
  ? 'Not Found — Mitchell Ponchione'
  : 'Something Went Wrong — Mitchell Ponchione')

useHead({
  title,
})
useSeoMeta({ robots: 'noindex, follow' })
</script>

<template>
  <NuxtLayout>
    <div class="mt-16 space-y-6">
      <h1 class="text-4xl font-bold tracking-tight">{{ error.statusCode === 404 ? '404' : error.statusCode }}</h1>
      <p class="text-lg text-muted-foreground">
        {{ error.statusCode === 404 ? "This page doesn't exist — but the rest of the site does." : 'Something went wrong.' }}
      </p>
      <a
        href="/"
        class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground motion-safe:transition-colors motion-safe:duration-150"
        @click.prevent="clearError({ redirect: '/' })"
      >
        <ArrowLeft class="h-4 w-4" aria-hidden="true" />
        Back home
      </a>
    </div>
  </NuxtLayout>
</template>
