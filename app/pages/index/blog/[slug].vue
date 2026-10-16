<script setup lang="ts">
import { nextSealed, type Dispatch } from '~/utils/realm/dispatches'

// A blog post, opened as a letter over the map. It's served at the post's own path, so
// a shared link lands in the realm with the letter already open and its text in the page.

const props = defineProps<{
  dispatches: Dispatch[]
  read: Set<string>
}>()

const route = useRoute()
const { data } = await useAsyncData(`realm-letter-${route.params.slug}`, () => queryCollection('blog').path(route.path).first())

if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Post not found' })
}

const post = data.value
useSiteSeo(`${post.title} — Mitchell Ponchione`, route.path, post.summary)

const letters = useLetterRoutes()
const next = computed(() => nextSealed(props.dispatches, props.read, post.path))
</script>

<template>
  <RealmLetter
    :post="post"
    :next="next"
    :from-case="letters.cameFrom.value === '/blog'"
    @next="letters.swap"
    @case="letters.swap('/blog')"
    @close="letters.close"
  />
</template>
