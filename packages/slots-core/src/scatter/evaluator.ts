import type { ScatterDefinition } from '../paylines/types.js'
import type { EvalGrid } from '../spin-grid/spin-grid.js'
import type { ScatterEngine, ScatterResult } from './types.ts'

export class BaseScatterEngine implements ScatterEngine {
  constructor(protected readonly def: ScatterDefinition) {}

  evaluate(grid: EvalGrid, bet: number): ScatterResult {
    let count = 0
    const { symbols } = grid
    for (let r = 0; r < symbols.length; r++) {
      const reel = symbols[r]!
      for (let i = 0; i < reel.length; i++) {
        if (reel[i] === this.def.symbolId) count++
      }
    }
    const win = (this.def.payouts[count] ?? 0) * bet
    return { count, win }
  }
}
