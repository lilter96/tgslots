import { Array1 } from '@tgslots/math/functional/array1'
import { Sampler, SamplingPlan } from '@tgslots/math/probability'
import type { Rng } from '@tgslots/math/rng/types'
import { evaluateSpin } from '@tgslots/slots-core/paylines/evaluator'
import type { PaylineHit } from '@tgslots/slots-core/paylines/types'
import { PrecomputedScatterEngine } from '@tgslots/slots-core/scatter/precomputed-engine'
import { Wager } from '@tgslots/slots-core/betting'
import { ProjectedGrid } from '@tgslots/slots-core/spin-grid/spin-grid'
import { engine } from './engine.js'
import { bonusPositionSampler } from './bonus-position-sampler.js'
import {
  BET_CONFIG,
  FREE_SPIN_MULTIPLIER,
  INNER_WEIGHTS,
  SCATTER_PAY,
  STRIP_STRINGS,
  Symbols,
} from './constants.js'

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
  readonly scatterWin: number
  readonly sc: number
  readonly grid: number[][]
  readonly hits: PaylineHit[]
  readonly pickedBonus: number
  readonly pickData?: {
    board: number[]
    pickSequence: number[]
  }
}

function evaluateWithWager(
  strips: readonly Uint8Array[],
  positions: readonly number[],
  wager: Wager,
  isFreeSpin: boolean,
): { win: number; scatterWin: number; sc: number; grid: number[][]; hits: PaylineHit[] } {
  const grid = new ProjectedGrid(strips, positions, 3)

  const lineResult = evaluateSpin(grid, engine)
  const scatterResult = scatterEngine.evaluateAtPositions(positions, 1)

  const featureMult = isFreeSpin ? FREE_SPIN_MULTIPLIER : 1

  const lineWin = lineResult.totalWin * wager.creditsPerLine * featureMult
  const scatterWin = scatterResult.win * wager.totalWager * featureMult

  const symbols: number[][] = []
  for (let r = 0; r < 3; r++) {
    const row: number[] = []
    for (let c = 0; c < 5; c++) {
      row.push(grid.getSymbol(c, r))
    }
    symbols.push(row)
  }

  return {
    win: lineWin + scatterWin,
    scatterWin,
    sc: scatterResult.count,
    grid: symbols,
    hits: lineResult.hits,
  }
}

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

import { generatePickBonus, pickBonusSampler } from './pick-bonus.js'

export { generatePickBonus }

function withPickBonus(
  base: Sampler<{
    win: number
    scatterWin: number
    sc: number
    grid: number[][]
    hits: PaylineHit[]
  }>,
): Sampler<SpinEvaluationResult> {
  return base.flatMap((result) =>
    result.sc >= 3
      ? pickBonusSampler.flatMap((winValue) =>
          generatePickBonus(winValue).map((pickData) => ({
            ...result,
            pickedBonus: winValue,
            pickData,
          })),
        )
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

export function createBuyBonusSampler(wager: Wager): Sampler<SpinEvaluationResult> {
  return withPickBonus(
    innerSampler.flatMap((repSym) => {
      const repIdx = INNER_IDX.get(repSym)!
      return bonusPositionSampler.map((positions) =>
        evaluateWithWager(RESOLVED[repIdx]!, positions, wager, false),
      )
    }),
  )
}

export const BUY_BONUS_SAMPLER = (wager: Wager): Sampler<SpinEvaluationResult> =>
  createBuyBonusSampler(wager)

function createInitialGridSampler(maxAttempts = 200): Sampler<SpinEvaluationResult> {
  if (maxAttempts <= 0) {
    throw new Error(`Initial grid sampler exceeded 200 attempts without finding a non-winning grid`)
  }
  const defaultWager = new Wager(1, BET_CONFIG)
  const baseSampler = innerSampler.flatMap((repSym) => {
    const repIdx = INNER_IDX.get(repSym as number)!
    return Sampler.traverse(POS_SAMPLERS, (ps) => ps).map((positions) =>
      evaluateWithWager(RESOLVED[repIdx]!, positions, defaultWager, false),
    )
  })

  return baseSampler.flatMap((result) => {
    if (result.win === 0 && result.sc < 2) {
      return Sampler.pure({ ...result, pickedBonus: 0 })
    }
    return createInitialGridSampler(maxAttempts - 1)
  })
}

export const INITIAL_GRID_SAMPLER = createInitialGridSampler()
