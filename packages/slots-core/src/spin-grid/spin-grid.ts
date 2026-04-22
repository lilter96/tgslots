import type { SymbolId } from '../symbol-registry.js'

export interface EvalGrid {
  readonly symbols: readonly SymbolId[][]
  readonly multipliers: readonly number[][]
}
