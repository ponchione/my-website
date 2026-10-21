<script setup lang="ts">
import type { ArmyBanner } from '~/utils/realm/stage'

// A raised army on the map: its house's banner on a pole planted at the spot, with the
// house's arms and a plate giving its men. It imports nothing of the game's, since the
// map page holds the slot it's drawn in.

defineProps<{ banner: ArmyBanner }>()

// "2.4k" men, or "800".
const formatMen = (men: number) => (men < 1000 ? `${men}` : `${(Math.floor(men / 100) / 10).toFixed(1)}k`)
</script>

<template>
  <div class="army" :style="{ '--house': banner.color }" aria-hidden="true">
    <div class="army-cloth">
      <RealmHeraldicShield class="army-arms" :seed="banner.house" />
    </div>
    <span class="army-plate">{{ formatMen(banner.men) }}</span>
    <span class="army-pole" />
  </div>
</template>

<style scoped>
/* The slot's origin is the county's spot; the banner stands on it. */
.army {
  position: absolute;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translateX(-50%) scale(var(--marker-scale, 1));
  transform-origin: 50% 100%;
  filter: drop-shadow(0 3px 4px rgb(0 0 0 / 0.6));
}

.army-cloth {
  display: grid;
  place-items: center;
  width: 30px;
  height: 36px;
  padding-bottom: 6px;
  border: 1px solid #d9b56b;
  border-bottom: 0;
  background: var(--house);
  clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%);
}

.army-arms {
  width: 18px;
}

.army-plate {
  margin-top: -4px;
  padding: 0 5px;
  border: 1px solid #8a6f3e;
  border-radius: 2px;
  background: #1d1912;
  font-family: Cinzel, Georgia, serif;
  font-size: 11px;
  font-weight: 700;
  line-height: 15px;
  color: #e9dfc7;
}

.army-pole {
  width: 2px;
  height: 12px;
  background: #3a2f1e;
}
</style>
