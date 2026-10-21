// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  COUNTY_IDS, EVENTS, RULES, ageOf, apply, county, developmentOf, maxLevy, newGame, nextStep, routes, step,
  type CountyId, type GameState, type Order,
} from '../app/utils/keystone/engine.ts'
import { armyBanners, armyRoute } from '../app/utils/keystone/display.ts'
import { countyById } from '../app/utils/realm/map-data.ts'
import { SAVE_KEY, SAVE_VERSION, loadCampaign, saveCampaign } from '../app/utils/keystone/save.ts'

const byName = (name: string) => COUNTY_IDS.find(c => county(c).name === name)!
const borders = (a: string, b: string) => county(byName(a)).neighbors.includes(byName(b))

// A waiting event gets the first choice when the house can afford it, else the second.
function answer(s: GameState) {
  if (!s.event) return s
  try {
    return apply(s, { kind: 'choose', house: s.player!, choice: 0 })
  }
  catch {
    return apply(s, { kind: 'choose', house: s.player!, choice: 1 })
  }
}

function play(s: GameState, months: number, each?: (s: GameState) => void) {
  for (let i = 0; i < months && !s.ending; i++) {
    s = step(answer(s))
    each?.(s)
  }
  return s
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const inner of Object.values(value)) deepFreeze(inner)
    Object.freeze(value)
  }
  return value
}

// Throws on the first broken rule. Plain checks, not expect(): this runs every month of
// many campaigns.
function checkInvariants(s: GameState) {
  const broken = (message: string) => {
    throw new Error(`Month ${s.month}: ${message}`)
  }
  const alive = new Set(s.houses.filter(h => h.seat !== null).map(h => h.id))
  for (const c of COUNTY_IDS) {
    if (!alive.has(s.owner[c]!)) broken(`${county(c).name} is held by house ${s.owner[c]}, which isn't standing`)
    const development = s.development[c]!
    if (development < 1 || development > RULES.maxDevelopment) broken(`${county(c).name} has development ${development}`)
  }
  const atWar = s.wars.flatMap(w => [w.attacker, w.defender])
  if (new Set(atWar).size !== atWar.length) broken('a house is in two wars')
  for (const w of s.wars) {
    if (!alive.has(w.attacker) || !alive.has(w.defender)) broken('a war with a fallen house')
    if (s.truces.some(t => t.houses.includes(w.attacker) && t.houses.includes(w.defender))) broken('a war between houses under truce')
  }
  for (const h of s.houses) {
    if (!Number.isInteger(h.gold) || h.gold < 0) broken(`${h.name} has ${h.gold} gold`)
    if (!Number.isInteger(h.levies) || h.levies < 0) broken(`${h.name} has ${h.levies} levies`)
    const r = h.ruler
    for (const n of [r.martial, r.stewardship, r.learning, r.health]) {
      if (!Number.isInteger(n) || n < 0 || n > 10) broken(`${h.name}'s ruler has a skill or health of ${n}`)
    }
    if (h.seat === null) {
      if (h.army) broken(`${h.name} fell but kept its army`)
      continue
    }
    if (ageOf(r, s.month) < RULES.heirAge[0]) broken(`${h.name}'s ruler is ${ageOf(r, s.month)}`)
    if (s.owner[h.seat] !== h.id) broken(`${h.name} doesn't hold its seat`)
    if (h.levies > maxLevy(s, h.id)) broken(`${h.name}'s levies overflow the pool`)
    if (!h.army) continue
    if (!Number.isInteger(h.army.men) || h.army.men < RULES.minArmy) broken(`${h.name}'s army has ${h.army.men} men`)
    const war = s.wars.find(w => w.attacker === h.id || w.defender === h.id)
    const enemy = war && (war.attacker === h.id ? war.defender : war.attacker)
    const holder = s.owner[h.army.county]
    if (holder !== h.id && holder !== enemy) broken(`${h.name}'s army is in ${county(h.army.county).name}, held by house ${holder}`)
  }
}

describe('the board', () => {
  it('has symmetric, connected adjacency', () => {
    expect(COUNTY_IDS).toHaveLength(67)
    for (const c of COUNTY_IDS) {
      const { neighbors } = county(c)
      expect(new Set(neighbors).size).toBe(neighbors.length)
      expect(neighbors).not.toContain(c)
      for (const n of neighbors) expect(county(n).neighbors, `${county(n).name} → ${county(c).name}`).toContain(c)
    }
    const reached = new Set([COUNTY_IDS[0]!])
    for (const c of reached) for (const n of county(c).neighbors) reached.add(n)
    expect(reached.size).toBe(67)
  })

  it('drops corner-only contacts and keeps the thin border', () => {
    expect(borders('Butler', 'Clarion')).toBe(true)
    for (const [a, b] of [['Butler', 'Westmoreland'], ['Allegheny', 'Armstrong'], ['Elk', 'Warren'], ['Forest', 'McKean'], ['Northumberland', 'Perry'], ['Dauphin', 'Juniata']]) {
      expect(borders(a!, b!), `${a}–${b}`).toBe(false)
    }
  })

  it('makes the big cities the prizes and the ridges hard going', () => {
    expect(county(byName('Philadelphia')).development).toBe(5)
    expect(county(byName('Allegheny')).development).toBe(5)
    expect(county(byName('Cameron')).development).toBe(1)
    expect(COUNTY_IDS.every(c => county(c).development >= 1 && county(c).development <= 5)).toBe(true)
    expect(county(byName('Philadelphia')).terrain).toBe('flat')
    for (const ridge of ['Huntingdon', 'Mifflin', 'Blair', 'Juniata']) expect(county(byName(ridge)).terrain).toBe('mountains')
  })
})

describe('a new campaign', () => {
  it('seats nine houses and divides every county among them', () => {
    const s = newGame(7, byName('Cameron'))
    expect(s.houses).toHaveLength(RULES.houses)
    expect(s.player).toBe(0)
    expect(s.houses[0]).toMatchObject({ seat: byName('Cameron'), name: 'House of Cameron' })
    for (const h of s.houses) expect(s.owner.filter(o => o === h.id).length).toBeGreaterThanOrEqual(3)
    checkInvariants(s)
  })
})

describe('the engine', () => {
  it('plays the same campaign from the same seed and orders', () => {
    const orders: Record<number, Order[]> = {
      0: [{ kind: 'raise', house: 0, county: byName('Philadelphia') }],
      3: [{ kind: 'disband', house: 0 }],
    }
    const run = () => {
      let s = newGame(42, byName('Philadelphia'))
      while (!s.ending) {
        for (const order of orders[s.month] ?? []) s = apply(s, order)
        s = step(answer(s))
      }
      return s
    }
    const first = run()
    expect(first.ending).not.toBeNull()
    expect(run()).toEqual(first)
    const computers = play(newGame(42, null), RULES.months)
    expect(computers.month).toBe(RULES.months)
    expect(play(newGame(42, null), RULES.months)).toEqual(computers)
    expect(play(newGame(43, null), RULES.months)).not.toEqual(computers)
  })

  it('keeps the rules every month', () => {
    for (let seed = 1; seed <= 40; seed++) play(newGame(seed, null), RULES.months, checkInvariants)
  }, 30_000)

  it('continues a saved campaign exactly as an uninterrupted one', () => {
    const halfway = play(newGame(11, null), 300)
    const loaded = JSON.parse(JSON.stringify(halfway)) as GameState
    expect(play(loaded, RULES.months)).toEqual(play(halfway, RULES.months))
  })

  it('never changes the state it is given', () => {
    let s = newGame(5, null)
    for (let i = 0; i < 120; i++) s = step(deepFreeze(s))
    expect(s.chronicle.length).toBeGreaterThan(0)
  })

  it('leaves the player\'s house to the player', () => {
    const s = play(newGame(3, byName('Allegheny')), 240)
    expect(s.chronicle.some(e => e.kind === 'war' && e.house === 0)).toBe(false)
    expect(s.houses[0]!.army).toBeNull()
  })
})

describe('rulers', () => {
  it('shift income, the cost to develop and battles by 4% a point from 5', () => {
    const s = newGame(8, byName('Lancaster'))
    const seat = s.houses[0]!.seat!
    const level = s.development[seat]!
    const ruled = (skills: Partial<GameState['houses'][number]['ruler']>, gold = 0) => ({
      ...s,
      event: null,
      houses: s.houses.map(h => (h.id === 0 ? { ...h, gold, ruler: { ...h.ruler, ...skills, health: 10 } } : h)),
    })
    // A Stewardship of 9 earns 16% more, rounded down; 2 earns 12% less.
    const development = developmentOf(s, 0)
    expect(step(ruled({ stewardship: 9 })).houses[0]!.gold).toBe(Math.floor((development * 116) / 100))
    expect(step(ruled({ stewardship: 2 })).houses[0]!.gold).toBe(Math.floor((development * 88) / 100))
    // A Learning of 10 develops for 80% of the price, and 0 for 120%.
    expect(apply(ruled({ learning: 10 }, 10_000), { kind: 'develop', house: 0, county: seat }).houses[0]!.gold).toBe(10_000 - 80 * level)
    expect(apply(ruled({ learning: 0 }, 10_000), { kind: 'develop', house: 0, county: seat }).houses[0]!.gold).toBe(10_000 - 120 * level)
    expect(() => apply(ruled({ learning: 0 }, 120 * level - 1), { kind: 'develop', house: 0, county: seat })).toThrow('Not enough gold')
  })

  it('wins more battles with more Martial', () => {
    // Two equal armies meet over and over; only the Martial of house 0's ruler differs.
    const wins = (martial: number) => {
      let won = 0
      for (let seed = 1; seed <= 300; seed++) {
        const s = newGame(seed, null)
        const war = s.houses.findIndex(h => h.id > 0 && s.owner.some((o, c) => o === h.id && county(c).neighbors.some(n => s.owner[n] === 0)))
        const field = COUNTY_IDS.find(c => s.owner[c] === 0 && county(c).terrain === 'flat') ?? s.houses[0]!.seat!
        const army = { men: 1000, county: field, target: null, march: 0, siege: 0 }
        const ready: GameState = {
          ...s,
          wars: [{ attacker: 0, defender: war, since: 0, taken: [0, 0], offer: null }],
          houses: s.houses.map(h => (h.id === 0 ? { ...h, army: { ...army }, ruler: { ...h.ruler, martial } } : h.id === war ? { ...h, army: { ...army }, ruler: { ...h.ruler, martial: 5 } } : h)),
        }
        const after = step(ready)
        if (after.chronicle.some(e => e.kind === 'battle' && e.house === 0)) won++
      }
      return won
    }
    // Owner's terrain bonus is ×1 on flat land, so 5 against 5 is a coin toss.
    expect(wins(10)).toBeGreaterThan(wins(5) + 40)
    expect(wins(0)).toBeLessThan(wins(5) - 40)
  })

  it('age, die and are succeeded by a generated heir while the house stands', () => {
    let s = newGame(13, byName('Erie'))
    const founder = s.houses[0]!.ruler
    s = { ...s, houses: s.houses.map(h => (h.id === 0 ? { ...h, ruler: { ...h.ruler, born: -12 * 80, health: 0 } } : h)) }
    expect(ageOf(s.houses[0]!.ruler, s.month)).toBe(80)
    // At 80 and in the worst health, the founder lasts months, not years.
    while (!s.chronicle.some(e => e.kind === 'died' && e.house === 0)) s = play(s, 1)
    expect(s.month).toBeLessThan(60)
    const { ruler } = s.houses[0]!
    expect(s.chronicle.findLast(e => e.kind === 'died' && e.house === 0)).toMatchObject({ month: s.month - 1, ruler: founder.name, heir: ruler.name })
    expect(s.houses[0]!.name).toBe('House of Erie')
    expect(ageOf(ruler, s.month)).toBeGreaterThanOrEqual(RULES.heirAge[0])
    expect(ageOf(ruler, s.month)).toBeLessThanOrEqual(RULES.heirAge[1])
    expect(ruler.health).toBe(5)
    const fallen = play(newGame(4, null), RULES.months)
    const gone = fallen.chronicle.filter(e => e.kind === 'fell')
    for (const e of gone) expect(fallen.chronicle.some(d => d.kind === 'died' && d.house === e.house && d.month > e.month)).toBe(false)
  })
})

describe('events', () => {
  it('reach the player every 18 to 30 months and hold the months until chosen', () => {
    let s = newGame(17, byName('Philadelphia'))
    const arrivals: number[] = []
    while (s.month < 240 && !s.ending) {
      s = step(s)
      if (!s.event) continue
      arrivals.push(s.month)
      expect(() => step(s)).toThrow('An event awaits')
      expect(() => apply(s, { kind: 'choose', house: 1, choice: 1 })).toThrow()
      s = answer(s)
      expect(s.event).toBeNull()
    }
    expect(arrivals.length).toBeGreaterThanOrEqual(3)
    expect(arrivals[0]).toBeGreaterThanOrEqual(18)
    expect(arrivals[0]).toBeLessThanOrEqual(30)
    for (let i = 1; i < arrivals.length; i++) {
      expect(arrivals[i]! - arrivals[i - 1]!).toBeGreaterThanOrEqual(18)
      expect(arrivals[i]! - arrivals[i - 1]!).toBeLessThanOrEqual(30)
    }
    expect(s.chronicle.filter(e => e.kind === 'event')).toHaveLength(arrivals.length)
    expect(play(newGame(17, null), 240).event).toBeNull()
  })

  it('change only gold, levies, development, skills and health, within bounds', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(12)
    const base = newGame(23, byName('Philadelphia'))
    const c = base.houses[0]!.seat!
    for (const event of EVENTS) {
      expect(event.choices[1].effect.gold ?? 0, `${event.id} has a free second choice`).toBeGreaterThanOrEqual(0)
      for (const choice of [0, 1]) {
        const s: GameState = {
          ...base,
          event: { id: event.id, county: c },
          houses: base.houses.map(h => (h.id === 0 ? { ...h, gold: 1000, levies: 500, ruler: { ...h.ruler, martial: 10, stewardship: 0, health: 1 } } : h)),
        }
        const after = apply(s, { kind: 'choose', house: 0, choice })
        const effect = event.choices[choice]!.effect
        const dev = developmentOf(s, 0)
        const [was, now] = [s.houses[0]!, after.houses[0]!]
        expect(now.gold, event.id).toBe(1000 + (effect.gold ?? 0) * dev)
        expect(now.levies).toBe(Math.min(maxLevy(after, 0), Math.max(0, 500 + (effect.levies ?? 0) * dev)))
        expect(after.development[c]).toBe(Math.min(10, Math.max(1, s.development[c]! + (effect.development ?? 0))))
        expect(now.ruler.martial).toBe(10)
        expect(now.ruler.stewardship).toBe(Math.max(0, (effect.stewardship ?? 0)))
        expect(now.ruler.learning).toBe(was.ruler.learning + (effect.learning ?? 0))
        expect(now.ruler.health).toBe(Math.max(0, 1 + (effect.health ?? 0)))
        const { event: _e, houses: _h, development: _d, chronicle: _c, ...rest } = after
        const { event: _e2, houses: _h2, development: _d2, chronicle: _c2, ...restBefore } = s
        expect(rest).toEqual(restBefore)
        expect(after.chronicle.at(-1)).toMatchObject({ kind: 'event', house: 0, event: event.id, choice, county: c })
      }
    }
    const broke: GameState = { ...base, event: { id: 'winter', county: c } }
    expect(() => apply(broke, { kind: 'choose', house: 0, choice: 0 })).toThrow('Not enough gold')
    expect(apply(broke, { kind: 'choose', house: 0, choice: 1 }).event).toBeNull()
  })
})

describe('orders', () => {
  // A player house, an enemy that borders it, and a flat enemy county (not a seat) next
  // to a county the player holds.
  function frontier() {
    for (let seed = 1; ; seed++) {
      const s = newGame(seed, byName('Lancaster'))
      for (const c of COUNTY_IDS) {
        const enemy = s.owner[c]!
        if (enemy === 0 || county(c).terrain !== 'flat' || s.houses.some(h => h.seat === c)) continue
        const from = county(c).neighbors.find(n => s.owner[n] === 0)
        if (from !== undefined) return { s, enemy, from, target: c as CountyId }
      }
    }
  }

  it('refuses illegal orders', () => {
    const { s, enemy } = frontier()
    const far = COUNTY_IDS.find(c => s.owner[c] !== 0)!
    expect(() => apply(s, { kind: 'develop', house: 0, county: far })).toThrow()
    expect(() => apply(s, { kind: 'develop', house: 0, county: s.houses[0]!.seat! })).toThrow('Not enough gold')
    expect(() => apply(s, { kind: 'raise', house: 0, county: far })).toThrow()
    expect(() => apply(s, { kind: 'move', house: 0, county: far })).toThrow()
    expect(() => apply(s, { kind: 'peace', house: 0 })).toThrow()
    const raised = apply(s, { kind: 'raise', house: 0, county: s.houses[0]!.seat! })
    expect(() => apply(raised, { kind: 'move', house: 0, county: far })).toThrow('can\'t reach')
    const atWar = apply(s, { kind: 'declare', house: 0, target: enemy })
    expect(() => apply(atWar, { kind: 'declare', house: 0, target: enemy })).toThrow('one war at a time')
  })

  it('marches, besieges and takes a flat county in three months', () => {
    const { s: start, enemy, from, target } = frontier()
    let s = { ...start, houses: start.houses.map(h => (h.id === enemy ? { ...h, levies: 0 } : h)) }
    s = apply(s, { kind: 'declare', house: 0, target: enemy })
    s = apply(s, { kind: 'raise', house: 0, county: from })
    s = apply(s, { kind: 'move', house: 0, county: target })
    s = step(s)
    expect(s.houses[0]!.army?.county).toBe(target)
    s = step(s)
    expect(s.owner[target]).toBe(enemy)
    s = step(s)
    expect(s.owner[target]).toBe(0)
    expect(s.wars.find(w => w.attacker === 0)!.taken).toEqual([s.development[target], 0])
    expect(s.chronicle).toContainEqual({ month: 2, kind: 'taken', house: 0, other: enemy, county: target })
  })
})

describe('saves', () => {
  const memory = () => {
    const items = new Map<string, string>()
    return { getItem: (k: string) => items.get(k) ?? null, setItem: (k: string, v: string) => void items.set(k, v) }
  }

  it('continues a loaded campaign exactly as an uninterrupted one, dice included', () => {
    let s = newGame(21, byName('Erie'))
    s = apply(s, { kind: 'raise', house: 0, county: byName('Erie') })
    s = play(s, 137)
    const store = memory()
    expect(saveCampaign(s, store)).toBe(true)
    const loaded = loadCampaign(store)
    expect(loaded.kind).toBe('saved')
    if (loaded.kind !== 'saved') return
    expect(loaded.state.rng).toBe(s.rng)
    expect(play(loaded.state, RULES.months)).toEqual(play(s, RULES.months))
  })

  it('keeps a waiting event through a save and a reload', () => {
    let s = newGame(31, byName('York'))
    while (!s.event) s = step(s)
    const store = memory()
    saveCampaign(s, store)
    const loaded = loadCampaign(store)
    expect(loaded.kind === 'saved' && loaded.state.event).toEqual(s.event)
    if (loaded.kind !== 'saved') return
    expect(() => step(loaded.state)).toThrow('An event awaits')
    expect(play(loaded.state, RULES.months)).toEqual(play(s, RULES.months))
  })

  it('reports older saves and shrugs off broken or missing storage', () => {
    const store = memory()
    expect(loadCampaign(store)).toEqual({ kind: 'none' })
    store.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION - 1, savedAt: 0, state: {} }))
    expect(loadCampaign(store)).toEqual({ kind: 'old' })
    for (const junk of ['{', 'null', '42', JSON.stringify({ version: SAVE_VERSION, state: { month: 3 } })]) {
      store.setItem(SAVE_KEY, junk)
      expect(loadCampaign(store), junk).toEqual({ kind: 'none' })
    }
    const refusing = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('full') } }
    expect(loadCampaign(refusing)).toEqual({ kind: 'none' })
    expect(saveCampaign(newGame(1, null), refusing)).toBe(false)
    expect(loadCampaign(null)).toEqual({ kind: 'none' })
    expect(saveCampaign(newGame(1, null), null)).toBe(false)
  })
})

describe('the map', () => {
  // The player's army on its longest legal march: at war with a neighbor, raised in one
  // of its own counties and sent to the enemy county farthest away.
  function longMarch() {
    const s = newGame(12345, byName('Centre'))
    let best: { s: GameState, target: CountyId, months: number } | null = null
    for (const enemy of s.houses.slice(1)) {
      let atWar: GameState
      try {
        atWar = apply(s, { kind: 'declare', house: 0, target: enemy.id })
      }
      catch {
        continue
      }
      for (const from of COUNTY_IDS.filter(c => atWar.owner[c] === 0)) {
        const { months } = routes(atWar, 0, from)
        for (const c of COUNTY_IDS.filter(c => atWar.owner[c] === enemy.id && months[c]! < Infinity)) {
          if (!best || months[c]! > best.months) best = { s: apply(atWar, { kind: 'raise', house: 0, county: from }), target: c, months: months[c]! }
        }
      }
    }
    return apply(best!.s, { kind: 'move', house: 0, county: best!.target })
  }

  const label = (c: CountyId) => countyById(c)!.label
  const distance = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!)

  it('walks armies toward the next county but keeps them on their own side until they enter', () => {
    let s = longMarch()
    let midway = 0
    for (let month = 0; month < 12 && s.houses[0]!.army?.target != null; month++) {
      for (const h of s.houses) {
        if (!h.army) continue
        const banner = armyBanners(s).find(b => b.id === `army-${h.id}`)!
        const next = h.army.target === null ? null : nextStep(s, h.id, h.army.county, h.army.target)
        if (next === null || !h.army.march) continue
        midway++
        expect(distance(banner.at, label(h.army.county))).toBeLessThan(distance(banner.at, label(next)))
        expect(distance(banner.at, label(h.army.county))).toBeGreaterThan(0)
      }
      s = step(answer(s))
    }
    // Some month caught an army partway across a mountain county.
    expect(midway).toBeGreaterThan(0)
  })

  it('draws the player\'s march county by county to its target', () => {
    const s = step(longMarch())
    const army = s.houses[0]!.army!
    const route = armyRoute(s)!
    const byLabel = new Map(COUNTY_IDS.map(c => [label(c).join(), c]))
    const path = route.at.map(at => byLabel.get(at.join())!)
    expect(path[0]).toBe(army.county)
    expect(path.at(-1)).toBe(army.target)
    for (let i = 1; i < path.length; i++) expect(county(path[i - 1]!).neighbors).toContain(path[i])
    expect(route.follow).toBe('army-0')
    expect(armyRoute(apply(s, { kind: 'move', house: 0, county: army.county }))).toBeNull()
  })
})
