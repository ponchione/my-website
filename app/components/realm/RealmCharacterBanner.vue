<script setup lang="ts">
import { Landmark, MapPin, ScrollText, Hourglass, Swords } from '@lucide/vue'
import { character } from '~/data/character'
import { careerHoldings, countiesHeld, currentPost } from '~/utils/realm/career'

// The always-visible corner of the character sheet: monogram, name, a few traits, and
// the counters. Clicking the monogram or name opens the full sheet.

defineProps<{
  dispatchCount: number
  unreadCount: number
}>()

const emit = defineEmits<{
  open: []
  dispatches: []
}>()

const traits = [...character.traits.temperament.slice(0, 2), ...character.traits.pursuits]
const yearsAtCraft = new Date().getFullYear() - character.counters.craftSince
</script>

<template>
  <header class="banner">
    <div class="banner-top">
      <button type="button" class="banner-portrait" @click="emit('open')">
        <span class="sr-only">Open the character sheet</span>
        <RealmMonogram />
        <RealmHeraldicShield class="banner-arms" :arms="character.house.arms" />
      </button>
      <div class="banner-body">
        <button type="button" class="banner-name" @click="emit('open')">
          <span class="banner-title">{{ character.name }}</span>
          <span v-if="currentPost" class="banner-subtitle">{{ currentPost.title }}</span>
        </button>
        <div class="banner-traits">
          <RealmHint v-for="trait in traits" :key="trait.name" :title="trait.name" :text="trait.description">
            <span class="banner-trait"><RealmIcon :name="trait.icon" class="size-4" /></span>
          </RealmHint>
        </div>
      </div>
    </div>
    <div class="banner-counters">
      <RealmHint title="Years at the craft" :text="`Building software since ${character.counters.craftSince}.`">
        <span class="banner-counter"><Hourglass class="size-4" aria-hidden="true" />{{ yearsAtCraft }}</span>
      </RealmHint>
      <RealmHint title="Titles held" text="Every post, past and present.">
        <span class="banner-counter"><Landmark class="size-4" aria-hidden="true" />{{ careerHoldings.length }}</span>
      </RealmHint>
      <RealmHint title="Counties held" text="Counties with a post or schooling in them.">
        <span class="banner-counter"><MapPin class="size-4" aria-hidden="true" />{{ countiesHeld }}</span>
      </RealmHint>
      <button type="button" class="banner-dispatches" :disabled="!dispatchCount" @click="emit('dispatches')">
        <ScrollText class="size-4" aria-hidden="true" />
        Dispatches
        <span v-if="unreadCount" class="banner-unread" :aria-label="`${unreadCount} unread`">{{ unreadCount }}</span>
      </button>
      <!-- Keystone, the game on this map. Not prefetched: the game's code loads only
           for someone who presses Play. -->
      <NuxtLink to="/play" :prefetch="false" class="banner-play">
        <Swords class="size-4" aria-hidden="true" />
        Play
      </NuxtLink>
    </div>
  </header>
</template>

<style scoped>
.banner {
  width: 380px;
  max-width: 100%;
  border: 1px solid var(--panel-edge);
  border-radius: 4px;
  background: var(--panel);
  box-shadow: inset 0 0 0 1px rgb(255 230 170 / 0.06), 0 10px 30px rgb(0 0 0 / 0.45);
}

.banner-top {
  display: flex;
  gap: 14px;
  padding: 12px 14px 10px 12px;
}

.banner-portrait {
  position: relative;
  flex-shrink: 0;
  width: 74px;
  height: 89px;
  padding: 0;
  border: 1px solid #8a6f3e;
  border-radius: 2px;
  box-shadow: 0 0 0 2px #1a1610, 0 0 0 3px rgb(184 149 90 / 0.55);
  cursor: pointer;
}

.banner-arms {
  position: absolute;
  right: -10px;
  bottom: -10px;
  width: 28px;
}

.banner-portrait:hover,
.banner-portrait:focus-visible {
  box-shadow: 0 0 0 2px #1a1610, 0 0 0 3px var(--gold);
  outline: none;
}

.banner-body {
  display: grid;
  align-content: start;
  gap: 8px;
  min-width: 0;
}

.banner-name {
  display: grid;
  text-align: left;
  cursor: pointer;
}

.banner-title {
  font-family: Cinzel, Georgia, serif;
  font-weight: 700;
  font-size: 18px;
  letter-spacing: 0.05em;
  line-height: 1.15;
  color: var(--gold);
}

.banner-subtitle {
  font-style: italic;
  color: var(--ink-muted);
  line-height: 1.25;
}

.banner-name:hover .banner-title,
.banner-name:focus-visible .banner-title {
  text-decoration: underline;
  text-decoration-color: var(--gold-dim);
  text-underline-offset: 3px;
}

.banner-name:focus-visible {
  outline: none;
}

.banner-traits {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.banner-trait {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: 1px solid #6e5a36;
  border-radius: 3px;
  background: radial-gradient(circle at 35% 30%, #3a3226, #1d1912 75%);
  color: #e2c98f;
}

.banner-counters {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 7px 14px;
  border-top: 1px solid rgb(184 149 90 / 0.25);
  background: rgb(0 0 0 / 0.18);
  font-family: Cinzel, Georgia, serif;
  font-size: 14px;
  font-weight: 600;
}

.banner-counter {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--ink);
}

.banner-counter svg {
  color: var(--gold);
}

.banner-dispatches {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink);
}

.banner-dispatches svg,
.banner-play svg {
  color: var(--gold);
}

.banner-dispatches:hover:not(:disabled),
.banner-dispatches:focus-visible,
.banner-play:hover,
.banner-play:focus-visible {
  color: var(--gold);
  outline: none;
}

.banner-play {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding-left: 14px;
  border-left: 1px solid rgb(184 149 90 / 0.25);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-decoration: none;
  text-transform: uppercase;
  color: var(--ink);
}

.banner-unread {
  display: inline-grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: #8a3a2a;
  box-shadow: 0 0 0 1px var(--gold);
  font-size: 11px;
  letter-spacing: 0;
  color: var(--ink);
}

@media (max-width: 640px) {
  .banner {
    width: 100%;
  }

  .banner-top {
    padding: 10px 12px 8px 10px;
  }

  .banner-portrait {
    width: 58px;
    height: 70px;
  }

  .banner-title {
    font-size: 16px;
  }

  .banner-counters {
    gap: 12px;
    padding: 6px 12px;
  }

  .banner-play {
    padding-left: 10px;
  }
}
</style>
