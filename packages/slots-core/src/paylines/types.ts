/** Single payline: maps each reel index to a row on that reel. */
export interface PaylineDefinition {
  readonly rows: readonly number[] // rows[reelIndex] = rowIndex
}

/** Scatter configuration: mapping symbol ID to payout table. */
export interface ScatterDefinition {
  readonly symbolId: number
  readonly payouts: readonly number[] // Index = count
}

/** Single winning payline. */
export interface PaylineHit {
  readonly lineIndex: number
  readonly symbolName: string
  readonly matchCount: number
  readonly basePayout: number
  readonly wildMultiplier: number
  readonly totalPayout: number
}

/** Aggregated result of a single spin evaluation. */
export interface EvaluationResult {
  readonly totalWin: number
  readonly hits: PaylineHit[]
}
