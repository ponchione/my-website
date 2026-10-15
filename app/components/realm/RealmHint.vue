<script setup lang="ts">
// Wraps something small (an icon, a number) and explains it on hover or focus.
defineProps<{
  title: string
  text?: string
}>()
</script>

<template>
  <span class="realm-hint" tabindex="0">
    <slot />
    <span class="realm-hint-tip" role="tooltip">
      <strong>{{ title }}</strong>
      <span v-if="text">{{ text }}</span>
    </span>
  </span>
</template>

<style scoped>
.realm-hint {
  position: relative;
  display: inline-flex;
  outline: none;
}

.realm-hint-tip {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  z-index: 30;
  display: grid;
  gap: 2px;
  width: max-content;
  max-width: 220px;
  padding: 7px 10px;
  translate: -50% 0;
  border: 1px solid var(--panel-edge);
  border-radius: 3px;
  background: var(--panel);
  box-shadow: 0 8px 20px rgb(0 0 0 / 0.5);
  font-family: "EB Garamond", Georgia, serif;
  font-size: 15px;
  font-weight: 400;
  letter-spacing: normal;
  line-height: 1.3;
  text-align: left;
  text-transform: none;
  color: var(--ink-muted);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 120ms ease;
}

.realm-hint-tip strong {
  font-family: Cinzel, Georgia, serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--gold);
}

.realm-hint:hover .realm-hint-tip,
.realm-hint:focus-visible .realm-hint-tip {
  opacity: 1;
  visibility: visible;
}

.realm-hint:focus-visible {
  outline: 1px solid var(--gold);
  outline-offset: 2px;
  border-radius: 2px;
}
</style>
