<script setup lang="ts">
// Mitchell's "MP" monogram, in the portrait's frame on the banner and the sheet.
// Mitchell doesn't want his face on the site, so this stands where a portrait would.

const id = useId()
</script>

<template>
  <svg viewBox="0 0 100 120" class="monogram" aria-hidden="true">
    <defs>
      <radialGradient :id="`${id}-field`" cx="0.5" cy="0.4" r="0.75">
        <stop offset="0" stop-color="#3a3226" />
        <stop offset="1" stop-color="#15120d" />
      </radialGradient>
      <linearGradient :id="`${id}-gilt`" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f0d696" />
        <stop offset="0.55" stop-color="#d9b56b" />
        <stop offset="1" stop-color="#a5843f" />
      </linearGradient>
    </defs>
    <rect width="100" height="120" :fill="`url(#${id}-field)`" />
    <rect x="7" y="7" width="86" height="106" fill="none" stroke="#8a6f3e" stroke-width="1" />
    <rect x="10" y="10" width="80" height="100" fill="none" stroke="#8a6f3e" stroke-width="0.5" stroke-opacity="0.6" />
    <path d="M30,38 H70 M30,84 H70" stroke="#8a6f3e" stroke-width="0.8" />
    <path d="M50,34.5 L53.5,38 L50,41.5 L46.5,38 Z M50,80.5 L53.5,84 L50,87.5 L46.5,84 Z" fill="#d9b56b" />
    <text
      x="50"
      y="72"
      text-anchor="middle"
      font-family="Cinzel, Georgia, serif"
      font-weight="700"
      font-size="34"
      letter-spacing="1"
      :fill="`url(#${id}-gilt)`"
      stroke="#1a1610"
      stroke-width="0.6"
      paint-order="stroke"
    >MP</text>
  </svg>
</template>

<style scoped>
.monogram {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
