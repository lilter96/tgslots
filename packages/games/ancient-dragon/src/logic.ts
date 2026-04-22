import { Array1 } from '@tgslots/math/functional/array1'
import { Sampler, SamplingPlan } from '@tgslots/math/probability'
import type { Rng } from '@tgslots/math/rng/types'
import { evaluateSpin } from '@tgslots/slots-core/paylines/evaluator'
import { PrecomputedScatterEngine } from '@tgslots/slots-core/scatter/precomputed-engine'
import { engine } from './engine.js'
import { BET, INNER_WEIGHTS, SCATTER_PAY, STRIP_STRINGS, Symbols } from './constants.js'

// YINYANG is never an INNER replacement, so scatter positions are invariant across
// all resolved strip variants — precompute once from the raw string strips.
const _scatterStrips = STRIP_STRINGS.map((stripStr) => {
  const n = stripStr.length
  const r = new Uint8Array(n + 4)
  for (let i = 0; i < n; i++) r[i] = Symbols[stripStr[i] as keyof typeof Symbols]!
  for (let i = 0; i < 4; i++) r[n + i] = r[i]!
  return r
})
const scatterEngine = new PrecomputedScatterEngine(
  { symbolId: Symbols.YINYANG, payouts: [...SCATTER_PAY] },
  _scatterStrips,
  5,
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
    for (let i = 0; i < 5; i++) {
      gridSyms[r]!.push(strip[p + i]!)
      gridMults[r]!.push(1)
    }
  }

  const result = evaluateSpin({ symbols: gridSyms, multipliers: gridMults }, engine)
  const scatterResult = scatterEngine.evaluateAtPositions(positions, BET)

  return { win: result.totalWin + scatterResult.win, sc: scatterResult.count }
}

function resolveStrips(stripStrings: readonly string[][], repSym: number): Uint8Array[] {
  return stripStrings.map((stripStr) => {
    const n = stripStr.length
    const r = new Uint8Array(n + 4)
    for (let i = 0; i < n; i++) {
      const sym = Symbols[stripStr[i] as keyof typeof Symbols]!
      r[i] = sym === Symbols.INNER ? repSym : sym
    }
    for (let i = 0; i < 4; i++) {
      r[n + i] = r[i]!
    }
    return r
  })
}

const INNER_DISTINCT = INNER_WEIGHTS.map(([s]) => s)
const innerSampler = Sampler.fromWeighted(
  Array1.unsafeFromArray(INNER_WEIGHTS) as Array1<readonly [number, number]>,
)

function createSpinSampler(stripStrings: readonly string[][]) {
  const reelSizes = stripStrings.map((s) => s.length)
  const posSamplers = reelSizes.map(
    (size) => new Sampler(SamplingPlan.draw(0, size), (rng: Rng) => rng(0, size)),
  )

  const resolvedVariants = INNER_DISTINCT.map((repSym) => {
    const strips = resolveStrips(stripStrings, repSym as number)
    return Sampler.traverse(posSamplers, (ps) => ps).map((positions) =>
      evaluateWithScatter(strips, positions),
    )
  })

  const innerIdx = new Map<number, number>()
  INNER_DISTINCT.forEach((s, i) => innerIdx.set(s as number, i))

  return innerSampler.flatMap((repSym) => resolvedVariants[innerIdx.get(repSym as number)!]!)
}

export const SPIN_WITH_SCATTER = createSpinSampler(STRIP_STRINGS)
export const FREE_SPIN_WITH_SCATTER = createSpinSampler(STRIP_STRINGS)
