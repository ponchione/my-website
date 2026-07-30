<script setup lang="ts">
import { X } from '@lucide/vue'
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from 'reka-ui'

defineProps<{
  open: boolean
  title: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()
</script>

<template>
  <DialogRoot :open="open" @update:open="emit('update:open', $event)">
    <DialogTrigger as-child>
      <slot name="trigger" />
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="sheet-overlay fixed inset-0 z-50 bg-black/50" />
      <DialogContent class="sheet-content fixed inset-y-0 right-0 z-50 flex h-full w-3/4 flex-col gap-4 border-l bg-background shadow-lg sm:max-w-sm">
        <div class="flex flex-col gap-1.5 p-4">
          <DialogTitle class="font-semibold text-foreground">
            {{ title }}
          </DialogTitle>
        </div>
        <slot />
        <DialogClose as-child>
          <button
            type="button"
            class="absolute right-4 top-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            aria-label="Close menu"
          >
            <X class="size-4" aria-hidden="true" />
          </button>
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.sheet-overlay[data-state="open"] { animation: overlay-in 200ms ease-out; }
.sheet-overlay[data-state="closed"] { animation: overlay-out 200ms ease-in; }
.sheet-content[data-state="open"] { animation: sheet-in 500ms ease-in-out; }
.sheet-content[data-state="closed"] { animation: sheet-out 300ms ease-in-out; }

@keyframes overlay-in { from { opacity: 0; } }
@keyframes overlay-out { to { opacity: 0; } }
@keyframes sheet-in { from { transform: translateX(100%); } }
@keyframes sheet-out { to { transform: translateX(100%); } }

@media (prefers-reduced-motion: reduce) {
  .sheet-overlay,
  .sheet-content { animation-duration: 0s !important; }
}
</style>
