<script setup lang="ts">
import { ArrowLeft, ArrowRight } from '@lucide/vue'
import { formatPostDate, getPostNeighbors, getPostSlug, getReadingTime, sortPostsNewestFirst } from '~/utils/posts'

const route = useRoute()
const slug = String(route.params.slug)
const { data } = await useAsyncData(`blog-post-${slug}`, () => queryCollection('blog').all())
const posts = sortPostsNewestFirst(data.value ?? [])
const post = posts.find(entry => getPostSlug(entry) === slug)

if (!post) {
  throw createError({ statusCode: 404, statusMessage: 'Post not found' })
}

const neighbors = getPostNeighbors(posts, slug)
useSiteSeo(`${post.title} — Mitchell Ponchione`, route.path, post.excerpt)
</script>

<template>
  <article class="mt-6 space-y-6">
    <NuxtLink to="/blog" class="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
      <ArrowLeft class="h-4 w-4" aria-hidden="true" />
      Back to Blog
    </NuxtLink>

    <header class="space-y-3">
      <h1 class="text-3xl font-bold tracking-[-0.025em]">{{ post.title }}</h1>
      <p class="text-muted-foreground">{{ formatPostDate(post.date) }} &middot; {{ getReadingTime(post.body) }}</p>
      <div class="flex flex-wrap gap-2">
        <UiBadge v-for="tag in post.tags" :key="tag" variant="secondary">{{ tag }}</UiBadge>
      </div>
    </header>

    <ContentRenderer :value="post" class="post-content" />

    <div class="space-y-6">
      <UiSeparator />
      <nav class="flex justify-between gap-6" aria-label="Blog post pagination">
        <div class="min-w-0 flex-1">
          <div v-if="neighbors.previous" class="space-y-1">
            <span class="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <ArrowLeft class="h-4 w-4" aria-hidden="true" />
              Previous Post
            </span>
            <NuxtLink
              :to="`/blog/${getPostSlug(neighbors.previous)}`"
              class="block text-sm text-muted-foreground transition-colors hover:text-foreground"
            >{{ neighbors.previous.title }}</NuxtLink>
          </div>
        </div>
        <div class="min-w-0 flex-1 text-right">
          <div v-if="neighbors.next" class="space-y-1">
            <span class="inline-flex items-center gap-1 text-sm text-muted-foreground">
              Next Post
              <ArrowRight class="h-4 w-4" aria-hidden="true" />
            </span>
            <NuxtLink
              :to="`/blog/${getPostSlug(neighbors.next)}`"
              class="block text-sm text-muted-foreground transition-colors hover:text-foreground"
            >{{ neighbors.next.title }}</NuxtLink>
          </div>
        </div>
      </nav>
    </div>
  </article>
</template>
