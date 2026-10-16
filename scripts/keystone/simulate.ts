// The balance harness: plays computer-only campaigns and checks them against the targets
// in KEYSTONE_SPEC.md.
//
//   node scripts/keystone/simulate.ts --games 500 [--seed 1]

import { parseArgs } from 'node:util'
import { RULES, newGame, step, type GameState } from '../../app/utils/keystone/engine.ts'

const { values } = parseArgs({ options: { games: { type: 'string', default: '500' }, seed: { type: 'string', default: '1' } } })
const games = Number(values.games)
const firstSeed = Number(values.seed)

type Result = { united: number | null, survivors: number, warMonths: number, months: number, wars: number, battles: number, taken: number, ms: number, startSizes: number[] }

function play(seed: number): Result {
  const started = performance.now()
  let s: GameState = newGame(seed, null)
  const startSizes = s.houses.map(h => s.owner.filter(o => o === h.id).length)
  let warMonths = 0
  while (!s.ending) {
    s = step(s)
    if (s.wars.length) warMonths++
  }
  const ms = performance.now() - started
  const count = (kind: string) => s.chronicle.filter(e => e.kind === kind).length
  return {
    united: s.ending.kind === 'united' ? s.ending.month : null,
    survivors: s.houses.filter(h => h.seat !== null).length,
    warMonths,
    months: s.month,
    wars: count('war'),
    battles: count('battle'),
    taken: count('taken'),
    ms,
    startSizes,
  }
}

const results: Result[] = []
for (let seed = firstSeed; seed < firstSeed + games; seed++) results.push(play(seed))

const sorted = (values: number[]) => [...values].sort((a, b) => a - b)
const quantile = (values: number[], q: number) => sorted(values)[Math.min(values.length - 1, Math.floor(q * values.length))]!
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)
const percent = (part: number, whole: number) => `${((100 * part) / whole).toFixed(1)}%`
const year = (month: number) => RULES.startYear + Math.floor(month / 12)
const check = (ok: boolean) => (ok ? 'ok' : 'MISSED')

const united = results.filter(r => r.united !== null).map(r => r.united!)
const notUnited = results.length - united.length
const survivors = results.map(r => r.survivors)
const decades = sum(results.map(r => r.months)) / 120
const warShare = sum(results.map(r => r.warMonths)) / sum(results.map(r => r.months))
const full = results.filter(r => r.months === RULES.months).map(r => r.ms)
const starts = results.flatMap(r => r.startSizes)

console.log(`${results.length} computer-only campaigns, seeds ${firstSeed}–${firstSeed + games - 1}\n`)
console.log(`Not united by ${year(RULES.months)}:  ${percent(notUnited, results.length)}  (target ≥ 80%)  ${check(notUnited >= 0.8 * results.length)}`)
if (united.length) console.log(`  united in ${year(quantile(united, 0.5))} at the median, ${year(Math.min(...united))} at the earliest`)
console.log(`Houses alive at the end:  median ${quantile(survivors, 0.5)}, 10th–90th percentile ${quantile(survivors, 0.1)}–${quantile(survivors, 0.9)}  (target median ≥ 3)  ${check(quantile(survivors, 0.5) >= 3)}`)
console.log(`Months with a war on:  ${percent(warShare, 1)}  (target most of the time, > 50%)  ${check(warShare > 0.5)}`)
console.log(`Per decade:  ${(sum(results.map(r => r.wars)) / decades).toFixed(1)} wars, ${(sum(results.map(r => r.battles)) / decades).toFixed(1)} battles, ${(sum(results.map(r => r.taken)) / decades).toFixed(1)} counties taken`)
console.log(`Starting counties per house:  ${Math.min(...starts)}–${Math.max(...starts)}, median ${quantile(starts, 0.5)}`)
if (full.length) console.log(`Run time for ${RULES.months} months:  median ${quantile(full, 0.5).toFixed(1)} ms, slowest ${Math.max(...full).toFixed(1)} ms  (target < 200 ms)  ${check(Math.max(...full) < 200)}`)
