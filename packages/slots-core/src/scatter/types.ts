import type { EvalGrid } from '../spin-grid/spin-grid.js'

export interface ScatterResult {
  readonly count: number
  readonly win: number
}

export interface ScatterEngine {
  evaluate(grid: EvalGrid, bet: number): ScatterResult
}

export interface PositionalScatterEngine {
  evaluateAtPositions(positions: readonly number[], bet: number): ScatterResult
}
