import type { SymbolId } from '../symbol-registry.js'

/**
 * A projection of the reel strips at specific positions.
 * Avoids array-of-array allocations in the simulation hot path.
 */
export interface EvalGrid {
  getSymbol(reel: number, row: number): SymbolId
  getMultiplier(reel: number, row: number): number
  readonly reelCount: number
  readonly rowCount: number
}

/**
 * Lightweight projection that reads directly from source strips.
 */
export class ProjectedGrid implements EvalGrid {
  constructor(
    private readonly strips: readonly Uint8Array[],
    private readonly positions: readonly number[],
    public readonly rowCount: number,
    public readonly reelCount: number = 5,
  ) {}

  getSymbol(reel: number, row: number): SymbolId {
    const strip = this.strips[reel]
    if (!strip) return 0
    return strip[this.positions[reel]! + row] ?? 0
  }

  getMultiplier(_reel: number, _row: number): number {
    return 1
  }
}

/** Legacy helper - prefer ProjectedGrid for performance */
export function createGrid(
  strips: readonly Uint8Array[],
  positions: readonly number[],
  rows: number,
  reels: number = 5,
): EvalGrid {
  return new ProjectedGrid(strips, positions, rows, reels)
}
