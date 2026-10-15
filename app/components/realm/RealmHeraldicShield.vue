<script setup lang="ts">
import type { Arms, Charge, Ordinary, Tincture } from '~/data/character'

// A coat of arms: either given outright, or generated from a name so every institution
// gets stable arms of its own. Generated arms follow the rule of tincture (metal on
// colour, colour on metal) so they read like real heraldry.

const props = defineProps<{
  arms?: Arms
  seed?: string
}>()

const TINCTURES: Record<Tincture, string> = {
  or: '#d4a73a',
  argent: '#e6e1d3',
  gules: '#a3342c',
  azure: '#2f5aa0',
  vert: '#3d7a3c',
  purpure: '#6b3f7f',
  sable: '#24211e',
}
const METALS: Tincture[] = ['or', 'argent']
const COLOURS: Tincture[] = ['gules', 'azure', 'vert', 'purpure', 'sable']
const ORDINARIES: Ordinary[] = ['fess', 'pale', 'bend', 'chevron', 'cross', 'saltire', 'chief']
const CHARGES: (Charge | undefined)[] = ['mullet', 'roundel', 'lozenge', undefined, undefined]

function generate(seed: string): Arms {
  let state = [...seed].reduce((hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619), 2166136261) >>> 0
  const pick = <T,>(items: T[]) => {
    state = Math.imul(state ^ (state >>> 15), 2246822519) >>> 0
    state = (state ^ (state >>> 13)) >>> 0
    return items[state % items.length]!
  }
  const metalField = pick([true, false])
  const field = pick(metalField ? METALS : COLOURS)
  const ordinary = pick(ORDINARIES)
  const charge = pick(CHARGES)
  // The charge sits on the field, so it takes the field's opposite.
  const contrast = () => pick(metalField ? COLOURS : METALS)
  return {
    field,
    ordinary: { kind: ordinary, tincture: contrast() },
    charge: charge && ordinary !== 'cross' && ordinary !== 'saltire' ? { kind: charge, tincture: contrast() } : undefined,
  }
}

const shown = computed(() => props.arms ?? generate(props.seed ?? ''))
const id = useId()

const SHIELD = 'M6,6 H94 V54 C94,88 72,106 50,116 C28,106 6,88 6,54 Z'
</script>

<template>
  <svg viewBox="0 0 100 122" class="heraldic-shield" aria-hidden="true">
    <defs>
      <clipPath :id="`${id}-shield`">
        <path :d="SHIELD" />
      </clipPath>
      <linearGradient :id="`${id}-sheen`" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity="0.22" />
        <stop offset="0.55" stop-color="#fff" stop-opacity="0" />
        <stop offset="1" stop-color="#000" stop-opacity="0.28" />
      </linearGradient>
    </defs>
    <g :clip-path="`url(#${id}-shield)`">
      <rect width="100" height="122" :fill="TINCTURES[shown.field]" />
      <g v-if="shown.ordinary" :fill="TINCTURES[shown.ordinary.tincture]">
        <rect v-if="shown.ordinary.kind === 'fess'" x="0" y="44" width="100" height="26" />
        <rect v-else-if="shown.ordinary.kind === 'pale'" x="37" y="0" width="26" height="122" />
        <rect v-else-if="shown.ordinary.kind === 'chief'" x="0" y="0" width="100" height="34" />
        <rect v-else-if="shown.ordinary.kind === 'bend'" x="-30" y="48" width="170" height="22" transform="rotate(42 50 58)" />
        <path v-else-if="shown.ordinary.kind === 'chevron'" d="M0,96 L50,48 L100,96 L100,74 L50,26 L0,74 Z" />
        <g v-else-if="shown.ordinary.kind === 'cross'">
          <rect x="40" y="0" width="20" height="122" />
          <rect x="0" y="46" width="100" height="20" />
        </g>
        <g v-else-if="shown.ordinary.kind === 'saltire'">
          <rect x="-30" y="48" width="170" height="18" transform="rotate(48 50 57)" />
          <rect x="-30" y="48" width="170" height="18" transform="rotate(-48 50 57)" />
        </g>
        <path v-else-if="shown.ordinary.kind === 'bordure'" :d="SHIELD" fill="none" :stroke="TINCTURES[shown.ordinary.tincture]" stroke-width="12" />
      </g>
      <g v-if="shown.charge" :fill="TINCTURES[shown.charge.tincture]" stroke="rgb(0 0 0 / 0.35)" stroke-width="1.2">
        <path v-if="shown.charge.kind === 'keystone'" d="M26,30 Q50,22 74,30 L62,86 L38,86 Z" />
        <path v-else-if="shown.charge.kind === 'mullet'" d="M50,36 L56,52 L73,52 L59,62 L64,79 L50,69 L36,79 L41,62 L27,52 L44,52 Z" />
        <circle v-else-if="shown.charge.kind === 'roundel'" cx="50" cy="58" r="15" />
        <path v-else-if="shown.charge.kind === 'lozenge'" d="M50,38 L64,58 L50,78 L36,58 Z" />
      </g>
      <rect width="100" height="122" :fill="`url(#${id}-sheen)`" />
    </g>
    <path :d="SHIELD" fill="none" stroke="#b8955a" stroke-width="3" />
    <path :d="SHIELD" fill="none" stroke="rgb(0 0 0 / 0.5)" stroke-width="1" />
  </svg>
</template>

<style scoped>
.heraldic-shield {
  display: block;
  filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.5));
}
</style>
