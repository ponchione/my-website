<script setup lang="ts">
function focusMainContent() {
  requestAnimationFrame(() => document.querySelector<HTMLElement>('#main-content')?.focus())
}
</script>

<template>
  <div class="contents">
    <a class="skip-link" href="#main-content" @click="focusMainContent">
      Skip to content
    </a>
    <div class="container mx-auto max-w-5xl">
      <LayoutMobileHeader />
      <div class="flex gap-12">
        <aside class="sticky top-0 hidden h-screen flex-shrink-0 py-16 md:flex sm:py-24">
          <LayoutSideNav />
        </aside>
        <div class="flex min-h-screen flex-1 flex-col px-4 py-8 md:px-0 md:py-16 lg:py-24">
          <main id="main-content" class="flex-1" tabindex="-1">
            <slot />
          </main>
        </div>
      </div>
      <LayoutMobileFooter />
    </div>
  </div>
</template>
