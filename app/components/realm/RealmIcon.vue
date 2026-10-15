<script setup lang="ts">
import {
  Anvil, BookOpen, Braces, BrainCircuit, Castle, ChessKnight, Coins, Compass, Crosshair, Dumbbell,
  Eye, Footprints, Hammer, Handshake, Heart, Hourglass, Landmark, MapPin, ScrollText, Sigma, Swords,
  Telescope, VenetianMask,
} from '@lucide/vue'
import type { IconName } from '~/data/character'

defineProps<{ name: IconName }>()

const ICONS = {
  'anvil': Anvil,
  'book-open': BookOpen,
  'braces': Braces,
  'brain-circuit': BrainCircuit,
  'castle': Castle,
  'chess-knight': ChessKnight,
  'coins': Coins,
  'compass': Compass,
  'crosshair': Crosshair,
  'dumbbell': Dumbbell,
  'eye': Eye,
  'footprints': Footprints,
  'hammer': Hammer,
  'handshake': Handshake,
  'heart': Heart,
  'hourglass': Hourglass,
  'landmark': Landmark,
  'map-pin': MapPin,
  'scroll-text': ScrollText,
  'sigma': Sigma,
  'swords': Swords,
  'telescope': Telescope,
  'venetian-mask': VenetianMask,
} satisfies Record<IconName, unknown>
</script>

<template>
  <component :is="ICONS[name]" aria-hidden="true" />
</template>
