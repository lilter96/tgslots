import type { EvalGrid } from '../spin-grid/spin-grid.js'
import { EMPTY_SYMBOL, type SymbolId } from '../symbol-registry.js'

/**
 * Mutable grid backing a cascade run. Owns a single typed-array buffer of
 * symbol ids, indexed `reel * rowCount + row`. Implements `EvalGrid` so it
 * can be passed straight into `evaluateClusters`.
 *
 * `clearAt` marks cells as `EMPTY_SYMBOL`; `applyGravity` compacts surviving
 * symbols toward the bottom of each reel and refills the top with values
 * from the supplied draw function.
 */
export class MutableCascadeGrid implements EvalGrid {
  readonly reelCount: number
  readonly rowCount: number
  private readonly buffer: Int16Array

  constructor(reelCount: number, rowCount: number) {
    this.reelCount = reelCount
    this.rowCount = rowCount
    this.buffer = new Int16Array(reelCount * rowCount)
  }

  /** Snapshot the symbols of an arbitrary `EvalGrid` into a new mutable grid. */
  static fromProjection(grid: EvalGrid): MutableCascadeGrid {
    const out = new MutableCascadeGrid(grid.reelCount, grid.rowCount)
    for (let reel = 0; reel < grid.reelCount; reel++) {
      for (let row = 0; row < grid.rowCount; row++) {
        out.setSymbol(reel, row, grid.getSymbol(reel, row))
      }
    }
    return out
  }

  getSymbol(reel: number, row: number): SymbolId {
    return this.buffer[reel * this.rowCount + row]!
  }

  getMultiplier(_reel: number, _row: number): number {
    return 1
  }

  setSymbol(reel: number, row: number, id: SymbolId): void {
    this.buffer[reel * this.rowCount + row] = id
  }

  /** Mark each encoded position as `EMPTY_SYMBOL`. */
  clearAt(positions: readonly number[]): void {
    for (let i = 0; i < positions.length; i++) {
      this.buffer[positions[i]!] = EMPTY_SYMBOL
    }
  }

  /**
   * Standard tumble: in each reel, surviving symbols fall to the bottom
   * (highest row index), and the top is refilled with values drawn from
   * `refill(reel)` for each empty slot.
   */
  applyGravity(refill: (reel: number) => SymbolId): void {
    const { reelCount, rowCount } = this
    for (let reel = 0; reel < reelCount; reel++) {
      const base = reel * rowCount
      // Compact downward.
      let writeRow = rowCount - 1
      for (let row = rowCount - 1; row >= 0; row--) {
        const sym = this.buffer[base + row]!
        if (sym !== EMPTY_SYMBOL) {
          if (writeRow !== row) {
            this.buffer[base + writeRow] = sym
            this.buffer[base + row] = EMPTY_SYMBOL
          }
          writeRow--
        }
      }
      // Refill the top empties.
      for (let row = writeRow; row >= 0; row--) {
        this.buffer[base + row] = refill(reel)
      }
    }
  }
}
