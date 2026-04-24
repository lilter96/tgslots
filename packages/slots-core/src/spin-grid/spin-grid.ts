import type { SymbolId } from '../symbol-registry.js'

export interface EvalGrid {
  readonly symbols: readonly SymbolId[][]
  readonly multipliers: readonly number[][]
}

/** Standardized grid construction from reel strips and window positions */
export function createGrid(
  strips: readonly Uint8Array[],
  positions: readonly number[],
  rows: number,
  reels: number = 5,
): EvalGrid {
  const symbols: number[][] = []
  const multipliers: number[][] = []

  for (let r = 0; r < reels; r++) {
    const strip = strips[r]!
    const p = positions[r]!
    const reelSyms: number[] = []
    const reelMults: number[] = []

    for (let i = 0; i < rows; i++) {
      // Strips are often looped, but here we assume the strip is padded
      // or positions are valid for a window of 'rows'
      reelSyms.push(strip[p + i]!)
      reelMults.push(1)
    }

    symbols.push(reelSyms)
    multipliers.push(reelMults)
  }

  return { symbols, multipliers }
}
