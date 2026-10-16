<script setup lang="ts">
import type { Dispatch } from '~/utils/realm/dispatches'

// The blog's index: the letter case, open over the map.

defineProps<{
  dispatches: Dispatch[]
  read: Set<string>
}>()

useSiteSeo('Blog — Mitchell Ponchione', '/blog')

const letters = useLetterRoutes()
</script>

<template>
  <RealmLetterCase :dispatches="dispatches" :read="read" @open="letters.open" @close="letters.close" />
</template>
