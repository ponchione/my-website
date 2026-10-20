<script setup lang="ts">
import { Pause, Play, Swords } from '@lucide/vue'
import { armyBanners, campaignPalette, chronicleLine, entryDate, houseColor } from '~/utils/keystone/display'
import { dateOf, found, holdings, newGame, rank, step, warOf, type GameState } from '~/utils/keystone/engine'
import { REALM_STAGE } from '~/utils/realm/stage'

// Keystone, played on the map: the résumé has stepped aside (the map page hides it at
// /play), the houses rise across Pennsylvania, and nine computer houses fight while you
// watch. Choosing a house of your own comes in a later phase (KEYSTONE_SPEC.md).

// The map page hands every child page its letters; the game has no use for them.
defineOptions({ inheritAttrs: false })

useSiteSeo('Keystone — Mitchell Ponchione', '/play', 'Keystone: nine medieval houses carve up Pennsylvania\'s 67 counties on the realm map.')

const stage = inject(REALM_STAGE)!
const router = useRouter()

// Milliseconds per month at each speed.
const SPEEDS = [2000, 1000, 500]
// How long the houses take to spread from their seats.
const RISE_MS = 1500
// Long enough for the résumé to step aside before the houses rise.
const SETTLE_MS = 600
const FEED_LINES = 5

const game = shallowRef<GameState | null>(null)
// The order the houses claimed their counties in, and how many of those claims show.
let claims: { house: number, county: number }[] = []
const risen = ref(0)
const rising = computed(() => !game.value || risen.value < claims.length)
const paused = ref(true)
const speed = ref(1)

let settle: ReturnType<typeof setTimeout> | undefined
let timer: ReturnType<typeof setTimeout> | undefined
let frame = 0

// A new world, with the houses spreading from their seats claim by claim, then paused.
function begin() {
  const seed = Math.floor(Math.random() * 2 ** 31)
  claims = found({ rng: seed }, null).claims
  game.value = newGame(seed, null)
  paused.value = true
  cancelAnimationFrame(frame)
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    risen.value = claims.length
    return
  }
  risen.value = 0
  const start = performance.now()
  const spread = (now: number) => {
    risen.value = Math.min(claims.length, Math.ceil(((now - start) / RISE_MS) * claims.length))
    if (risen.value < claims.length) frame = requestAnimationFrame(spread)
  }
  frame = requestAnimationFrame(spread)
}

// The months pass on their own unless paused; the campaign pauses itself when it ends.
function schedule() {
  clearTimeout(timer)
  if (paused.value || rising.value || game.value?.ending) return
  timer = setTimeout(() => {
    game.value = step(game.value!)
    if (game.value.ending) paused.value = true
    schedule()
  }, SPEEDS[speed.value])
}

watch([paused, speed, rising], schedule)


const houses = computed(() => {
  const s = game.value
  if (!s) return []
  return s.houses
    .map((h) => {
      const held = holdings(s, h.id).length
      const war = warOf(s, h.id)
      const enemy = war && s.houses[war.attacker === h.id ? war.defender : war.attacker]!.name
      return { id: h.id, name: h.name, held, rank: held ? rank(s, h.id) : null, enemy }
    })
    .sort((a, b) => b.held - a.held || a.id - b.id)
})

const feed = computed(() => {
  const s = game.value
  if (!s) return []
  return s.chronicle.slice(-FEED_LINES).reverse().map((entry, index) => ({
    key: s.chronicle.length - index,
    date: entryDate(entry),
    parts: chronicleLine(s, entry),
  }))
})

const ending = computed(() => {
  const end = game.value?.ending
  if (!end) return null
  return end.kind === 'united' ? `${game.value!.houses[end.house!]!.name} unites Pennsylvania` : 'The age of the houses ends'
})

function togglePause() {
  if (!game.value?.ending) paused.value = !paused.value
}

// Space pauses and 1–3 set the speed, as in the grand-strategy games. Keys pressed on a
// control or in a field are left to it.
function onKeydown(event: KeyboardEvent) {
  if (event.metaKey || event.ctrlKey || event.altKey || rising.value) return
  if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable], [aria-modal="true"]')) return
  if (event.key === ' ') {
    // A focused button takes Space itself.
    if (event.target instanceof HTMLElement && event.target.closest('button')) return
    event.preventDefault()
    togglePause()
  }
  else if (['1', '2', '3'].includes(event.key)) speed.value = Number(event.key) - 1
}

// Back to the map: a step back when the map is where the visitor came from.
function returnToMap(event: MouseEvent) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  if (window.history.state?.back === '/') router.back()
  else router.push('/')
}

onMounted(() => {
  // The map takes the campaign's colors and armies once the page has hydrated; changing
  // them during hydration would re-render the map page before it's in place.
  watchEffect(() => {
    const s = game.value
    const shown = risen.value
    if (!s) stage.palette.value = campaignPalette(() => -1)
    else if (shown < claims.length) {
      const owner = new Map(claims.slice(0, shown).map(claim => [claim.county, claim.house]))
      stage.palette.value = campaignPalette(id => owner.get(id) ?? -1)
    }
    else stage.palette.value = campaignPalette(id => s.owner[id]!)
  })
  watchEffect(() => {
    stage.armies.value = game.value && !rising.value ? armyBanners(game.value) : []
  })
  window.addEventListener('keydown', onKeydown)
  // Someone who opened /play directly waits for the map to be drawn first.
  watch(stage.ready, (ready) => {
    if (ready && !game.value && !settle) settle = setTimeout(begin, SETTLE_MS)
  }, { immediate: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  clearTimeout(settle)
  clearTimeout(timer)
  cancelAnimationFrame(frame)
  stage.palette.value = null
  stage.armies.value = []
})
</script>

<template>
  <div class="keystone">
    <h1 class="sr-only">Keystone — nine houses contend for Pennsylvania</h1>

    <Transition name="keystone-left">
      <section v-if="!rising" class="keystone-panel keystone-houses" aria-label="The houses">
        <header class="keystone-houses-head">
          <p class="keystone-title">Keystone</p>
          <p class="keystone-muted">Nine houses contend for Pennsylvania.</p>
        </header>
        <ol class="keystone-house-list">
          <li v-for="house in houses" :key="house.id" class="keystone-house" :class="{ 'keystone-fallen': !house.held }">
            <span class="keystone-swatch" :style="{ background: houseColor(house.id) }" />
            <RealmHeraldicShield class="keystone-house-arms" :seed="house.name" />
            <span class="keystone-house-text">
              <span class="keystone-house-name">{{ house.name }}</span>
              <span class="keystone-muted">
                <template v-if="house.rank">{{ house.rank }} · {{ house.held }} {{ house.held === 1 ? 'county' : 'counties' }}</template>
                <template v-else>Fallen</template>
              </span>
            </span>
            <span v-if="house.enemy" class="keystone-war" :title="`At war with ${house.enemy}`">
              <Swords class="size-3.5" aria-hidden="true" />
              <span class="sr-only">At war with {{ house.enemy }}</span>
            </span>
          </li>
        </ol>
        <footer class="keystone-houses-foot">
          <button type="button" class="keystone-action" @click="begin">New campaign</button>
          <a href="/" class="keystone-action" @click="returnToMap">Return to the map</a>
        </footer>
      </section>
    </Transition>

    <Transition name="keystone-right">
      <div v-if="!rising && game" class="keystone-panel keystone-ticker">
        <p class="keystone-date" aria-live="off">{{ dateOf(game.month) }}</p>
        <div class="keystone-controls">
          <button
            type="button"
            class="keystone-pause"
            :disabled="!!game.ending"
            :aria-label="paused ? 'Play (Space)' : 'Pause (Space)'"
            @click="togglePause"
          >
            <Play v-if="paused" class="size-4" aria-hidden="true" />
            <Pause v-else class="size-4" aria-hidden="true" />
          </button>
          <div class="keystone-speeds" role="group" aria-label="Speed">
            <button
              v-for="(_, index) in SPEEDS"
              :key="index"
              type="button"
              class="keystone-pip"
              :aria-pressed="speed === index"
              :aria-label="`Speed ${index + 1} (${index + 1})`"
              @click="speed = index"
            />
          </div>
        </div>
        <p v-if="ending" class="keystone-ending">{{ ending }}</p>
        <p v-else-if="paused" class="keystone-paused">Paused</p>
      </div>
    </Transition>

    <Transition name="keystone-left">
      <section v-if="!rising && feed.length" class="keystone-panel keystone-chronicle" aria-label="The chronicle">
        <ol>
          <li v-for="line in feed" :key="line.key">
            <span class="keystone-entry-date">{{ line.date }}</span>
            <span>
              <template v-for="(part, index) in line.parts" :key="index">
                <span v-if="part.house !== undefined" class="keystone-entry-house" :style="{ '--house': houseColor(part.house) }">{{ part.text }}</span>
                <template v-else>{{ part.text }}</template>
              </template>.
            </span>
          </li>
        </ol>
      </section>
    </Transition>
  </div>
</template>

<style scoped>
/* Over the map, but only its panels take the pointer, so the map still drags. */
.keystone {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.keystone-panel {
  position: absolute;
  border: 1px solid var(--panel-edge);
  border-radius: 4px;
  background: var(--panel);
  box-shadow: inset 0 0 0 1px rgb(255 230 170 / 0.06), 0 10px 30px rgb(0 0 0 / 0.45);
  pointer-events: auto;
}

.keystone-muted {
  color: var(--ink-muted);
  line-height: 1.3;
}

/* Top left, where the résumé's banner was: the houses, largest first. */
.keystone-houses {
  top: 16px;
  left: 16px;
  display: flex;
  flex-direction: column;
  width: 300px;
  max-height: calc(100vh - 260px);
}

.keystone-houses-head {
  padding: 12px 14px 8px;
  border-bottom: 1px solid rgb(184 149 90 / 0.25);
}

.keystone-title {
  font-family: Cinzel, Georgia, serif;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--gold);
}

.keystone-house-list {
  min-height: 0;
  overflow-y: auto;
  padding: 6px 0;
}

.keystone-house {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 4px 14px 4px 0;
}

.keystone-swatch {
  align-self: stretch;
  width: 5px;
  border-radius: 0 2px 2px 0;
}

.keystone-house-arms {
  width: 20px;
  flex-shrink: 0;
}

.keystone-house-text {
  display: grid;
  flex: 1;
  min-width: 0;
  font-size: 15px;
  line-height: 1.2;
}

.keystone-house-name {
  font-weight: 600;
}

.keystone-fallen {
  opacity: 0.45;
}

.keystone-war {
  color: #d9705a;
}

.keystone-houses-foot {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 14px;
  border-top: 1px solid rgb(184 149 90 / 0.25);
  background: rgb(0 0 0 / 0.18);
}

.keystone-action {
  font-family: Cinzel, Georgia, serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-decoration: none;
  text-transform: uppercase;
  color: var(--ink);
}

.keystone-action:hover,
.keystone-action:focus-visible {
  color: var(--gold);
  outline: none;
}

/* Top right: the date, pause and the three speeds. */
.keystone-ticker {
  top: 16px;
  right: 16px;
  display: grid;
  justify-items: center;
  gap: 6px;
  min-width: 210px;
  padding: 10px 16px 12px;
}

.keystone-date {
  font-family: Cinzel, Georgia, serif;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.05em;
  font-variant-numeric: tabular-nums;
  color: var(--gold);
}

.keystone-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.keystone-pause {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--gold-dim);
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #3a3226, #1d1912 75%);
  color: var(--gold);
}

.keystone-pause:hover:enabled,
.keystone-pause:focus-visible {
  border-color: var(--gold);
  outline: none;
}

.keystone-pause:disabled {
  opacity: 0.4;
}

.keystone-speeds {
  display: flex;
  gap: 4px;
}

/* Pips fill up to the speed that's set. */
.keystone-pip {
  width: 16px;
  height: 10px;
  border: 1px solid var(--gold-dim);
  border-radius: 2px;
  background: rgb(0 0 0 / 0.3);
}

.keystone-pip:has(~ .keystone-pip[aria-pressed="true"]),
.keystone-pip[aria-pressed="true"] {
  border-color: var(--gold);
  background: var(--gold);
}

.keystone-pip:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}

.keystone-paused,
.keystone-ending {
  font-size: 15px;
  font-style: italic;
  color: var(--ink-muted);
}

.keystone-ending {
  color: var(--ink);
}

/* Bottom left: the latest lines of the chronicle, newest first. */
.keystone-chronicle {
  left: 16px;
  bottom: 16px;
  width: 420px;
  max-width: calc(100vw - 32px);
  padding: 8px 14px;
  font-size: 15px;
  line-height: 1.3;
}

.keystone-chronicle ol {
  display: grid;
  gap: 3px;
}

.keystone-chronicle li {
  display: flex;
  gap: 10px;
}

.keystone-chronicle li:nth-child(n + 3) {
  opacity: 0.7;
}

.keystone-entry-date {
  flex-shrink: 0;
  width: 98px;
  color: var(--ink-muted);
  font-variant-numeric: tabular-nums;
}

.keystone-entry-house {
  font-weight: 600;
  text-decoration: underline;
  text-decoration-color: var(--house);
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
}

.keystone-left-enter-active,
.keystone-left-leave-active,
.keystone-right-enter-active,
.keystone-right-leave-active {
  transition: opacity 500ms ease, transform 500ms ease;
}

.keystone-left-enter-from,
.keystone-left-leave-to {
  opacity: 0;
  transform: translateX(-40px);
}

.keystone-right-enter-from,
.keystone-right-leave-to {
  opacity: 0;
  transform: translateX(40px);
}

/* Phones: the date across the top, the houses as a compact grid beneath it and the
   chronicle at the bottom. Phase 5 designs this properly. */
@media (max-width: 640px) {
  .keystone-ticker {
    top: 10px;
    right: 10px;
    left: 10px;
    grid-template-columns: 1fr auto;
    align-items: center;
    min-width: 0;
    padding: 8px 12px;
  }

  .keystone-paused,
  .keystone-ending {
    grid-column: 1 / -1;
  }

  .keystone-houses {
    top: 76px;
    left: 10px;
    right: 10px;
    width: auto;
    max-height: none;
  }

  .keystone-houses-head {
    display: none;
  }

  .keystone-house-list {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    padding: 4px 0;
  }

  .keystone-house {
    gap: 5px;
    padding: 2px 4px 2px 0;
  }

  .keystone-house-arms,
  .keystone-war {
    display: none;
  }

  .keystone-house-text {
    font-size: 12px;
  }

  .keystone-houses-foot {
    padding: 5px 12px;
  }

  .keystone-chronicle {
    left: 10px;
    right: 10px;
    bottom: 10px;
    width: auto;
    font-size: 13px;
  }

  .keystone-chronicle li:nth-child(n + 4) {
    display: none;
  }

  .keystone-entry-date {
    width: 92px;
    white-space: nowrap;
  }
}

@media (prefers-reduced-motion: reduce) {
  .keystone-left-enter-active,
  .keystone-left-leave-active,
  .keystone-right-enter-active,
  .keystone-right-leave-active {
    transition: opacity 200ms ease;
  }

  .keystone-left-enter-from,
  .keystone-left-leave-to,
  .keystone-right-enter-from,
  .keystone-right-leave-to {
    transform: none;
  }
}
</style>
