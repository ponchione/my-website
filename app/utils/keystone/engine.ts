// Keystone's engine: a campaign is a GameState, changed only by apply (one order) and
// step (one month). Plain TypeScript with no Vue, DOM, Math.random or Date, so the
// same seed and orders play out the same everywhere, in the browser or in Node.

import { computerTurn } from './ai.ts'
import { COUNTY_IDS, county, hops, type CountyId } from './board.ts'
import { pick, randomInt, type Seeded } from './rng.ts'
import {
  RULES, age, alive, arrive, besiege, collect, developmentOf, execute, fight, house, march, need, newRuler,
  type GameState, type HouseId, type Order,
} from './rules.ts'

export { COUNTY_IDS, county, type County, type CountyId, type Terrain } from './board.ts'
export {
  RULES, ageOf, deathChance, developCost, developmentOf, holdings, income, maxLevy, outcome, rank, siegeMonths, upkeep, warOf, warScore,
  type Army, type Ending, type Entry, type GameState, type House, type HouseId, type Order, type Ruler, type War,
} from './rules.ts'
export { EVENTS, eventById, type Choice, type Effect, type KeystoneEvent } from './events.ts'
export { AI } from './ai.ts'

// A house is named for the county it was founded in.
export const houseName = (seat: CountyId) => `House of ${county(seat).name}`

// Spreads the seats across the state, each as far as it can be from those before it,
// with the first at `start`. Then each house in turn takes the free county nearest its
// seat that borders its land, until every county is held. `claims` is that order,
// seats first.
export function found(rng: Seeded, start: CountyId | null) {
  const seats = [start ?? pick(rng, COUNTY_IDS)]
  while (seats.length < RULES.houses) {
    const distance = hops(seats)
    const farthest = Math.max(...COUNTY_IDS.map(c => distance[c]!))
    seats.push(pick(rng, COUNTY_IDS.filter(c => distance[c] === farthest)))
  }
  const owner: HouseId[] = Array(COUNTY_IDS.length + 1).fill(-1)
  const claims = seats.map((seat, id) => ({ house: id, county: seat }))
  seats.forEach((seat, id) => (owner[seat] = id))
  const fromSeat = seats.map(seat => hops([seat]))
  while (claims.length < COUNTY_IDS.length) {
    for (let id = 0; id < seats.length; id++) {
      const open = COUNTY_IDS.filter(c => owner[c] === -1 && county(c).neighbors.some(n => owner[n] === id))
      if (!open.length) continue
      const nearest = Math.min(...open.map(c => fromSeat[id]![c]!))
      const c = pick(rng, open.filter(c => fromSeat[id]![c] === nearest))
      owner[c] = id
      claims.push({ house: id, county: c })
    }
  }
  return { seats, owner, claims }
}

// A new campaign. With a start county the player is house 0, seated there; with null
// every house is a computer house.
export function newGame(seed: number, start: CountyId | null): GameState {
  need(Number.isInteger(seed), 'The seed must be an integer')
  need(start === null || COUNTY_IDS.includes(start), `No county ${start}`)
  const rng = { rng: seed | 0 }
  const { seats, owner } = found(rng, start)
  const development = Array(owner.length).fill(0)
  for (const c of COUNTY_IDS) development[c] = county(c).development
  const s: GameState = {
    seed,
    rng: rng.rng,
    month: 0,
    player: start === null ? null : 0,
    owner,
    development,
    houses: [],
    wars: [],
    truces: [],
    chronicle: [],
    ending: null,
    event: null,
    nextEvent: 0,
  }
  for (const [id, seat] of seats.entries()) {
    const ruler = newRuler(s, RULES.rulerAge)
    s.houses.push({ id, name: houseName(seat), seat, gold: RULES.startGold, levies: 0, army: null, ruler })
  }
  for (const h of s.houses) h.levies = developmentOf(s, h.id) * RULES.menPerDevelopment
  const [soonest, latest] = RULES.eventMonths
  s.nextEvent = soonest + randomInt(s, latest - soonest + 1)
  return s
}

// A copy deep enough that nothing the rules change is shared. Chronicle entries are
// never changed once written, so they're shared.
function copy(s: GameState): GameState {
  return {
    ...s,
    owner: [...s.owner],
    development: [...s.development],
    houses: s.houses.map(h => ({ ...h, army: h.army && { ...h.army }, ruler: { ...h.ruler } })),
    wars: s.wars.map(w => ({ ...w, taken: [...w.taken] })),
    truces: s.truces.map(t => ({ ...t, houses: [...t.houses] })),
    chronicle: [...s.chronicle],
  }
}

// One order, at once. Throws if it's illegal.
export function apply(state: GameState, order: Order): GameState {
  const s = copy(state)
  execute(s, order)
  return s
}

// One month: the computer houses' orders, then movement, battles, sieges, gold and
// levies, and the rulers' deaths. The player's next event may arrive. A waiting event
// holds the months back until the player chooses.
export function step(state: GameState): GameState {
  need(!state.ending, 'The campaign is over')
  need(!state.event, 'An event awaits a choice')
  const s = copy(state)
  for (const h of s.houses) {
    if (alive(h) && h.id !== s.player) computerTurn(s, h, order => execute(s, order))
  }
  const moved = march(s)
  const fought = fight(s)
  besiege(s, moved, fought)
  collect(s)
  age(s)
  s.month++
  s.truces = s.truces.filter(t => t.until > s.month)
  const survivors = s.houses.filter(alive)
  if (s.player !== null && !alive(house(s, s.player))) s.ending = { month: s.month, kind: 'fallen', house: s.player }
  else if (survivors.length === 1) s.ending = { month: s.month, kind: 'united', house: survivors[0]!.id }
  else if (s.month >= RULES.months) s.ending = { month: s.month, kind: 'time', house: null }
  arrive(s)
  return s
}

// The final score: your share of Pennsylvania's development, in percent, plus 10 for
// every surviving house you outrank.
export function score(s: GameState, id: HouseId): number {
  const total = s.development.reduce((sum, d) => sum + d, 0)
  const mine = developmentOf(s, id)
  const outranked = s.houses.filter(h => alive(h) && h.id !== id && developmentOf(s, h.id) < mine).length
  return Math.round((100 * mine) / total) + 10 * outranked
}

// "1 March 1203" for a month index.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const dateOf = (month: number) => `1 ${MONTHS[month % 12]} ${RULES.startYear + Math.floor(month / 12)}`
