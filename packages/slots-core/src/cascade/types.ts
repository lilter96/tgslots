import type { SymbolId } from '../symbol-registry.js'
import type { EvalGrid } from '../spin-grid/spin-grid.js'
import type { ClusterEvaluationResult } from '../cluster/types.js'

/**
 * Source of refill symbols during a cascade. The engine asks for the next
 * symbol per reel as cells fall in. Implementations are free to draw from
 * separate per-reel strips, a single mixed pool, or any other stream — the
 * engine never inspects the strategy.
 */
export interface RefillSource {
  drawNext(reel: number): SymbolId
}

export interface CascadeStep {
  readonly evaluation: ClusterEvaluationResult
  /** Encoded grid positions vacated this step. */
  readonly vanished: readonly number[]
  readonly stepWin: number
}

export interface CascadeResult {
  readonly steps: readonly CascadeStep[]
  readonly totalWin: number
  readonly finalGrid: EvalGrid
}

export interface CascadeOptions {
  /** Hard cap on cascade iterations. Default 100. */
  readonly maxSteps?: number
}
