// ══════════════════════════════════════════════════════════
//  Flat Paytable — Float64Array for O(1) indexed lookups
// ══════════════════════════════════════════════════════════

import type { PaytableConfig } from './paytable-config.js'
import { type SymbolId, type SymbolRegistry } from '../symbol-registry.js'

export interface FlatPaytable {
  /** payouts[symbolId][matchCount] → credit payout. Typed array, zero-initialized. */
  readonly payouts: readonly Float64Array[]

  /** Minimum matchCount that yields any payout across all symbols. */
  readonly minPayCount: number
}

export function buildFlatPaytable(
  config: PaytableConfig,
  registry: SymbolRegistry,
  reelCount: number,
): FlatPaytable {
  const payouts: Float64Array[] = Array.from(
    { length: registry.count },
    () => new Float64Array(reelCount + 1), // auto-zeroed
  )

  let minPayCount = reelCount

  for (const [symbolName, countMap] of Object.entries(config)) {
    const symId = registry.toId.get(symbolName)
    if (symId === undefined) continue

    const symbolPayouts = payouts[symId]
    if (!symbolPayouts) continue

    for (const [countStr, payout] of Object.entries(countMap)) {
      const count = Number(countStr)
      if (count >= 0 && count < symbolPayouts.length) {
        symbolPayouts[count] = payout
      }

      if (payout > 0 && count < minPayCount) {
        minPayCount = count
      }
    }
  }

  return { payouts, minPayCount }
}

/**
 * Finds the best payout for an all-wild line of given length.
 * Returns [payout, symbolId] so caller can report the correct symbol.
 */
export function findBestWildPayout(
  table: FlatPaytable,
  registry: SymbolRegistry,
  matchCount: number,
): [payout: number, bestSymbolId: SymbolId] {
  let maxPayout = 0
  let bestId: SymbolId = 0

  for (let s = 0; s < registry.count; s++) {
    if (s === registry.wildId) continue

    const symbolPayouts = table.payouts[s]
    if (!symbolPayouts) continue

    const val = symbolPayouts[matchCount]
    if (val !== undefined && val > maxPayout) {
      maxPayout = val
      bestId = s
    }
  }

  return [maxPayout, bestId]
}
