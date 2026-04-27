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
  readonly scatterWin: number
  readonly sc: number
  readonly grid: number[][]
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
): { win: number; scatterWin: number; sc: number; grid: number[][] } {
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

  return { win: lineWin + scatterWin, scatterWin, sc: scatterResult.count, grid: symbols }
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

export const ballSampler = Sampler.fromWeighted(Array1.unsafeFromArray(PICK_BONUS_TABLE))

const createPickUntilRepeatSampler = (seen: readonly number[] = []): Sampler<number> =>
  ballSampler.flatMap((ball) => {
    if (seen.includes(ball)) {
      return Sampler.pure(ball)
    }
    return createPickUntilRepeatSampler([...seen, ball])
  })

export const pickBonusSampler = createPickUntilRepeatSampler()

/**
 * Creates a Sampler for the pick sequence given a result value.
 * We sample unique balls according to weights until winValue repeat is reached.
 */
function createPickSequenceValuesSampler(
  winValue: number,
  seen: readonly number[] = [],
): Sampler<number[]> {
  return ballSampler.flatMap((val) => {
    if (seen.includes(val)) {
      if (val === winValue) {
        return Sampler.pure([...seen, val])
      }
      // Force winValue to be the first repeat.
      return createPickSequenceValuesSampler(winValue, seen)
    }
    return createPickSequenceValuesSampler(winValue, [...seen, val])
  })
}

/**
 * Sampler that produces a sequence of swaps for a Fisher-Yates shuffle.
 */
function shuffleSwapsSampler(length: number): Sampler<number[]> {
  const indices: number[] = []
  for (let i = length - 1; i > 0; i--) {
    indices.push(i)
  }
  return Sampler.traverse(
    indices,
    (i) => new Sampler(SamplingPlan.draw(0, i + 1), (rng) => rng(0, i + 1)),
  )
}

/**
 * Generates a full pick bonus state given the winValue from the sampler.
 * Resulting board and sequence are used for step-by-step picking.
 */
export function generatePickBonus(winValue: number): Sampler<{
  board: number[]
  pickSequence: number[]
}> {
  return createPickSequenceValuesSampler(winValue).flatMap((pickSequenceValues) => {
    const distinctValues = PICK_BONUS_TABLE.map(([val]) => val)
    const initialBoard: number[] = []
    for (const val of distinctValues) {
      initialBoard.push(val, val)
    }

    return shuffleSwapsSampler(initialBoard.length).flatMap((boardSwaps) => {
      const board = [...initialBoard]
      boardSwaps.forEach((j, offset) => {
        const i = initialBoard.length - 1 - offset
        const temp = board[i]!
        board[i] = board[j]!
        board[j] = temp
      })

      const valToIndices = new Map<number, number[]>()
      board.forEach((val, idx) => {
        if (!valToIndices.has(val)) valToIndices.set(val, [])
        valToIndices.get(val)!.push(idx)
      })

      // We have 10 distinct values, each with 2 indices.
      // We sample a single bit for each to decide if we swap the indices.
      const indexShuffles = Sampler.traverse(
        Array.from(valToIndices.keys()),
        () => new Sampler(SamplingPlan.draw(0, 2), (rng) => rng(0, 2)),
      )

      return indexShuffles.map((swaps) => {
        const keys = Array.from(valToIndices.keys())
        const finalValToIndices = new Map<number, number[]>()
        keys.forEach((key, i) => {
          const indices = [...valToIndices.get(key)!]
          if (swaps[i] === 1) {
            const temp = indices[0]!
            indices[0] = indices[1]!
            indices[1] = temp
          }
          finalValToIndices.set(key, indices)
        })

        const pickSequence: number[] = []
        const usedCount = new Map<number, number>()
        for (const val of pickSequenceValues) {
          const count = usedCount.get(val) ?? 0
          const indices = finalValToIndices.get(val)
          if (!indices) throw new Error(`Value ${val} not found in board`)
          pickSequence.push(indices[count]!)
          usedCount.set(val, count + 1)
        }

        return { board, pickSequence }
      })
    })
  })
}

function withPickBonus(
  base: Sampler<{ win: number; scatterWin: number; sc: number; grid: number[][] }>,
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
