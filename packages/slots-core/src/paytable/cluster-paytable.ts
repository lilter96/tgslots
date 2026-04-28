// ══════════════════════════════════════════════════════════
//  Cluster Paytable — Float64Array indexed by cluster size
// ══════════════════════════════════════════════════════════

import type { PaytableConfig } from './paytable-config.js'
import type { FlatPaytable } from './flat-paytable.js'
import type { SymbolRegistry } from '../symbol-registry.js'

/**
 * Builds a `FlatPaytable` whose per-symbol payout array is sized to the full
 * grid area. `payouts[symbolId][clusterSize]` is the credit payout for a
 * connected cluster of that symbol at that size.
 *
 * `minPayCount` is the smallest cluster size (across any symbol) with a
 * non-zero payout — used by the cluster evaluator as the cluster threshold.
 */
export function buildClusterPaytable(
  config: PaytableConfig,
  registry: SymbolRegistry,
  gridArea: number,
): FlatPaytable {
  const payouts: Float64Array[] = Array.from(
    { length: registry.count },
    () => new Float64Array(gridArea + 1),
  )

  let minPayCount = gridArea + 1

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

  if (minPayCount > gridArea) minPayCount = gridArea

  return { payouts, minPayCount }
}
