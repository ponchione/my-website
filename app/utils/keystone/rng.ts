// Mulberry32: a small seeded generator whose whole state is one 32-bit integer. The game
// state keeps it, so a saved campaign rolls the same dice when it resumes. Integer
// operations only, so every browser gets the same numbers.

export type Seeded = { rng: number }

// A number in [0, 1).
export function random(s: Seeded): number {
  s.rng = (s.rng + 0x6D2B79F5) | 0
  let t = s.rng
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

// An integer in [0, n).
export function randomInt(s: Seeded, n: number): number {
  return Math.floor(random(s) * n)
}

export function pick<T>(s: Seeded, list: readonly T[]): T {
  return list[randomInt(s, list.length)]!
}
