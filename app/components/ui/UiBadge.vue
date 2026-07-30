<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'default' | 'secondary' | 'status'
}>(), {
  variant: 'default',
})
</script>

<template>
  <span
    class="inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium transition-[color,box-shadow]"
    :class="variant === 'secondary'
      ? 'border-transparent bg-secondary text-secondary-foreground'
      : variant === 'status'
        ? ''
        : 'border-transparent bg-primary text-primary-foreground'"
  >
    <slot />
  </span>
</template>
