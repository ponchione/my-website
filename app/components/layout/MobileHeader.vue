<script setup lang="ts">
import { Menu } from '@lucide/vue'

const open = ref(false)
const route = useRoute()
let desktopQuery: MediaQueryList | undefined

function closeOnDesktop(event: MediaQueryListEvent | MediaQueryList) {
  if (event.matches) open.value = false
}

watch(() => route.path, () => {
  open.value = false
})

onMounted(() => {
  desktopQuery = window.matchMedia('(min-width: 768px)')
  closeOnDesktop(desktopQuery)
  desktopQuery.addEventListener('change', closeOnDesktop)
})

onBeforeUnmount(() => desktopQuery?.removeEventListener('change', closeOnDesktop))
</script>

<template>
  <header class="sticky top-0 z-40 flex items-center justify-between border-b bg-background px-4 py-3 md:hidden">
    <NuxtLink to="/" class="flex items-center gap-3" aria-label="Mitchell Ponchione, home">
      <IconsInitialsIcon />
      <span class="text-lg font-bold tracking-tight text-primary">Mitchell Ponchione</span>
    </NuxtLink>
    <UiSheet v-model:open="open" title="Navigation">
      <template #trigger>
        <button type="button" class="ui-button ui-button-ghost ui-button-icon" aria-label="Open menu">
          <Menu class="h-6 w-6" aria-hidden="true" />
        </button>
      </template>
      <nav class="flex-1 px-4" aria-label="Mobile navigation">
        <LayoutNavLinks @navigate="open = false" />
      </nav>
      <footer class="mt-auto flex flex-col gap-2 p-4">
        <UiSeparator />
        <div class="flex items-center justify-between px-2">
          <LayoutSocialLinks />
          <LayoutThemeToggle />
        </div>
        <LayoutSiteCopyright />
      </footer>
    </UiSheet>
  </header>
</template>
