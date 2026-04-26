import { Array1 } from '@tgslots/math/functional/array1'
import { Sampler, SamplingPlan } from '@tgslots/math/probability'
import type { Rng } from '@tgslots/math/rng/types'
import { evaluateSpin } from '@tgslots/slots-core/paylines/evaluator'
import { PrecomputedScatterEngine } from '@tgslots/slots-core/scatter/precomputed-engine'
import { Wager } from '@tgslots/slots-core/betting'
import { ProjectedGrid } from '@tgslots/slots-core/spin-grid/spin-grid'
import { engine } from './engine.js'
import {
  FREE_SPIN_MULTIPLIER,
  INNER_WEIGHTS,
  PICK_BONUS_TABLE,
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

export interface SpinEvaluationResult {
  readonly win: number
  readonly sc: number
  readonly pickedBonus: number
}

function evaluateWithWager(
  strips: readonly Uint8Array[],
  positions: readonly number[],
  wager: Wager,
  isFreeSpin: boolean,
): { win: number; sc: number } {
  const grid = new ProjectedGrid(strips, positions, 3)

  const lineResult = evaluateSpin(grid, engine)
  const scatterResult = scatterEngine.evaluateAtPositions(positions, 1)

  const featureMult = isFreeSpin ? FREE_SPIN_MULTIPLIER : 1

  const lineWin = lineResult.totalWin * wager.creditsPerLine * featureMult
  const scatterWin = scatterResult.win * wager.totalWager * featureMult

  return { win: lineWin + scatterWin, sc: scatterResult.count }
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

const innerSampler = Sampler.fromWeighted(
  Array1.unsafeFromArray(INNER_WEIGHTS) as Array1<readonly [number, number]>,
)

const REEL_SIZES = STRIP_STRINGS.map((s) => s.length)
const POS_SAMPLERS = REEL_SIZES.map(
  (size) => new Sampler(SamplingPlan.draw(0, size), (rng: Rng) => rng(0, size)),
)

const ballSampler = Sampler.fromWeighted(Array1.unsafeFromArray(PICK_BONUS_TABLE))

const createPickUntilRepeatSampler = (seen: readonly number[] = []): Sampler<number> =>
  ballSampler.flatMap((ball) => {
    if (seen.includes(ball)) {
      return Sampler.pure(ball)
    }
    return createPickUntilRepeatSampler([...seen, ball])
  })

const pickBonusSampler = createPickUntilRepeatSampler()

function withPickBonus(base: Sampler<{ win: number; sc: number }>): Sampler<SpinEvaluationResult> {
  return base.flatMap((result) =>
    result.sc >= 3
      ? pickBonusSampler.map((fs) => ({ ...result, pickedBonus: fs }))
      : Sampler.pure({ ...result, pickedBonus: 0 }),
  )
}

const SCATTER_VARIANTS_BASE = INNER_DISTINCT.map((_, repIdx) =>
  Sampler.traverse(POS_SAMPLERS, (ps) => ps).map((positions) => ({
    repIdx,
    positions,
  })),
)

function createSpinSampler(wager: Wager, isFreeSpin: boolean): Sampler<SpinEvaluationResult> {
  const _base = innerSampler.flatMap((repSym) => {
    const repIdx = INNER_IDX.get(repSym as number)!
    return SCATTER_VARIANTS_BASE[repIdx]!.map(({ positions }) =>
      evaluateWithWager(RESOLVED[repIdx]!, positions, wager, isFreeSpin),
    )
  })

  return withPickBonus(_base)
}

export const WOODLAND_WHISPER_SAMPLER = (
  wager: Wager,
  isFreeSpin: boolean = false,
): Sampler<SpinEvaluationResult> => createSpinSampler(wager, isFreeSpin)
