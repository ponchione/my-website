// The one saved campaign: `{ version, savedAt, state }` under `keystone.campaign` in the
// browser's localStorage. The state carries the RNG's position, so a loaded campaign
// rolls the same dice it would have. Saves are never migrated: when a rules change makes
// old ones meaningless, SAVE_VERSION goes up and an older save is only reported.

import { COUNTY_IDS, RULES, type GameState } from './engine.ts'

export const SAVE_KEY = 'keystone.campaign'
// 2: rulers and events (phase 4).
export const SAVE_VERSION = 2

type Store = Pick<Storage, 'getItem' | 'setItem'>

export type Saved =
  | { kind: 'none' }
  | { kind: 'old' }
  | { kind: 'saved', savedAt: number, state: GameState }

// localStorage, or null where the browser refuses it (private modes, blocked storage).
function local(): Store | null {
  try {
    return window.localStorage
  }
  catch {
    return null
  }
}

const isInt = (n: unknown) => Number.isInteger(n)

// Enough of a GameState's shape that the page can show it and the engine can step it.
function looksLikeState(s: unknown): s is GameState {
  if (!s || typeof s !== 'object') return false
  const g = s as Record<string, unknown>
  return isInt(g.seed) && isInt(g.rng) && isInt(g.month) && (g.player === null || isInt(g.player))
    && Array.isArray(g.owner) && g.owner.length === COUNTY_IDS.length + 1
    && Array.isArray(g.development) && g.development.length === COUNTY_IDS.length + 1
    && Array.isArray(g.houses) && g.houses.length === RULES.houses
    && g.houses.every(h => !!h && typeof h === 'object' && !!h.ruler && typeof h.ruler === 'object')
    && isInt(g.nextEvent) && (g.event === null || (!!g.event && typeof g.event === 'object'))
    && Array.isArray(g.wars) && Array.isArray(g.truces) && Array.isArray(g.chronicle)
    && (g.ending === null || typeof g.ending === 'object')
}

// What's saved. Anything unreadable counts as nothing, and the next save replaces it.
export function loadCampaign(store: Store | null = local()): Saved {
  try {
    const raw = store?.getItem(SAVE_KEY)
    if (!raw) return { kind: 'none' }
    const save = JSON.parse(raw) as { version?: unknown, savedAt?: unknown, state?: unknown }
    if (typeof save?.version !== 'number') return { kind: 'none' }
    if (save.version !== SAVE_VERSION) return { kind: 'old' }
    if (!looksLikeState(save.state)) return { kind: 'none' }
    return { kind: 'saved', savedAt: Number(save.savedAt) || 0, state: save.state }
  }
  catch {
    return { kind: 'none' }
  }
}

// Saves the campaign, replacing the last one. Returns false if the browser wouldn't keep
// it (no storage, or it's full); the campaign plays on either way.
export function saveCampaign(state: GameState, store: Store | null = local()): boolean {
  try {
    if (!store) return false
    store.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, savedAt: Date.now(), state }))
    return true
  }
  catch {
    return false
  }
}
