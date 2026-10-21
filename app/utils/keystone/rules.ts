// The rules of Keystone, as KEYSTONE_SPEC.md's Rules section states them. Everything
// here works on a GameState the caller owns; engine.ts copies the state first.

import { COUNTY_IDS, county, type CountyId } from './board.ts'
import { EVENTS, eventById, type Effect } from './events.ts'
import { random, randomInt } from './rng.ts'

// Every number in the rules. KEYSTONE_SPEC.md quotes these; keep the two in step.
export const RULES = {
  startYear: 1200,
  months: 600,
  houses: 9,
  startGold: 0,
  menPerDevelopment: 100, // the levy pool's size
  refillMonths: 16, // the pool refills by 1/this of its size each month
  menPerGold: 200, // monthly upkeep is 1 gold per this many men
  developCost: 100, // gold per point of the county's development
  maxDevelopment: 10,
  minArmy: 100,
  roll: [0.8, 1.2],
  defense: { flat: 1, hills: 1.25, mountains: 1.5 },
  crossing: { flat: 1, hills: 1, mountains: 2 }, // months to enter a county
  siege: { flat: 2, hills: 3, mountains: 4 }, // months to take a county
  seatSiege: 1, // extra months at a house's seat
  loserLoss: 0.3, // × r
  winnerLoss: 0.1, // ÷ r
  peaceMonths: 24, // a computer house takes any peace once a war is this old
  truceMonths: 60,
  skillStep: 4, // percent per point of a ruler's skill away from 5
  maxSkill: 10, // skills and health run from 0 to this
  rulerAge: [20, 50], // a founding ruler's age
  heirAge: [16, 30], // an heir's age on succeeding
  frailFrom: 30, // the age at which the risk of death starts to climb
  healthYears: 3, // each point of health below 5 counts as this many years older
  deathScale: 72_000, // monthly chance of death: (years past frailFrom)² ÷ this
  baseDeath: 1 / 2400, // and this, at any age
  eventMonths: [18, 30], // months between the player's events
} as const

// Founders and heirs draw their names from here.
export const NAMES = [
  'Adela', 'Agnes', 'Aldric', 'Alys', 'Amaury', 'Baldwin', 'Beatrix', 'Bertram', 'Cecily', 'Conrad',
  'Edith', 'Edmund', 'Eleanor', 'Emma', 'Geoffrey', 'Gilbert', 'Godfrey', 'Hugh', 'Isabel', 'Joan',
  'Lambert', 'Mabel', 'Matilda', 'Maud', 'Odo', 'Osric', 'Petronilla', 'Ralph', 'Reginald', 'Roger',
  'Rohese', 'Sibyl', 'Simon', 'Tancred', 'Walter', 'William',
]

export type Ruler = {
  name: string
  born: number // the month of birth, counted like GameState.month (before 1200, negative)
  martial: number
  stewardship: number
  learning: number
  health: number
}

export type HouseId = number

export type Army = {
  men: number
  county: CountyId
  target: CountyId | null
  march: number // months spent toward the next county on its route
  siege: number // months it has stood alone in the enemy county it's in
}

export type House = {
  id: HouseId
  name: string
  seat: CountyId | null // null once the house has fallen
  gold: number
  levies: number // the pool, not counting a raised army
  army: Army | null
  ruler: Ruler
}

export type War = {
  attacker: HouseId
  defender: HouseId
  since: number
  taken: [number, number] // development taken from the other side: attacker's, defender's
  offer: HouseId | null // a peace offer waiting on the other side
}

export type Truce = { houses: [HouseId, HouseId], until: number }

// What the chronicle records. `house` did it (declared, made peace, won, took) and
// `other` had it done to them; for 'fell', `house` fell to `other`.
export type Happening =
  | { kind: 'war' | 'peace' | 'fell', house: HouseId, other: HouseId }
  | { kind: 'battle' | 'taken', house: HouseId, other: HouseId, county: CountyId }
  | { kind: 'died', house: HouseId, ruler: string, age: number, heir: string }
  | { kind: 'event', house: HouseId, ruler: string, event: string, choice: number, county: CountyId }

export type Entry = Happening & { month: number }

export type Ending = { month: number, kind: 'united' | 'fallen' | 'time', house: HouseId | null }

export type GameState = {
  seed: number
  rng: number
  month: number // months since 1 January RULES.startYear
  player: HouseId | null
  owner: HouseId[] // by county id; slot 0 is unused
  development: number[] // by county id; slot 0 is unused
  houses: House[]
  wars: War[]
  truces: Truce[]
  chronicle: Entry[]
  ending: Ending | null
  event: { id: string, county: CountyId } | null // waiting on the player's choice
  nextEvent: number // the month the player's next event arrives
}

export type Order =
  | { kind: 'develop', house: HouseId, county: CountyId }
  | { kind: 'raise', house: HouseId, county: CountyId }
  | { kind: 'disband', house: HouseId }
  | { kind: 'move', house: HouseId, county: CountyId }
  | { kind: 'declare', house: HouseId, target: HouseId }
  | { kind: 'peace', house: HouseId }
  | { kind: 'choose', house: HouseId, choice: number }

export function need(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

// --- queries ----------------------------------------------------------------

export function house(s: GameState, id: HouseId): House {
  const found = s.houses[id]
  need(found, `No house ${id}`)
  return found
}

export const alive = (h: House) => h.seat !== null
export const ownerOf = (s: GameState, c: CountyId) => s.owner[c]!
export const developmentAt = (s: GameState, c: CountyId) => s.development[c]!
export const holdings = (s: GameState, id: HouseId) => COUNTY_IDS.filter(c => s.owner[c] === id)

export function developmentOf(s: GameState, id: HouseId): number {
  let total = 0
  for (const c of COUNTY_IDS) if (s.owner[c] === id) total += s.development[c]!
  return total
}

// --- rulers -----------------------------------------------------------------

export const ageOf = (r: Ruler, month: number) => Math.floor((month - r.born) / 12)

// n shifted by RULES.skillStep percent per point of skill away from 5, rounded down.
export const bySkill = (n: number, skill: number) => Math.floor((n * (100 + RULES.skillStep * (skill - 5))) / 100)

const skillRoll = (s: GameState) => randomInt(s, 6) + randomInt(s, 6)

// A new ruler of the given age range, born in a random month: a name and three skills,
// 0–10 and most often near 5. Health starts at 5.
export function newRuler(s: GameState, [youngest, oldest]: readonly [number, number]): Ruler {
  const name = NAMES[randomInt(s, NAMES.length)]!
  const age = youngest + randomInt(s, oldest - youngest + 1)
  const born = s.month - 12 * age - randomInt(s, 12)
  return { name, born, martial: skillRoll(s), stewardship: skillRoll(s), learning: skillRoll(s), health: 5 }
}

// The chance a ruler dies this month: it climbs with age, and poor health adds years.
export function deathChance(r: Ruler, month: number): number {
  const years = Math.max(0, ageOf(r, month) + RULES.healthYears * (5 - r.health) - RULES.frailFrom)
  return RULES.baseDeath + (years * years) / RULES.deathScale
}

// Each living house's ruler may die; a generated heir succeeds at once.
export function age(s: GameState) {
  for (const h of s.houses) {
    if (!alive(h) || random(s) >= deathChance(h.ruler, s.month)) continue
    const dead = h.ruler
    h.ruler = newRuler(s, RULES.heirAge)
    record(s, { kind: 'died', house: h.id, ruler: dead.name, age: ageOf(dead, s.month), heir: h.ruler.name })
  }
}

// Gold a month before upkeep: development, shifted by Stewardship.
export const income = (s: GameState, id: HouseId) => bySkill(developmentOf(s, id), house(s, id).ruler.stewardship)

// Gold to develop a county one level: cheaper with Learning.
export function developCost(s: GameState, id: HouseId, c: CountyId): number {
  const base = RULES.developCost * developmentAt(s, c)
  return Math.floor((base * (100 - RULES.skillStep * (house(s, id).ruler.learning - 5))) / 100)
}

// --- events -----------------------------------------------------------------

const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n))

// What a choice of the waiting event would do, in whole numbers: gold and levies scaled
// to the house's development (see events.ts).
export function outcome(s: GameState, effect: Effect) {
  const base = developmentOf(s, s.player!)
  return {
    gold: (effect.gold ?? 0) * base,
    levies: (effect.levies ?? 0) * base,
    development: effect.development ?? 0,
    martial: effect.martial ?? 0,
    stewardship: effect.stewardship ?? 0,
    learning: effect.learning ?? 0,
    health: effect.health ?? 0,
  }
}

// The next event for the player: any but the last one, in one of the player's counties.
function rollEvent(s: GameState) {
  const last = s.chronicle.findLast(e => e.kind === 'event')
  const ids = EVENTS.map(e => e.id).filter(id => last?.kind !== 'event' || id !== last.event)
  const held = holdings(s, s.player!)
  s.event = { id: ids[randomInt(s, ids.length)]!, county: held[randomInt(s, held.length)]! }
}

// When the player's event is due, it arrives and the next is set 18–30 months on.
export function arrive(s: GameState) {
  if (s.ending || s.player === null || s.month < s.nextEvent) return
  rollEvent(s)
  const [soonest, latest] = RULES.eventMonths
  s.nextEvent = s.month + soonest + randomInt(s, latest - soonest + 1)
}

export const maxLevy = (s: GameState, id: HouseId) => developmentOf(s, id) * RULES.menPerDevelopment
export const upkeep = (men: number) => Math.floor(men / RULES.menPerGold)

export function rank(s: GameState, id: HouseId): 'Count' | 'Duke' | 'King' {
  const held = holdings(s, id).length
  return held >= 15 ? 'King' : held >= 5 ? 'Duke' : 'Count'
}

export const warOf = (s: GameState, id: HouseId) => s.wars.find(w => w.attacker === id || w.defender === id)
export const otherSide = (w: War, id: HouseId) => (w.attacker === id ? w.defender : w.attacker)

export function enemyOf(s: GameState, id: HouseId): HouseId | null {
  const war = warOf(s, id)
  return war ? otherSide(war, id) : null
}

// Development taken from the other side minus development lost to it.
export function warScore(w: War, id: HouseId): number {
  return w.attacker === id ? w.taken[0] - w.taken[1] : w.taken[1] - w.taken[0]
}

export function truceBetween(s: GameState, a: HouseId, b: HouseId): boolean {
  return s.truces.some(t => t.houses.includes(a) && t.houses.includes(b))
}

export function borders(s: GameState, a: HouseId, b: HouseId): boolean {
  return holdings(s, a).some(c => county(c).neighbors.some(n => s.owner[n] === b))
}

// Where a house's army may go: its own counties, and its enemy's during a war.
export function allowed(s: GameState, id: HouseId, c: CountyId): boolean {
  const holder = ownerOf(s, c)
  return holder === id || holder === enemyOf(s, id)
}

export const crossing = (c: CountyId) => RULES.crossing[county(c).terrain]

export function siegeMonths(s: GameState, c: CountyId): number {
  const seat = s.houses.some(h => h.seat === c) ? RULES.seatSiege : 0
  return RULES.siege[county(c).terrain] + seat
}

// The quickest legal routes for a house's army from one county: months to reach every
// county (Infinity where it can't go) and the county each is entered from.
export function routes(s: GameState, id: HouseId, from: CountyId) {
  const enemy = enemyOf(s, id)
  const legal = (c: CountyId) => s.owner[c] === id || s.owner[c] === enemy
  const months: number[] = Array(s.owner.length).fill(Infinity)
  const previous: number[] = Array(s.owner.length).fill(0)
  const unvisited = COUNTY_IDS.filter(c => c !== from && legal(c))
  months[from] = 0
  for (let c: CountyId | undefined = from; c !== undefined;) {
    for (const n of county(c).neighbors) {
      const m = months[c]! + crossing(n)
      if (m < months[n]! && legal(n)) {
        months[n] = m
        previous[n] = c
      }
    }
    let nearest = 0
    for (let i = 1; i < unvisited.length; i++) if (months[unvisited[i]!]! < months[unvisited[nearest]!]!) nearest = i
    c = months[unvisited[nearest]!]! < Infinity ? unvisited.splice(nearest, 1)[0] : undefined
  }
  return { months, previous }
}

// The next county on the quickest legal route, or null if there is none.
export function nextStep(s: GameState, id: HouseId, from: CountyId, to: CountyId): CountyId | null {
  if (from === to || !allowed(s, id, to)) return null
  const { months, previous } = routes(s, id, from)
  if (months[to] === Infinity) return null
  let c = to
  while (previous[c] !== from) c = previous[c]!
  return c
}

// --- orders -----------------------------------------------------------------

export function record(s: GameState, happening: Happening) {
  s.chronicle.push({ month: s.month, ...happening })
}

function disband(h: House, maxLevies: number) {
  if (!h.army) return
  h.levies = Math.min(maxLevies, h.levies + h.army.men)
  h.army = null
}

// Whether a side takes an offered peace: computer houses do when they aren't winning or
// once the war has dragged on. The player decides for themselves.
export function acceptsPeace(s: GameState, w: War, id: HouseId): boolean {
  return warScore(w, id) <= 0 || s.month - w.since >= RULES.peaceMonths
}

function makePeace(s: GameState, w: War) {
  s.wars = s.wars.filter(other => other !== w)
  s.truces.push({ houses: [w.attacker, w.defender], until: s.month + RULES.truceMonths })
  for (const id of [w.attacker, w.defender]) disband(house(s, id), maxLevy(s, id))
  record(s, { kind: 'peace', house: w.attacker, other: w.defender })
}

// Carries out one order, or throws if it's illegal.
export function execute(s: GameState, order: Order) {
  need(!s.ending, 'The campaign is over')
  const h = house(s, order.house)
  need(alive(h), `${h.name} has fallen`)
  switch (order.kind) {
    case 'develop': {
      need(ownerOf(s, order.county) === h.id, 'A house develops only its own counties')
      const level = developmentAt(s, order.county)
      need(level < RULES.maxDevelopment, 'That county is fully developed')
      const cost = developCost(s, h.id, order.county)
      need(h.gold >= cost, 'Not enough gold')
      h.gold -= cost
      s.development[order.county] = level + 1
      return
    }
    case 'raise':
      need(!h.army, 'The army is already raised')
      need(h.levies >= RULES.minArmy, `An army needs at least ${RULES.minArmy} men`)
      need(ownerOf(s, order.county) === h.id, 'Levies muster only in the house\'s own counties')
      h.army = { men: h.levies, county: order.county, target: null, march: 0, siege: 0 }
      h.levies = 0
      return
    case 'disband':
      need(h.army, 'There is no army to disband')
      disband(h, maxLevy(s, h.id))
      return
    case 'move': {
      need(h.army, 'There is no army to move')
      const target = order.county === h.army.county ? null : order.county
      need(target === null || nextStep(s, h.id, h.army.county, target) !== null, 'The army can\'t reach that county')
      if (target !== h.army.target) h.army.march = 0
      h.army.target = target
      return
    }
    case 'declare': {
      const target = house(s, order.target)
      need(target.id !== h.id && alive(target), 'No such house to fight')
      need(!warOf(s, h.id) && !warOf(s, target.id), 'A house fights one war at a time')
      need(!truceBetween(s, h.id, target.id), 'A truce is in force')
      need(borders(s, h.id, target.id), 'A house declares war only on a neighbor')
      s.wars.push({ attacker: h.id, defender: target.id, since: s.month, taken: [0, 0], offer: null })
      record(s, { kind: 'war', house: h.id, other: target.id })
      return
    }
    case 'peace': {
      const war = warOf(s, h.id)
      need(war, 'There is no war to end')
      const other = otherSide(war, h.id)
      if (war.offer === other || (other !== s.player && acceptsPeace(s, war, other))) makePeace(s, war)
      else war.offer = h.id
      return
    }
    case 'choose': {
      need(s.event && h.id === s.player, 'No event awaits a choice')
      const { id, county: c } = s.event
      const choice = eventById(id).choices[order.choice]
      need(choice, 'No such choice')
      const o = outcome(s, choice.effect)
      need(h.gold + o.gold >= 0, 'Not enough gold')
      h.gold += o.gold
      s.development[c] = clamp(developmentAt(s, c) + o.development, 1, RULES.maxDevelopment)
      h.levies = clamp(h.levies + o.levies, 0, maxLevy(s, h.id))
      const r = h.ruler
      for (const skill of ['martial', 'stewardship', 'learning', 'health'] as const) r[skill] = clamp(r[skill] + o[skill], 0, RULES.maxSkill)
      record(s, { kind: 'event', house: h.id, ruler: r.name, event: id, choice: order.choice, county: c })
      s.event = null
      return
    }
  }
}

// --- the month ----------------------------------------------------------------

const hostileArmyAt = (s: GameState, id: HouseId, c: CountyId) => {
  const enemy = enemyOf(s, id)
  return enemy !== null && house(s, enemy).army?.county === c
}

// Armies advance along their routes. One that shares a county with a hostile army
// stays to fight. Returns the houses whose armies entered a new county.
export function march(s: GameState): Set<HouseId> {
  const moved = new Set<HouseId>()
  for (const h of s.houses) {
    const army = h.army
    if (!army || army.target === null || hostileArmyAt(s, h.id, army.county)) continue
    const next = nextStep(s, h.id, army.county, army.target)
    if (next === null) {
      army.target = null
      army.march = 0
      continue
    }
    army.march++
    if (army.march < crossing(next)) continue
    army.county = next
    army.march = 0
    army.siege = 0
    if (next === army.target) army.target = null
    moved.add(h.id)
  }
  return moved
}

// The loser falls back to the nearest county its house holds, if it can reach one.
function retreat(s: GameState, h: House, army: Army) {
  const { months } = routes(s, h.id, army.county)
  let best: CountyId | null = null
  for (const c of holdings(s, h.id)) {
    if (c !== army.county && months[c]! < (best === null ? Infinity : months[best]!)) best = c
  }
  if (best === null || army.men < RULES.minArmy) {
    h.army = null
    return
  }
  Object.assign(army, { county: best, target: null, march: 0, siege: 0 })
}

function battle(s: GameState, a: House, b: House) {
  const c = a.army!.county
  const strength = (h: House) => {
    const [low, high] = RULES.roll
    const terrain = ownerOf(s, c) === h.id ? RULES.defense[county(c).terrain] : 1
    const martial = (100 + RULES.skillStep * (h.ruler.martial - 5)) / 100
    return h.army!.men * (low + (high - low) * random(s)) * terrain * martial
  }
  const strengthA = strength(a)
  const strengthB = strength(b)
  const [winner, loser] = strengthA >= strengthB ? [a, b] : [b, a]
  const r = Math.max(strengthA, strengthB) / Math.min(strengthA, strengthB)
  const won = winner.army!
  const lost = loser.army!
  lost.men = Math.floor(lost.men * Math.max(0, 1 - RULES.loserLoss * r))
  won.men = Math.floor(won.men * (1 - RULES.winnerLoss / r))
  record(s, { kind: 'battle', house: winner.id, other: loser.id, county: c })
  if (won.men < RULES.minArmy) winner.army = null
  retreat(s, loser, lost)
}

// Hostile armies sharing a county fight once. Returns the houses that fought.
export function fight(s: GameState): Set<HouseId> {
  const fought = new Set<HouseId>()
  for (const h of s.houses) {
    const enemy = enemyOf(s, h.id)
    if (enemy === null || enemy < h.id) continue
    const other = house(s, enemy)
    if (!h.army || !other.army || h.army.county !== other.army.county) continue
    battle(s, h, other)
    fought.add(h.id).add(other.id)
  }
  return fought
}

function fall(s: GameState, h: House, by: House) {
  h.seat = null
  h.army = null
  h.levies = 0
  s.wars = s.wars.filter(w => w.attacker !== h.id && w.defender !== h.id)
  s.truces = s.truces.filter(t => !t.houses.includes(h.id))
  record(s, { kind: 'fell', house: h.id, other: by.id })
}

function capture(s: GameState, h: House, c: CountyId) {
  const loser = house(s, ownerOf(s, c))
  const war = warOf(s, h.id)!
  s.owner[c] = h.id
  war.taken[war.attacker === h.id ? 0 : 1] += developmentAt(s, c)
  record(s, { kind: 'taken', house: h.id, other: loser.id, county: c })
  const left = holdings(s, loser.id)
  if (!left.length) fall(s, loser, h)
  else if (loser.seat === c) loser.seat = left.reduce((best, next) => (developmentAt(s, next) > developmentAt(s, best) ? next : best))
}

// An army that stood alone in an enemy county all month, neither marching nor
// fighting, presses its siege, and takes the county once the siege is long enough.
export function besiege(s: GameState, moved: Set<HouseId>, fought: Set<HouseId>) {
  for (const h of s.houses) {
    const army = h.army
    if (!army) continue
    if (ownerOf(s, army.county) !== enemyOf(s, h.id)) {
      army.siege = 0
      continue
    }
    if (moved.has(h.id) || fought.has(h.id)) continue
    army.siege++
    if (army.siege < siegeMonths(s, army.county)) continue
    army.siege = 0
    capture(s, h, army.county)
  }
}

// Income, upkeep and levies. An army the house can't pay disbands.
export function collect(s: GameState) {
  for (const h of s.houses) {
    if (!alive(h)) continue
    const earned = income(s, h.id)
    const cost = h.army ? upkeep(h.army.men) : 0
    const most = maxLevy(s, h.id)
    if (h.gold + earned - cost < 0) {
      disband(h, most)
      h.gold += earned
    }
    else {
      h.gold += earned - cost
    }
    h.levies = Math.min(most, h.levies + Math.floor(most / RULES.refillMonths))
  }
}
