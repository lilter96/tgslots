import { Array1 } from '@tgslots/math/functional/array1'
import { Sampler, SamplingPlan } from '@tgslots/math/probability'
import type { Rng } from '@tgslots/math/rng/types'
import { evaluateSpin } from '@tgslots/slots-core/paylines/evaluator'
import { PrecomputedScatterEngine } from '@tgslots/slots-core/scatter/precomputed-engine'
import { engine } from './engine.js'
import {
  BET,
  INNER_WEIGHTS,
  PICK_BONUS_VALUES,
  SCATTER_PAY,
  STRIP_STRINGS,
  Symbols,
} from './constants.js'

// COIN is never a REPLACEMENT symbol, so scatter positions are invariant across
// all resolved strip variants — precompute once from the raw string strips.
const _scatterStrips = STRIP_STRINGS.map((stripStr) => {
  const n = stripStr.length
  const arr = new Uint8Array(n + 2)
  for (let i = 0; i < n; i++) arr[i] = Symbols[stripStr[i] as keyof typeof Symbols]!
  arr[n] = arr[0]!
  arr[n + 1] = arr[1]!
  return arr
})
const scatterEngine = new PrecomputedScatterEngine(
  { symbolId: Symbols.COIN!, payouts: [...SCATTER_PAY] },
  _scatterStrips,
  3,
)

function evaluateWithScatter(
  strips: readonly Uint8Array[],
  positions: readonly number[],
): { win: number; sc: number } {
  const gridSyms: number[][] = [[], [], [], [], []]
  const gridMults: number[][] = [[], [], [], [], []]

  for (let r = 0; r < 5; r++) {
    const strip = strips[r]!
    const p = positions[r]!
    for (let i = 0; i < 3; i++) {
      gridSyms[r]!.push(strip[p + i]!)
      gridMults[r]!.push(1)
    }
  }

  const result = evaluateSpin({ symbols: gridSyms, multipliers: gridMults }, engine)
  const scatterResult = scatterEngine.evaluateAtPositions(positions, BET)

  return { win: result.totalWin + scatterResult.win, sc: scatterResult.count }
}

// ─── Encoding ──────────────────────────────────────────────────────────────

const INT_STRIPS = STRIP_STRINGS.map((strip) => {
  const arr = new Uint8Array(strip.length)
  strip.forEach((s, i) => (arr[i] = Symbols[s as keyof typeof Symbols]!))
  return arr
})

const INNER_DISTINCT = INNER_WEIGHTS.map(([s]) => s)
const INNER_IDX = new Map<number, number>()
INNER_DISTINCT.forEach((s, i) => INNER_IDX.set(s, i))

const RESOLVED: Uint8Array[][] = INNER_DISTINCT.map((repSym) =>
  INT_STRIPS.map((strip) => {
    const n = strip.length
    const r = new Uint8Array(n + 2)
    for (let i = 0; i < n; i++)
      r[i] = strip[i] === Symbols.REPLACEMENT ? (repSym as number) : strip[i]!
    r[n] = r[0]!
    r[n + 1] = r[1]!
    return r
  }),
)

// ─── Monadic Setup ──────────────────────────────────────────────────────────

const innerSampler = Sampler.fromWeighted(
  Array1.unsafeFromArray(INNER_WEIGHTS) as Array1<readonly [number, number]>,
)

const REEL_SIZES = STRIP_STRINGS.map((s) => s.length)
const POS_SAMPLERS = REEL_SIZES.map(
  (size) => new Sampler(SamplingPlan.draw(0, size), (rng: Rng) => rng(0, size)),
)

const SCATTER_VARIANTS = INNER_DISTINCT.map((_, repIdx) =>
  Sampler.traverse(POS_SAMPLERS, (ps) => ps).map((positions) =>
    evaluateWithScatter(RESOLVED[repIdx]!, positions),
  ),
)

// Pick bonus: 20 coins (2 of each value), shuffle, first matched pair.
// By symmetry of a uniform permutation, each value is equally likely to be
// the first matched pair — so this is exactly Sampler.uniform over the values.
const pickBonusSampler: Sampler<number> = Sampler.uniform(Array1.unsafeFromArray(PICK_BONUS_VALUES))

// Compose pick bonus into the spin result when sc >= 3 (trigger condition).
// No rng ever leaves the Sampler boundary — pickedBonus is 0 when not triggered.
function withPickBonus(
  base: Sampler<{ win: number; sc: number }>,
): Sampler<{ win: number; sc: number; pickedBonus: number }> {
  return base.flatMap((result) =>
    result.sc >= 3
      ? pickBonusSampler.map((fs) => ({ ...result, pickedBonus: fs }))
      : Sampler.pure({ ...result, pickedBonus: 0 }),
  )
}

const _baseSpin = innerSampler.flatMap(
  (repSym) => SCATTER_VARIANTS[INNER_IDX.get(repSym as number)!]!,
)

export const SPIN_WITH_SCATTER = withPickBonus(_baseSpin)
export const FREE_SPIN_WITH_SCATTER = withPickBonus(_baseSpin)
