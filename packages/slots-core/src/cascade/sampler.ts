import { Sampler } from '@tgslots/math/probability'
import type { ClusterSlotEngine } from '../cluster/cluster-engine.js'
import type { EvalGrid } from '../spin-grid/spin-grid.js'
import { EMPTY_SYMBOL, type SymbolId } from '../symbol-registry.js'
import { evaluateClusters } from '../cluster/evaluator.js'
import { MutableCascadeGrid } from './cascade-grid.js'
import { collectVanishPositions } from './vanishing.js'
import type { CascadeOptions, CascadeResult, CascadeStep } from './types.js'

const DEFAULT_MAX_STEPS = 100

/**
 * Builds a `Sampler<CascadeResult>` that drives the entire cascade chain
 * through the Sampler combinator graph — no `Rng` parameters in user code,
 * matching the project-wide rule that game randomness flows through
 * `Sampler<T>` only.
 *
 * `refillSamplers` must contain exactly `engine.reelCount` entries; the
 * sampler at index `r` is consulted for every empty cell on reel `r` after
 * a vanish step.
 */
export function createCascadeSampler(
  engine: ClusterSlotEngine,
  initialGridSampler: Sampler<EvalGrid>,
  refillSamplers: readonly Sampler<SymbolId>[],
  options?: CascadeOptions,
): Sampler<CascadeResult> {
  if (refillSamplers.length !== engine.reelCount) {
    throw new Error(
      `createCascadeSampler: expected ${engine.reelCount} refill samplers, got ${refillSamplers.length}`,
    )
  }
  const maxSteps = options?.maxSteps ?? DEFAULT_MAX_STEPS

  return initialGridSampler
    .map((g) => MutableCascadeGrid.fromProjection(g))
    .flatMap((grid) => cascadeStep(engine, refillSamplers, grid, [], 0, maxSteps))
}

function cascadeStep(
  engine: ClusterSlotEngine,
  refillSamplers: readonly Sampler<SymbolId>[],
  grid: MutableCascadeGrid,
  steps: CascadeStep[],
  totalWin: number,
  remaining: number,
): Sampler<CascadeResult> {
  const evaluation = evaluateClusters(grid, engine)
  if (evaluation.hits.length === 0 || remaining === 0) {
    if (steps.length === 0) {
      steps.push({ evaluation, vanished: [], stepWin: 0 })
    }
    return Sampler.pure({ steps, totalWin, finalGrid: grid })
  }

  const vanished = collectVanishPositions(evaluation.hits, grid, engine)
  grid.clearAt(vanished)

  // Build a flat draw list ordered by reel, matching `applyGravity`'s
  // reel-ordered refill callback sequence.
  const drawSamplers: Sampler<SymbolId>[] = []
  for (let reel = 0; reel < engine.reelCount; reel++) {
    let empties = 0
    for (let row = 0; row < engine.rowCount; row++) {
      if (grid.getSymbol(reel, row) === EMPTY_SYMBOL) empties++
    }
    const reelSampler = refillSamplers[reel]!
    for (let i = 0; i < empties; i++) drawSamplers.push(reelSampler)
  }

  if (drawSamplers.length === 0) {
    // Vanish produced nothing (only possible when hits.length > 0 but
    // collectVanishPositions returned an empty set — defensive).
    steps.push({ evaluation, vanished, stepWin: evaluation.totalWin })
    return cascadeStep(
      engine,
      refillSamplers,
      grid,
      steps,
      totalWin + evaluation.totalWin,
      remaining - 1,
    )
  }

  return Sampler.sequence(drawSamplers).flatMap((draws) => {
    let idx = 0
    grid.applyGravity(() => draws[idx++]!)
    steps.push({ evaluation, vanished, stepWin: evaluation.totalWin })
    return cascadeStep(
      engine,
      refillSamplers,
      grid,
      steps,
      totalWin + evaluation.totalWin,
      remaining - 1,
    )
  })
}
