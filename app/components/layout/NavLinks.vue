<script setup lang="ts">
const emit = defineEmits<{
  navigate: []
}>()

const route = useRoute()
const links = [
  { label: 'About', to: '/' },
  { label: 'Work History', to: '/work-history' },
  { label: 'Projects', to: '/projects' },
  { label: 'Blog', to: '/blog' },
]

function isActive(path: string) {
  if (path === '/blog') return route.path === '/blog' || route.path.startsWith('/blog/')
  return route.path === path
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <NuxtLink
      v-for="link in links"
      :key="link.to"
      :to="link.to"
      class="ui-button ui-button-ghost w-full justify-start motion-safe:transition-colors motion-safe:duration-150"
      :class="{ 'bg-accent text-accent-foreground dark:bg-accent/50': isActive(link.to) }"
      @click="emit('navigate')"
    >
      {{ link.label }}
    </NuxtLink>
  </div>
</template>
