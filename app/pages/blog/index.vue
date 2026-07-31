<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import { formatPostDate } from '~/utils/posts'

useSiteSeo('Blog — Mitchell Ponchione', '/blog')

const { data } = await useAsyncData('blog-posts', () => queryCollection('blog')
  .select('path', 'title', 'date', 'tags', 'readingTime')
  .order('date', 'DESC')
  .all())
const posts = computed(() => data.value ?? [])
</script>

<template>
  <div class="mt-6">
    <header class="mb-8 space-y-2">
      <h1 class="text-3xl font-bold tracking-[-0.025em]">Blog</h1>
      <p class="text-muted-foreground">I don't expect anyone to ever read these.</p>
    </header>
    <div class="divide-y divide-border">
      <NuxtLink
        v-for="post in posts"
        :key="post.path"
        :to="post.path"
        class="group block"
      >
        <article class="flex items-start justify-between gap-4 py-4 motion-safe:transition-colors motion-safe:duration-150">
          <div class="min-w-0 space-y-1">
            <h2 class="font-semibold leading-snug group-hover:underline">{{ post.title }}</h2>
            <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span>{{ formatPostDate(post.date) }}</span>
              <span>&middot;</span>
              <span>{{ post.readingTime }}</span>
            </div>
            <div class="flex flex-wrap gap-1.5 pt-1">
              <UiBadge v-for="tag in post.tags" :key="tag" variant="secondary">{{ tag }}</UiBadge>
            </div>
          </div>
          <ArrowRight class="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground motion-safe:transition-all motion-safe:duration-200 group-hover:translate-x-1 group-hover:text-foreground" aria-hidden="true" />
        </article>
      </NuxtLink>
    </div>
  </div>
</template>
