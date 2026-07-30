<template>
  <nav class="flex h-full w-50 flex-col justify-between" aria-label="Primary navigation">
    <div class="flex flex-col gap-4">
      <NuxtLink to="/" class="group" aria-label="Mitchell Ponchione, home">
        <div class="flex items-center gap-3 rounded-md p-2 transition-colors">
          <IconsInitialsIcon />
        </div>
      </NuxtLink>
      <div class="flex flex-col px-2">
        <p class="text-lg font-bold tracking-tight text-primary">Mitchell Ponchione</p>
        <p class="text-sm text-muted-foreground">Software Engineer · AI Systems</p>
      </div>
      <LayoutNavLinks />
    </div>
    <div class="flex flex-col gap-3">
      <UiSeparator />
      <div class="flex items-center justify-between px-2">
        <LayoutSocialLinks />
        <LayoutThemeToggle />
      </div>
      <LayoutSiteCopyright />
    </div>
  </nav>
</template>
