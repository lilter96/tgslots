import type { SymbolId } from '../symbol-registry.js'

/** A single cluster win — one connected component of same-type symbols. */
export interface ClusterHit {
  readonly symbolId: SymbolId
  readonly symbolName: string
  readonly size: number
  readonly basePayout: number
  readonly totalPayout: number
  /** Encoded grid positions: `reel * rowCount + row`. */
  readonly positions: readonly number[]
}

/** Aggregated result of a single cluster evaluation pass. */
export interface ClusterEvaluationResult {
  readonly totalWin: number
  readonly hits: readonly ClusterHit[]
}
