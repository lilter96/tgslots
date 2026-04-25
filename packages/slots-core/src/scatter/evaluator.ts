import type { ScatterDefinition } from '../paylines/types.js'
import type { EvalGrid } from '../spin-grid/spin-grid.js'
import type { ScatterEngine, ScatterResult } from './types.ts'

export class BaseScatterEngine implements ScatterEngine {
  constructor(protected readonly def: ScatterDefinition) {}

  evaluate(grid: EvalGrid, bet: number): ScatterResult {
    let count = 0
    for (let r = 0; r < grid.reelCount; r++) {
      for (let i = 0; i < grid.rowCount; i++) {
        if (grid.getSymbol(r, i) === this.def.symbolId) count++
      }
    }
    const win = (this.def.payouts[count] ?? 0) * bet
    return { count, win }
  }
}
