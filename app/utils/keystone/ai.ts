// The computer houses. Each month every one works through the same short list from
// KEYSTONE_SPEC.md and gives orders through the same rules as the player.

import { COUNTY_IDS, county, hops, type CountyId } from './board.ts'
import { randomInt } from './rng.ts'
import {
  RULES, alive, borders, developCost, developmentAt, holdings, house, maxLevy, otherSide, ownerOf,
  routes, siegeMonths, truceBetween, upkeep, warOf, warScore,
  type GameState, type House, type Order, type War,
} from './rules.ts'

// The computer houses' weights. KEYSTONE_SPEC.md quotes these; tune them with
// scripts/keystone/simulate.ts.
export const AI = {
  warChance: 12, // a house at peace looks for a war in 1 month of this many
  reserveMonths: 6, // months of full-army upkeep it keeps in hand
  edge: 1.1, // how much stronger an army must be to attack, or weaker to fall back
  fallbackReach: 2, // how close to the enemy army it falls back, in counties
  raiseShare: 0.25, // at war it raises its levies once the pool is this full
}

type Issue = (order: Order) => void

export function computerTurn(s: GameState, h: House, issue: Issue) {
  const reserve = AI.reserveMonths * upkeep(maxLevy(s, h.id))
  const cheapest = holdings(s, h.id)
    .filter(c => developmentAt(s, c) < RULES.maxDevelopment)
    .reduce<CountyId | null>((best, c) => (best === null || developmentAt(s, c) < developmentAt(s, best) ? c : best), null)
  if (cheapest !== null && h.gold >= developCost(s, h.id, cheapest) + reserve) {
    issue({ kind: 'develop', house: h.id, county: cheapest })
  }
  const war = warOf(s, h.id)
  if (war) atWar(s, h, war, issue)
  else atPeace(s, h, reserve, issue)
}

function atPeace(s: GameState, h: House, reserve: number, issue: Issue) {
  if (h.army) issue({ kind: 'disband', house: h.id })
  if (randomInt(s, AI.warChance) !== 0 || h.gold < reserve) return
  const weakest = s.houses
    .filter(t => t.id !== h.id && alive(t) && !warOf(s, t.id) && !truceBetween(s, h.id, t.id) && borders(s, h.id, t.id))
    .reduce<House | null>((best, t) => (best === null || maxLevy(s, t.id) < maxLevy(s, best.id) ? t : best), null)
  if (weakest && maxLevy(s, h.id) >= maxLevy(s, weakest.id)) issue({ kind: 'declare', house: h.id, target: weakest.id })
}

function atWar(s: GameState, h: House, war: War, issue: Issue) {
  const enemy = house(s, otherSide(war, h.id))
  const losing = warScore(war, h.id) < 0 && !h.army
  if (war.offer !== h.id && (losing || s.month - war.since >= RULES.peaceMonths)) {
    issue({ kind: 'peace', house: h.id })
    if (!warOf(s, h.id)) return
  }
  if (!h.army) {
    if (h.levies < Math.max(RULES.minArmy, AI.raiseShare * maxLevy(s, h.id))) return
    issue({ kind: 'raise', house: h.id, county: musterAt(s, h, enemy) })
  }
  const army = h.army!
  const theirs = enemy.army
  const { months } = routes(s, h.id, army.county)
  let goal: CountyId | null
  if (theirs && months[theirs.county] !== Infinity && army.men >= AI.edge * theirs.men) goal = theirs.county
  else if (theirs && theirs.men >= AI.edge * army.men) goal = fallBack(s, h, theirs.county, months)
  else if (ownerOf(s, army.county) === enemy.id) goal = army.county
  else goal = siegeTarget(s, enemy, months)
  if (goal !== null && goal !== (army.target ?? army.county)) issue({ kind: 'move', house: h.id, county: goal })
}

// The most developed county the house holds on the enemy's border, without the enemy's
// army in it; the seat if there's none.
function musterAt(s: GameState, h: House, enemy: House): CountyId {
  let best = h.seat!
  let bestDevelopment = 0
  for (const c of holdings(s, h.id)) {
    if (enemy.army?.county === c || !county(c).neighbors.some(n => ownerOf(s, n) === enemy.id)) continue
    if (developmentAt(s, c) > bestDevelopment) {
      best = c
      bestDevelopment = developmentAt(s, c)
    }
  }
  return best
}

// The best defensive county the house holds near the enemy army, nearest first.
function fallBack(s: GameState, h: House, enemyAt: CountyId, months: number[]): CountyId | null {
  const near = hops([enemyAt])
  let best: CountyId | null = null
  const better = (c: CountyId, than: CountyId) => {
    const defense = RULES.defense[county(c).terrain] - RULES.defense[county(than).terrain]
    return defense > 0 || (defense === 0 && months[c]! < months[than]!)
  }
  for (const c of holdings(s, h.id)) {
    if (c === enemyAt || months[c] === Infinity || near[c]! > AI.fallbackReach) continue
    if (best === null || better(c, best)) best = c
  }
  return best
}

// The enemy county with the most development per month of marching and siege.
function siegeTarget(s: GameState, enemy: House, months: number[]): CountyId | null {
  let best: CountyId | null = null
  let bestDevelopment = 0
  let bestMonths = 1
  for (const c of COUNTY_IDS) {
    if (ownerOf(s, c) !== enemy.id || months[c] === Infinity) continue
    const development = developmentAt(s, c)
    const time = months[c]! + siegeMonths(s, c)
    if (best === null || development * bestMonths > bestDevelopment * time) {
      best = c
      bestDevelopment = development
      bestMonths = time
    }
  }
  return best
}
