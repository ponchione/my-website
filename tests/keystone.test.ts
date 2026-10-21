// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  COUNTY_IDS, RULES, apply, county, maxLevy, newGame, step,
  type CountyId, type GameState, type Order,
} from '../app/utils/keystone/engine.ts'
import { SAVE_KEY, SAVE_VERSION, loadCampaign, saveCampaign } from '../app/utils/keystone/save.ts'

const byName = (name: string) => COUNTY_IDS.find(c => county(c).name === name)!
const borders = (a: string, b: string) => county(byName(a)).neighbors.includes(byName(b))

function play(s: GameState, months: number, each?: (s: GameState) => void) {
  for (let i = 0; i < months && !s.ending; i++) {
    s = step(s)
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
    if (h.seat === null) {
      if (h.army) broken(`${h.name} fell but kept its army`)
      continue
    }
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
        s = step(s)
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
