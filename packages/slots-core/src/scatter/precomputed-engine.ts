import type { ScatterDefinition } from '../paylines/types.js'
import type { PositionalScatterEngine, ScatterResult } from './types.ts'

export class PrecomputedScatterEngine implements PositionalScatterEngine {
  // scatterByPos[reel][stopPosition] = number of scatter symbols in the visible window
  private readonly scatterByPos: ReadonlyArray<Int8Array>

  constructor(
    private readonly def: ScatterDefinition,
    strips: readonly Uint8Array[],
    rows: number,
  ) {
    this.scatterByPos = strips.map((strip) => {
      const prefix = new Int32Array(strip.length + 1)
      for (let i = 0; i < strip.length; i++) {
        prefix[i + 1] = prefix[i]! + (strip[i] === def.symbolId ? 1 : 0)
      }
      // valid stop positions: 0 .. strip.length - rows
      const validStops = strip.length - rows + 1
      const counts = new Int8Array(validStops)
      for (let p = 0; p < validStops; p++) {
        counts[p] = prefix[p + rows]! - prefix[p]!
      }
      return counts
    })
  }

  evaluateAtPositions(positions: readonly number[], bet: number): ScatterResult {
    let count = 0
    for (let r = 0; r < this.scatterByPos.length; r++) {
      count += this.scatterByPos[r]![positions[r]!]!
    }
    const win = (this.def.payouts[count] ?? 0) * bet
    return { count, win }
  }
}
