import { Array1 } from '@tgslots/math/functional/array1'
import { Sampler, SamplingPlan } from '@tgslots/math/probability'
import type { Rng } from '@tgslots/math/rng/types'
import { evaluateSpin } from '@tgslots/slots-core/paylines/evaluator'
import { PrecomputedScatterEngine } from '@tgslots/slots-core/scatter/precomputed-engine'
import { type WagerBreakdown } from '@tgslots/slots-core/betting/wager'
import { createGrid } from '@tgslots/slots-core'
import { engine } from './engine.js'
import { INNER_WEIGHTS, SCATTER_PAY, STRIP_STRINGS, Symbols } from './constants.js'

// YINYANG is never an INNER replacement, so scatter positions are invariant across
// all resolved strip variants — precompute once from the raw string strips.
const _scatterStrips = STRIP_STRINGS.map((stripStr) => {
  const n = stripStr.length
  const r = new Uint8Array(n + 2) // 3 rows visible means we need n+2 to read at position n-1
  for (let i = 0; i < n; i++) r[i] = Symbols[stripStr[i] as keyof typeof Symbols]!
  r[n] = r[0]!
  r[n + 1] = r[1]!
  return r
})
const scatterEngine = new PrecomputedScatterEngine(
  { symbolId: Symbols.YINYANG, payouts: [...SCATTER_PAY] },
  _scatterStrips,
  3, // Ancient Dragon is 5x3
)

export interface SpinEvaluationResult {
  readonly win: number
  readonly sc: number
}

function evaluateWithBreakdown(
  strips: readonly Uint8Array[],
  positions: readonly number[],
  breakdown: WagerBreakdown,
): { win: number; sc: number } {
  const grid = createGrid(strips, positions, 3)

  const lineResult = evaluateSpin(grid, engine)
  const scatterResult = scatterEngine.evaluateAtPositions(positions, 1)

  // Rules:
  // Line wins: base * creditsPerLine (30/100 = 0.3)
  // Scatter wins: base * totalWager (30)
  const lineWin = lineResult.totalWin * breakdown.creditsPerLine
  const scatterWin = scatterResult.win * breakdown.totalWager

  return { win: lineWin + scatterWin, sc: scatterResult.count }
}

function resolveStrips(stripStrings: readonly string[][], repSym: number): Uint8Array[] {
  return stripStrings.map((stripStr) => {
    const n = stripStr.length
    const r = new Uint8Array(n + 2)
    for (let i = 0; i < n; i++) {
      const sym = Symbols[stripStr[i] as keyof typeof Symbols]!
      r[i] = sym === Symbols.INNER ? repSym : sym
    }
    r[n] = r[0]!
    r[n + 1] = r[1]!
    return r
  })
}

const INNER_DISTINCT = INNER_WEIGHTS.map(([s]) => s)
const innerSampler = Sampler.fromWeighted(
  Array1.unsafeFromArray(INNER_WEIGHTS) as Array1<readonly [number, number]>,
)

const REEL_SIZES = STRIP_STRINGS.map((s) => s.length)
const POS_SAMPLERS = REEL_SIZES.map(
  (size) => new Sampler(SamplingPlan.draw(0, size), (rng: Rng) => rng(0, size)),
)

const SCATTER_VARIANTS_BASE = INNER_DISTINCT.map((repSym) => {
  const strips = resolveStrips(STRIP_STRINGS, repSym as number)
  return Sampler.traverse(POS_SAMPLERS, (ps) => ps).map((positions) => ({
    strips,
    positions,
  }))
})

const INNER_IDX = new Map<number, number>()
INNER_DISTINCT.forEach((s, i) => INNER_IDX.set(s as number, i))

function createSpinSampler(breakdown: WagerBreakdown): Sampler<SpinEvaluationResult> {
  return innerSampler.flatMap((repSym) => {
    const repIdx = INNER_IDX.get(repSym as number)!
    return SCATTER_VARIANTS_BASE[repIdx]!.map(({ strips, positions }) =>
      evaluateWithBreakdown(strips, positions, breakdown),
    )
  })
}

export const ANCIENT_DRAGON_SAMPLER = (breakdown: WagerBreakdown): Sampler<SpinEvaluationResult> =>
  createSpinSampler(breakdown)
