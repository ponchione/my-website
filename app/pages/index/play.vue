<script setup lang="ts">
import { ChevronDown, Pause, Play, Swords } from '@lucide/vue'
import { armyBanners, armyRoute, campaignPalette, chronicleLine, effectText, entryDate, fill, houseColor } from '~/utils/keystone/display'
import {
  COUNTY_IDS, RULES, ageOf, apply, county, dateOf, developCost, eventById, found, holdings, income, maxLevy, newGame, rank, score, siegeMonths, step, upkeep, warOf, warScore,
  type CountyId, type GameState, type Order, type Ruler,
} from '~/utils/keystone/engine'
import type { MapPick } from '~/utils/realm/map-data'
import { REALM_STAGE } from '~/utils/realm/stage'
import { loadCampaign, saveCampaign, type Saved } from '~/utils/keystone/save'

// Keystone, played on the map: the résumé has stepped aside (the map page hides it at
// /play), the visitor picks a county for their house, the houses rise across
// Pennsylvania, and the visitor's house contends with eight computer houses.

// The map page hands every child page its letters; the game has no use for them.
defineOptions({ inheritAttrs: false })

useSiteSeo('Keystone — Mitchell Ponchione', '/play', 'Keystone: lead one of nine medieval houses carving up Pennsylvania\'s 67 counties on the realm map.', {
  path: '/og-play.jpg',
  alt: 'Pennsylvania\'s counties in nine house colors, with two armies and a dashed march route',
})

const stage = inject(REALM_STAGE)!
const router = useRouter()

// Milliseconds per month at each speed.
const SPEEDS = [2000, 1000, 500]
// How long the houses take to spread from their seats.
const RISE_MS = 1500
// Long enough for the résumé to step aside before the prompt shows.
const SETTLE_MS = 600
const FEED_LINES = 5
// How long an army takes to walk to where an order (rather than a month) puts it.
const ORDER_GLIDE_MS = 300
const TERRAIN = { flat: 'Flat', hills: 'Hills', mountains: 'Mountains' } as const

const game = shallowRef<GameState | null>(null)
// Whether the prompt to choose a starting county is showing, and the saved campaign it
// offers first, if any.
const choosing = ref(false)
const saved = shallowRef<Saved>({ kind: 'none' })
// Whether the end screen is open; closing it leaves the final map to look at.
const endOpen = ref(false)
// The order the houses claimed their counties in, and how many of those claims show.
let claims: { house: number, county: number }[] = []
const risen = ref(0)
const rising = computed(() => !game.value || risen.value < claims.length)
const paused = ref(true)
const speed = ref(1)
// The county the visitor has selected, and whether their next click marches the army.
const selected = ref<CountyId | null>(null)
const marching = ref(false)
// On phones the house panel folds its ruler, the other houses and the campaign's links
// away until asked for, so the map keeps the screen.
const courtOpen = ref(false)
// Why the last order was refused.
const notice = ref('')

let settle: ReturnType<typeof setTimeout> | undefined
let timer: ReturnType<typeof setTimeout> | undefined
let frame = 0
// How long the armies take to walk to their next places: a whole month when the month
// moves them, so they're always on their way.
let glide = ORDER_GLIDE_MS

// Back to the prompt: Pennsylvania unclaimed, waiting for a county. On arrival the
// prompt first offers the saved campaign, if there is one.
function choose(offerSave = false) {
  clearTimeout(timer)
  cancelAnimationFrame(frame)
  game.value = null
  claims = []
  selected.value = null
  marching.value = false
  notice.value = ''
  endOpen.value = false
  saved.value = offerSave ? loadCampaign() : { kind: 'none' }
  choosing.value = true
}

// The saved campaign, as it was left: paused, without the houses rising again.
function resume() {
  if (saved.value.kind !== 'saved') return
  claims = []
  risen.value = 0
  game.value = saved.value.state
  saved.value = { kind: 'none' }
  choosing.value = false
  paused.value = true
  endOpen.value = !!game.value.ending
}

function save() {
  if (game.value) saveCampaign(game.value)
}

// A new world with the visitor's house at `start` (or a random county), the houses
// spreading from their seats claim by claim, then paused.
function begin(start: CountyId | null) {
  const seat = start ?? COUNTY_IDS[Math.floor(Math.random() * COUNTY_IDS.length)]!
  const seed = Math.floor(Math.random() * 2 ** 31)
  claims = found({ rng: seed }, seat).claims
  game.value = newGame(seed, seat)
  save()
  choosing.value = false
  paused.value = true
  cancelAnimationFrame(frame)
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    risen.value = claims.length
    return
  }
  risen.value = 0
  const begun = performance.now()
  const spread = (now: number) => {
    risen.value = Math.min(claims.length, Math.ceil(((now - begun) / RISE_MS) * claims.length))
    if (risen.value < claims.length) frame = requestAnimationFrame(spread)
  }
  frame = requestAnimationFrame(spread)
}

// The months pass on their own unless paused. The campaign pauses itself when war is
// declared on the visitor, when an event arrives and when it ends.
function schedule() {
  clearTimeout(timer)
  if (paused.value || rising.value || game.value?.ending || game.value?.event) return
  timer = setTimeout(() => {
    const before = game.value!
    const after = step(before)
    glide = SPEEDS[speed.value]!
    game.value = after
    save()
    const war = after.player === null ? undefined : warOf(after, after.player)
    if (after.ending || after.event || (war && war.defender === after.player && !warOf(before, after.player!))) paused.value = true
    if (after.ending) endOpen.value = true
    schedule()
  }, SPEEDS[speed.value])
}

watch([paused, speed, rising], schedule)

// An order from the visitor, at once. A refused order says why.
function attempt(order: Order) {
  try {
    game.value = apply(game.value!, order)
    notice.value = ''
  }
  catch (error) {
    notice.value = (error as Error).message
  }
}

// Why the rules would refuse an order, or '' if they'd take it.
function refusal(order: Order) {
  try {
    apply(game.value!, order)
    return ''
  }
  catch (error) {
    return (error as Error).message
  }
}

// A click on the map: a starting county at the prompt, a destination while marching,
// otherwise a county to look at.
function onPick(pick: MapPick | null) {
  const c = pick?.kind === 'county' && COUNTY_IDS.includes(pick.id) ? pick.id : null
  if (!game.value) {
    if (choosing.value && saved.value.kind === 'none' && c !== null) begin(c)
    return
  }
  if (rising.value) return
  notice.value = ''
  if (marching.value && c !== null) {
    marching.value = false
    attempt({ kind: 'move', house: game.value.player!, county: c })
  }
  selected.value = c
}

const houses = computed(() => {
  const s = game.value
  if (!s) return []
  return s.houses
    .filter(h => h.id !== s.player)
    .map((h) => {
      const held = holdings(s, h.id).length
      const war = warOf(s, h.id)
      const enemy = war && s.houses[war.attacker === h.id ? war.defender : war.attacker]!.name
      return { id: h.id, name: h.name, held, rank: held ? rank(s, h.id) : null, enemy }
    })
    .sort((a, b) => b.held - a.held || a.id - b.id)
})

// A ruler as the panels show one: name, age, the three skills and health.
const rulerOf = (s: GameState, r: Ruler) => ({
  name: r.name,
  age: ageOf(r, s.month),
  skills: [
    { label: 'Martial', value: r.martial, title: 'Battle strength' },
    { label: 'Stewardship', value: r.stewardship, title: 'Income' },
    { label: 'Learning', value: r.learning, title: 'The cost to develop' },
    { label: 'Health', value: r.health, title: 'Poor health shortens a life' },
  ],
})

// The visitor's house, for the summary at the top left.
const mine = computed(() => {
  const s = game.value
  if (!s || s.player === null) return null
  const h = s.houses[s.player]!
  const held = holdings(s, h.id).length
  const war = warOf(s, h.id)
  const enemy = war ? (war.attacker === h.id ? war.defender : war.attacker) : null
  return {
    id: h.id,
    name: h.name,
    held,
    rank: held ? rank(s, h.id) : 'Fallen',
    gold: h.gold,
    income: income(s, h.id) - (h.army ? upkeep(h.army.men) : 0),
    ruler: rulerOf(s, h.ruler),
    levies: h.levies,
    maxLevies: maxLevy(s, h.id),
    army: h.army && {
      men: h.army.men,
      at: county(h.army.county).name,
      to: h.army.target === null ? null : county(h.army.target).name,
    },
    war: war && enemy !== null && {
      enemy,
      name: s.houses[enemy]!.name,
      score: warScore(war, h.id),
      offer: war.offer,
    },
  }
})

// The selected county, with what the visitor may do there.
const place = computed(() => {
  const s = game.value
  const c = selected.value
  if (!s || c === null || rising.value || s.player === null) return null
  const me = s.player
  const holder = s.owner[c]!
  const level = s.development[c]!
  const own = holder === me
  const h = s.houses[me]!
  const besieger = s.houses.find((other) => {
    const war = warOf(s, other.id)
    return other.army?.county === c && other.id !== holder && war && (war.attacker === holder || war.defender === holder)
  })
  const myWar = warOf(s, me)
  const atWarWithHolder = !!myWar && (myWar.attacker === holder || myWar.defender === holder)
  const order = (o: Order) => ({ order: o, refused: refusal(o) })
  return {
    id: c,
    name: `${county(c).name} County`,
    holder,
    holderName: s.houses[holder]!.name,
    ruler: rulerOf(s, s.houses[holder]!.ruler),
    own,
    seat: s.houses[holder]!.seat === c,
    level,
    terrain: TERRAIN[county(c).terrain],
    levies: level * RULES.menPerDevelopment,
    siege: besieger && { house: besieger.name, months: besieger.army!.siege, of: siegeMonths(s, c) },
    develop: own ? { cost: developCost(s, me, c), ...order({ kind: 'develop', house: me, county: c }) } : null,
    raise: own && !h.army ? { men: h.levies, ...order({ kind: 'raise', house: me, county: c }) } : null,
    disband: own && h.army ? order({ kind: 'disband', house: me }) : null,
    march: h.army && h.army.county !== c ? order({ kind: 'move', house: me, county: c }) : null,
    declare: !own && !atWarWithHolder ? order({ kind: 'declare', house: me, target: holder }) : null,
    peace: !own && atWarWithHolder ? { accept: myWar!.offer === holder, offered: myWar!.offer === me, ...order({ kind: 'peace', house: me }) } : null,
  }
})

// Marching needs an army.
watch(() => mine.value?.army, (army) => {
  if (!army) marching.value = false
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

// The event waiting on the visitor's choice, with what each choice would do.
const pending = computed(() => {
  const s = game.value
  if (!s?.event || s.player === null || rising.value) return null
  const { id, county: c } = s.event
  const event = eventById(id)
  const ruler = s.houses[s.player]!.ruler.name
  return {
    title: event.title,
    text: fill(event.text, ruler, c),
    choices: event.choices.map((choice, index) => {
      const order: Order = { kind: 'choose', house: s.player!, choice: index }
      return { key: index, label: choice.label, effect: effectText(s, choice.effect, c), order, refused: refusal(order) }
    }),
  }
})

const ending = computed(() => {
  const s = game.value
  const end = s?.ending
  if (!s || !end) return null
  if (end.kind === 'fallen') return 'Your house has fallen'
  if (end.kind === 'united') return end.house === s.player ? 'You unite Pennsylvania' : `${s.houses[end.house!]!.name} unites Pennsylvania`
  return `The age ends. Your score: ${score(s, s.player!)}`
})

// The end screen: the outcome, the score at 1250, and the whole chronicle in order.
const finale = computed(() => {
  const s = game.value
  const end = s?.ending
  if (!s || !end || s.player === null) return null
  const me = s.houses[s.player]!
  const held = holdings(s, s.player).length
  const outcomes = {
    united: { kicker: 'Victory', title: 'You unite Pennsylvania', lead: `${me.name} holds all 67 counties. ${me.ruler.name} is King of Pennsylvania.` },
    fallen: { kicker: 'Defeat', title: 'Your house has fallen', lead: `${me.name} has lost its last county.` },
    time: { kicker: 'The age ends', title: `Your score: ${score(s, s.player)}`, lead: `${me.name} reaches 1250 as a ${rank(s, s.player)} with ${held} ${held === 1 ? 'county' : 'counties'}.` },
  }
  return {
    ...outcomes[end.kind],
    date: dateOf(end.month),
    lines: s.chronicle.map((entry, index) => ({ key: index, date: entryDate(entry), parts: chronicleLine(s, entry) })),
  }
})

// What the prompt says about the saved campaign.
const savedCampaign = computed(() => {
  const save = saved.value
  if (save.kind !== 'saved') return null
  const s = save.state
  const me = s.player === null ? null : s.houses[s.player]
  return `${me?.name ?? 'The houses'}, ${s.ending ? 'ended ' : ''}${dateOf(s.month)}.`
})

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`)

// The counties by name, so a county can be chosen without the map: from the keyboard
// or a screen reader. A choice from the list counts as a click on the map.
const COUNTIES_BY_NAME = COUNTY_IDS.map(id => ({ id, name: county(id).name })).sort((a, b) => a.name.localeCompare(b.name))

// The county chosen in the list. Arrow keys on a closed list change it at once, so it
// only acts when its button is pressed.
const listed = ref<CountyId | ''>('')

function pickFromList() {
  const id = listed.value
  listed.value = ''
  if (id !== '') onPick({ kind: 'county', id })
}

function togglePause() {
  if (!game.value?.ending && !game.value?.event) paused.value = !paused.value
}

// Space pauses and 1–3 set the speed, as in the grand-strategy games; Escape lets go of
// the march, then the selected county. Keys pressed on a control or in a field are left
// to it.
function onKeydown(event: KeyboardEvent) {
  if (event.metaKey || event.ctrlKey || event.altKey || rising.value) return
  if (event.key === 'Escape' && endOpen.value) {
    endOpen.value = false
    return
  }
  if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable], [aria-modal="true"]')) return
  if (event.key === 'Escape') {
    if (marching.value) marching.value = false
    else selected.value = null
  }
  else if (event.key === ' ') {
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
    stage.armies.value = game.value && !rising.value ? armyBanners(game.value, glide) : []
    glide = ORDER_GLIDE_MS
  })
  watchEffect(() => {
    stage.route.value = game.value && !rising.value ? armyRoute(game.value) : null
  })
  watchEffect(() => {
    stage.selected.value = selected.value === null ? null : { kind: 'county', id: selected.value }
  })
  stage.onPick.value = onPick
  window.addEventListener('keydown', onKeydown)
  // A reload or a closed tab never unmounts the page, so save as it goes.
  window.addEventListener('pagehide', save)
  // Someone who opened /play directly waits for the map to be drawn first.
  watch(stage.ready, (ready) => {
    if (ready && !game.value && !settle) settle = setTimeout(() => choose(true), SETTLE_MS)
  }, { immediate: true })
})

onBeforeUnmount(() => {
  save()
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('pagehide', save)
  clearTimeout(settle)
  clearTimeout(timer)
  cancelAnimationFrame(frame)
  stage.palette.value = null
  stage.armies.value = []
  stage.route.value = null
  stage.selected.value = null
  stage.onPick.value = null
})
</script>

<template>
  <div class="keystone" :class="{ 'keystone-with-place': place, 'keystone-ended': ending }">
    <h1 class="sr-only">Keystone — lead a house in the contest for Pennsylvania</h1>

    <Transition name="keystone-fade">
      <section v-if="choosing && !game" class="keystone-panel keystone-prompt" aria-label="Choose where your house begins">
        <p class="keystone-title">Keystone</p>
        <template v-if="savedCampaign">
          <p class="keystone-prompt-lead">A campaign is saved.</p>
          <p class="keystone-muted">{{ savedCampaign }}</p>
          <div class="keystone-prompt-actions">
            <button type="button" class="keystone-action" @click="resume">Continue</button>
            <button type="button" class="keystone-action" @click="choose()">New campaign</button>
          </div>
        </template>
        <template v-else-if="saved.kind === 'old'">
          <p class="keystone-prompt-lead">This campaign was begun under older laws.</p>
          <p class="keystone-muted">It can't be continued.</p>
          <div class="keystone-prompt-actions">
            <button type="button" class="keystone-action" @click="choose()">New campaign</button>
            <a href="/" class="keystone-action" @click="returnToMap">Return to the map</a>
          </div>
        </template>
        <template v-else>
          <p class="keystone-prompt-lead">Choose where your house begins.</p>
          <p class="keystone-muted">Click a county on the map. Eight other houses rise around yours.</p>
          <div class="keystone-prompt-actions">
            <button type="button" class="keystone-action" @click="begin(null)">Let fate decide</button>
            <a href="/" class="keystone-action" @click="returnToMap">Return to the map</a>
          </div>
          <div class="keystone-county-pick">
            <select v-model="listed" class="keystone-action keystone-county-list" aria-label="Choose a county from the list">
              <option value="" disabled>Or choose from the list</option>
              <option v-for="c in COUNTIES_BY_NAME" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
            <button type="button" class="keystone-action" :disabled="listed === ''" @click="pickFromList">Begin here</button>
          </div>
        </template>
      </section>
    </Transition>

    <Transition name="keystone-left">
      <section
        v-if="!rising && mine"
        class="keystone-panel keystone-houses"
        :class="{ 'keystone-court-open': courtOpen }"
        aria-label="Your house and its rivals"
      >
        <header class="keystone-me" :style="{ '--house': houseColor(mine.id) }">
          <div class="keystone-me-title">
            <RealmHeraldicShield class="keystone-me-arms" :seed="mine.name" />
            <div class="keystone-me-text">
              <p class="keystone-me-name">{{ mine.name }}</p>
              <p class="keystone-muted">{{ mine.rank }} · your house</p>
            </div>
            <button
              type="button"
              class="keystone-court-toggle"
              :aria-expanded="courtOpen"
              aria-controls="keystone-court"
              @click="courtOpen = !courtOpen"
            >
              <span>{{ courtOpen ? 'Less' : 'Court' }}</span>
              <ChevronDown class="size-4" aria-hidden="true" />
            </button>
          </div>
          <dl id="keystone-court" class="keystone-stats">
            <div class="keystone-court-detail">
              <dt>Ruler</dt>
              <dd>{{ mine.ruler.name }}, {{ mine.ruler.age }}</dd>
            </div>
            <div class="keystone-stat-skills keystone-court-detail">
              <dt class="sr-only">Skills</dt>
              <dd>
                <ul class="keystone-skills">
                  <li v-for="skill in mine.ruler.skills" :key="skill.label" :title="skill.title">
                    <span class="keystone-muted">{{ skill.label }}</span> {{ skill.value }}
                  </li>
                </ul>
              </dd>
            </div>
            <div>
              <dt>Gold</dt>
              <dd>{{ mine.gold }} <span class="keystone-muted">({{ signed(mine.income) }} a month)</span></dd>
            </div>
            <div class="keystone-stat-army">
              <dt>{{ mine.army ? 'Army' : 'Levies' }}</dt>
              <dd v-if="mine.army">
                {{ mine.army.men }} men in {{ mine.army.at }}<span v-if="mine.army.to" class="keystone-muted">, to {{ mine.army.to }}</span>
              </dd>
              <dd v-else>{{ mine.levies }} <span class="keystone-muted">of {{ mine.maxLevies }}</span></dd>
            </div>
            <div>
              <dt>Counties</dt>
              <dd>{{ mine.held }}</dd>
            </div>
            <div v-if="mine.war" class="keystone-stat-war">
              <dt>War</dt>
              <dd>
                <span class="keystone-entry-house" :style="{ '--house': houseColor(mine.war.enemy) }">{{ mine.war.name }}</span>
                <span class="keystone-muted"> · score {{ signed(mine.war.score) }}</span>
              </dd>
            </div>
          </dl>
          <p v-if="mine.war && mine.war.offer === mine.war.enemy" class="keystone-offer">{{ mine.war.name }} offers peace.</p>
          <button v-if="mine.army" type="button" class="keystone-action keystone-move" :aria-pressed="marching" @click="marching = !marching">
            {{ marching ? 'Cancel the march' : 'Move the army' }}
          </button>
          <p v-if="marching" class="keystone-muted keystone-hint" role="status">Click a county to march there.</p>
        </header>
        <ol class="keystone-house-list keystone-court-detail" aria-label="The other houses" tabindex="0">
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
        <footer class="keystone-houses-foot keystone-court-detail">
          <div class="keystone-county-pick">
            <select v-model="listed" class="keystone-action keystone-county-list" :aria-label="marching ? 'March to a county' : 'Select a county'">
              <option value="" disabled>{{ marching ? 'March to a county' : 'Select a county' }}</option>
              <option v-for="c in COUNTIES_BY_NAME" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
            <button type="button" class="keystone-action" :disabled="listed === ''" @click="pickFromList">{{ marching ? 'March' : 'Show' }}</button>
          </div>
          <button type="button" class="keystone-action" @click="choose()">New campaign</button>
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
            :disabled="!!game.ending || !!game.event"
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
        <button v-if="ending" type="button" class="keystone-ending" @click="endOpen = true">{{ ending }}</button>
        <p v-else-if="paused" class="keystone-paused">Paused</p>
      </div>
    </Transition>

    <Transition name="keystone-right">
      <aside v-if="place" class="keystone-panel keystone-place" aria-live="polite">
        <button class="keystone-close" type="button" aria-label="Close" @click="selected = null">×</button>
        <h2 class="keystone-place-name">{{ place.name }}</h2>
        <p class="keystone-place-owner">
          <span class="keystone-entry-house" :style="{ '--house': houseColor(place.holder) }">{{ place.own ? 'Your house' : place.holderName }}</span>
          <span v-if="place.seat" class="keystone-muted"> · seat</span>
        </p>
        <dl class="keystone-stats">
          <div><dt>Ruler</dt><dd>{{ place.ruler.name }}, {{ place.ruler.age }}</dd></div>
          <div class="keystone-stat-skills">
            <dt class="sr-only">Skills</dt>
            <dd>
              <ul class="keystone-skills">
                <li v-for="skill in place.ruler.skills" :key="skill.label" :title="skill.title">
                  <span class="keystone-muted">{{ skill.label }}</span> {{ skill.value }}
                </li>
              </ul>
            </dd>
          </div>
          <div><dt>Development</dt><dd>{{ place.level }}</dd></div>
          <div><dt>Terrain</dt><dd>{{ place.terrain }}</dd></div>
          <div><dt>Levies</dt><dd>{{ place.levies }} men</dd></div>
          <div v-if="place.siege">
            <dt>Siege</dt>
            <dd>{{ place.siege.house }}, {{ place.siege.months }} of {{ place.siege.of }} months</dd>
          </div>
        </dl>
        <div class="keystone-place-actions">
          <button v-if="place.develop" type="button" class="keystone-action" :disabled="!!place.develop.refused" :title="place.develop.refused || undefined" @click="attempt(place.develop.order)">
            Develop · {{ place.develop.cost }} gold
          </button>
          <button v-if="place.raise" type="button" class="keystone-action" :disabled="!!place.raise.refused" :title="place.raise.refused || undefined" @click="attempt(place.raise.order)">
            Raise levies here · {{ place.raise.men }}
          </button>
          <button v-if="place.disband" type="button" class="keystone-action" :disabled="!!place.disband.refused" @click="attempt(place.disband.order)">
            Disband the army
          </button>
          <button v-if="place.march" type="button" class="keystone-action" :disabled="!!place.march.refused" :title="place.march.refused || undefined" @click="attempt(place.march.order)">
            March here
          </button>
          <button v-if="place.declare" type="button" class="keystone-action" :disabled="!!place.declare.refused" :title="place.declare.refused || undefined" @click="attempt(place.declare.order)">
            Declare war
          </button>
          <button v-if="place.peace" type="button" class="keystone-action" :disabled="!!place.peace.refused || place.peace.offered" @click="attempt(place.peace.order)">
            {{ place.peace.accept ? 'Accept peace' : place.peace.offered ? 'Peace offered' : 'Offer peace' }}
          </button>
        </div>
        <p v-if="notice" class="keystone-notice" role="alert">{{ notice }}.</p>
        <p v-else-if="place.declare?.refused" class="keystone-muted keystone-hint">{{ place.declare.refused }}.</p>
        <p v-else-if="place.develop?.refused" class="keystone-muted keystone-hint">Develop: {{ place.develop.refused.toLowerCase() }}.</p>
      </aside>
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

    <RealmEvent
      v-if="pending && mine"
      class="keystone-end"
      :kicker="`${mine.name} · ${dateOf(game!.month)}`"
      :title="pending.title"
      described-by="keystone-event-text"
    >
      <p id="keystone-event-text" class="keystone-end-lead">{{ pending.text }}</p>
      <template #options>
        <button
          v-for="choice in pending.choices"
          :key="choice.key"
          type="button"
          class="realm-event-option keystone-choice"
          :disabled="!!choice.refused"
          @click="attempt(choice.order)"
        >
          <span class="keystone-choice-label">{{ choice.label }}</span>
          <span class="keystone-muted">{{ choice.effect }}<template v-if="choice.refused"> · {{ choice.refused.toLowerCase() }}</template></span>
        </button>
      </template>
    </RealmEvent>

    <RealmEvent
      v-if="finale && endOpen"
      class="keystone-end"
      :kicker="`${finale.kicker} · ${finale.date}`"
      :title="finale.title"
      described-by="keystone-end-lead"
      wide
      @close="endOpen = false"
    >
      <p id="keystone-end-lead" class="keystone-end-lead">{{ finale.lead }}</p>
      <h3 class="keystone-end-rule"><span>The chronicle</span></h3>
      <ol class="keystone-end-chronicle" aria-label="The chronicle" tabindex="0">
        <li v-for="line in finale.lines" :key="line.key">
          <span class="keystone-entry-date">{{ line.date }}</span>
          <span>
            <template v-for="(part, index) in line.parts" :key="index">
              <span v-if="part.house !== undefined" class="keystone-entry-house" :style="{ '--house': houseColor(part.house) }">{{ part.text }}</span>
              <template v-else>{{ part.text }}</template>
            </template>.
          </span>
        </li>
        <li v-if="!finale.lines.length" class="keystone-muted">Nothing worth recording happened.</li>
      </ol>
      <template #options>
        <button type="button" class="realm-event-option realm-event-option-primary" @click="choose()">New campaign</button>
        <a href="/" class="realm-event-option" @click="returnToMap">Return to the map</a>
      </template>
    </RealmEvent>
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
  max-height: calc(100dvh - 260px);
}

.keystone-me {
  display: grid;
  gap: 8px;
  padding: 12px 14px 10px 14px;
  border-bottom: 1px solid rgb(184 149 90 / 0.25);
  box-shadow: inset 5px 0 0 var(--house);
}

.keystone-me-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.keystone-me-arms {
  width: 30px;
  flex-shrink: 0;
}

.keystone-me-name {
  font-family: Cinzel, Georgia, serif;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: 0.03em;
  color: var(--gold);
}

/* Label and value rows, for the house and the selected county. */
.keystone-stats {
  display: grid;
  gap: 2px;
  font-size: 15px;
  line-height: 1.3;
}

.keystone-stats > div {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 8px;
}

.keystone-stats dt {
  color: var(--ink-muted);
}

.keystone-stats dd {
  font-variant-numeric: tabular-nums;
}

.keystone-offer,
.keystone-notice {
  font-size: 15px;
  font-style: italic;
  color: var(--gold);
}

.keystone-notice {
  color: #e08a72;
}

.keystone-hint {
  font-size: 14px;
  font-style: italic;
}

.keystone-move[aria-pressed="true"] {
  border-color: var(--gold);
}

/* The prompt for a starting county, top centre, clear of the counties. */
.keystone-prompt {
  top: 16px;
  left: 50%;
  display: grid;
  justify-items: center;
  gap: 6px;
  width: min(420px, calc(100vw - 20px));
  padding: 14px 18px 16px;
  text-align: center;
  transform: translateX(-50%);
}

.keystone-prompt-lead {
  font-size: 19px;
}

.keystone-prompt-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  width: 100%;
  margin-top: 6px;
}

/* Bottom right: the selected county and its orders. */
.keystone-place {
  right: 16px;
  bottom: 16px;
  display: grid;
  gap: 8px;
  width: 300px;
  max-height: calc(100dvh - 180px);
  overflow-y: auto;
  padding: 14px 16px 16px;
}

.keystone-close {
  position: absolute;
  top: 8px;
  right: 10px;
  font-size: 22px;
  line-height: 1;
  color: var(--ink-muted);
}

.keystone-close:hover {
  color: var(--gold);
}

.keystone-place-name {
  padding-right: 24px;
  font-family: Cinzel, Georgia, serif;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--gold);
}

.keystone-place-owner {
  margin-top: -4px;
  font-size: 15px;
}

.keystone-place-actions {
  display: grid;
  gap: 6px;
  margin-top: 4px;
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
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 8px 10px;
  border-top: 1px solid rgb(184 149 90 / 0.25);
  background: rgb(0 0 0 / 0.18);
}

/* The same button as the tour's options. */
.keystone-action {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 7px 10px;
  border: 1px solid #5a4a2e;
  border-radius: 3px;
  background: linear-gradient(180deg, #2f2920, #221e17);
  font-size: 16px;
  text-decoration: none;
  white-space: nowrap;
  color: var(--ink);
  transition: border-color 150ms ease, background 150ms ease;
}

.keystone-action:hover:not(:disabled),
.keystone-action:focus-visible {
  border-color: var(--gold);
  background: linear-gradient(180deg, #3a3226, #29231a);
  outline: none;
}

.keystone-county-pick {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-column: 1 / -1;
  gap: 6px;
  width: 100%;
}

.keystone-county-list {
  min-width: 0;
  color-scheme: dark;
  cursor: pointer;
}

.keystone-action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
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

/* The ending, in the ticker, reopens the end screen. */
button.keystone-ending {
  text-decoration: underline;
  text-decoration-color: var(--gold-dim);
  text-underline-offset: 3px;
}

button.keystone-ending:hover,
button.keystone-ending:focus-visible {
  color: var(--gold);
  outline: none;
}

/* The ruler's skills, in one row that wraps. */
.keystone-stat-skills {
  margin: -2px 0 2px;
}

.keystone-stats > .keystone-stat-skills {
  grid-template-columns: 1fr;
}

.keystone-skills {
  display: flex;
  flex-wrap: wrap;
  column-gap: 12px;
  font-size: 14px;
}

/* An event's choices: what to do, then what it costs. */
.keystone-choice {
  display: grid;
  gap: 2px;
}

.keystone-choice-label {
  font-weight: 600;
}

.keystone-choice .keystone-muted {
  font-size: 15px;
}

.keystone-choice:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* The end screen, in the event pop-up's frame, over the whole map. */
.keystone-end {
  z-index: 2;
  pointer-events: auto;
}

.keystone-end-lead {
  margin-top: 8px;
  font-size: 17px;
  line-height: 1.4;
}

.keystone-end-rule {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 16px 0 8px;
  font-family: Cinzel, Georgia, serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-muted);
}

.keystone-end-rule::before,
.keystone-end-rule::after {
  content: "";
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold-dim), transparent);
}

/* The whole chronicle, oldest first, scrolling inside the frame. */
.keystone-end-chronicle {
  display: grid;
  gap: 3px;
  max-height: min(340px, calc(100dvh - 340px));
  min-height: 80px;
  overflow-y: auto;
  padding-right: 6px;
  font-size: 15px;
  line-height: 1.3;
}

.keystone-end-chronicle li {
  display: flex;
  gap: 10px;
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

.keystone-place.keystone-right-enter-active,
.keystone-place.keystone-right-leave-active {
  transition-duration: 200ms;
}

.keystone-fade-enter-active,
.keystone-fade-leave-active {
  transition: opacity 300ms ease;
}

.keystone-fade-enter-from,
.keystone-fade-leave-to {
  opacity: 0;
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

/* The court toggle only folds the house panel on phones. */
.keystone-court-toggle {
  display: none;
}

/* Phones: the map keeps the screen. The date and its controls run across the top, your
   house folds to a few lines beneath them (Court unfolds the ruler, the other houses and
   the campaign's links), and the selected county or the latest chronicle lines sit at
   the bottom. Controls are big enough for a thumb. */
@media (max-width: 640px) {
  .keystone-ticker {
    top: 8px;
    right: 8px;
    left: 8px;
    grid-template-columns: 1fr auto;
    align-items: center;
    min-width: 0;
    padding: 4px 6px 4px 12px;
  }

  .keystone-date {
    font-size: 16px;
  }

  .keystone-controls {
    gap: 6px;
  }

  .keystone-pause {
    width: 40px;
    height: 40px;
  }

  .keystone-speeds {
    gap: 6px;
    padding: 0 6px;
  }

  /* A pip's touch area reaches well past the pip itself. */
  .keystone-pip {
    position: relative;
    width: 20px;
    height: 12px;
  }

  .keystone-pip::after {
    content: "";
    position: absolute;
    inset: -14px -4px;
  }

  /* The play button already shows a pause; the ending needs the room. */
  .keystone-paused {
    display: none;
  }

  .keystone-ending {
    grid-column: 1 / -1;
    padding-bottom: 4px;
  }

  .keystone-houses {
    top: 64px;
    left: 8px;
    right: 8px;
    width: auto;
    max-height: calc(100dvh - 150px);
  }

  .keystone-ended .keystone-houses {
    top: 92px;
  }

  .keystone-houses:not(.keystone-court-open) .keystone-court-detail {
    display: none;
  }

  .keystone-me {
    gap: 4px;
    padding: 6px 8px 8px 12px;
  }

  .keystone-houses:not(.keystone-court-open) .keystone-me {
    border-bottom: 0;
  }

  .keystone-me-text {
    flex: 1;
    min-width: 0;
  }

  .keystone-me-arms {
    width: 22px;
  }

  .keystone-me-name {
    font-size: 15px;
  }

  .keystone-me .keystone-muted {
    font-size: 13px;
  }

  .keystone-court-toggle {
    display: flex;
    align-items: center;
    gap: 2px;
    min-height: 36px;
    padding: 0 6px 0 10px;
    border: 1px solid #5a4a2e;
    border-radius: 3px;
    background: linear-gradient(180deg, #2f2920, #221e17);
    font-size: 14px;
    color: var(--ink);
  }

  .keystone-court-toggle svg {
    transition: transform 200ms ease;
  }

  .keystone-court-toggle[aria-expanded="true"] svg {
    transform: rotate(180deg);
  }

  /* Gold and counties side by side; the army and the war get a line each. */
  .keystone-me .keystone-stats {
    grid-template-columns: 1fr 1fr;
    grid-auto-flow: row dense;
    column-gap: 10px;
    font-size: 14px;
  }

  .keystone-me .keystone-stats > div {
    grid-template-columns: auto 1fr;
    gap: 6px;
  }

  .keystone-me .keystone-stat-army,
  .keystone-me .keystone-stat-war,
  .keystone-me .keystone-stat-skills,
  .keystone-me .keystone-court-detail {
    grid-column: 1 / -1;
  }

  .keystone-hint,
  .keystone-offer {
    font-size: 13px;
  }

  .keystone-move {
    min-height: 40px;
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
    padding: 6px 8px;
  }

  .keystone-action {
    min-height: 40px;
    padding: 5px 8px;
    font-size: 14px;
  }

  /* The selected county, as a sheet along the bottom. */
  .keystone-place {
    left: 8px;
    right: 8px;
    bottom: 8px;
    width: auto;
    max-height: 48dvh;
    gap: 6px;
    padding: 10px 12px 12px;
  }

  .keystone-close {
    top: 2px;
    right: 2px;
    width: 40px;
    height: 40px;
  }

  .keystone-place-name {
    font-size: 17px;
  }

  .keystone-place .keystone-stats {
    grid-template-columns: 1fr 1fr;
    column-gap: 10px;
    font-size: 14px;
  }

  .keystone-place .keystone-stats > div {
    grid-template-columns: auto 1fr;
    gap: 6px;
  }

  .keystone-place .keystone-stats > div:first-child,
  .keystone-place .keystone-stats > .keystone-stat-skills {
    grid-column: 1 / -1;
    grid-template-columns: auto 1fr;
  }

  .keystone-place .keystone-stats > .keystone-stat-skills {
    grid-template-columns: 1fr;
  }

  .keystone-skills {
    font-size: 13px;
  }

  .keystone-place-actions {
    grid-template-columns: 1fr 1fr;
  }

  /* The selected county takes the chronicle's place. */
  .keystone-with-place .keystone-chronicle {
    display: none;
  }

  .keystone-chronicle {
    left: 8px;
    right: 8px;
    bottom: 8px;
    width: auto;
    max-width: none;
    padding: 6px 10px;
    font-size: 13px;
  }

  .keystone-chronicle li:nth-child(n + 3) {
    display: none;
  }

  .keystone-end-chronicle {
    font-size: 13px;
  }

  .keystone-entry-date {
    width: 84px;
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
