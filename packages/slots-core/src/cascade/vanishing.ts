import type { EvalGrid } from '../spin-grid/spin-grid.js'
import type { ClusterHit } from '../cluster/types.js'
import type { ClusterSlotEngine } from '../cluster/cluster-engine.js'

/**
 * Resolves which grid cells vanish after a cascade evaluation step.
 *
 * Spec: "all contributing regular paying symbols — plus any matching types
 * visible on the reels". Concretely:
 *   1. Every position contained in a winning cluster vanishes (this naturally
 *      includes any wilds inside winning clusters).
 *   2. Every other cell on the grid whose symbol matches a *winning* symbol
 *      type also vanishes.
 *   3. Wilds outside any winning cluster, scatters, and unrelated symbols
 *      stay in place.
 */
export function collectVanishPositions(
  hits: readonly ClusterHit[],
  grid: EvalGrid,
  engine: ClusterSlotEngine,
): readonly number[] {
  if (hits.length === 0) return []

  const { reelCount, rowCount, scatterId, symbols } = engine
  const { wildId } = symbols

  const vanish = new Set<number>()
  const winningSymbols = new Set<number>()

  for (let i = 0; i < hits.length; i++) {
    const hit = hits[i]!
    winningSymbols.add(hit.symbolId)
    const positions = hit.positions
    for (let j = 0; j < positions.length; j++) {
      vanish.add(positions[j]!)
    }
  }

  for (let reel = 0; reel < reelCount; reel++) {
    for (let row = 0; row < rowCount; row++) {
      const sym = grid.getSymbol(reel, row)
      if (sym === wildId) continue
      if (scatterId !== null && sym === scatterId) continue
      if (winningSymbols.has(sym)) {
        vanish.add(reel * rowCount + row)
      }
    }
  }

  const out = new Array<number>(vanish.size)
  let i = 0
  for (const p of vanish) out[i++] = p
  return out
}
