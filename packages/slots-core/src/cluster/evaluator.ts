// ══════════════════════════════════════════════════════════
//  Cluster Evaluator — 4-connected BFS flood-fill,
//  per-symbol passes, wild substitution, no recursion.
// ══════════════════════════════════════════════════════════

import type { EvalGrid } from '../spin-grid/spin-grid.js'
import type { ClusterSlotEngine } from './cluster-engine.js'
import type { ClusterEvaluationResult, ClusterHit } from './types.js'
import { EMPTY_SYMBOL, type SymbolId } from '../symbol-registry.js'

/**
 * Evaluates all winning clusters on the grid.
 *
 * For each non-wild, non-scatter symbol id `S` present on the grid, performs
 * a 4-connected BFS where a cell is traversable iff its symbol is `S` or the
 * wild id. Components that contain no real `S` cell are skipped (a pure-wild
 * region cannot pay as `S`). Components of size ≥ `paytable.minPayCount` and
 * with a non-zero payout are emitted as `ClusterHit`s.
 *
 * Wild cells may belong to multiple hits (one per neighbour symbol type).
 * Scatter cells are never traversable.
 */
export function evaluateClusters(
  grid: EvalGrid,
  engine: ClusterSlotEngine,
): ClusterEvaluationResult {
  const { symbols, paytable, reelCount, rowCount, gridArea, scatterId } = engine
  const { wildId, toName } = symbols
  const { payouts, minPayCount } = paytable

  const hits: ClusterHit[] = []

  // Reusable scratch buffers.
  const visited = new Uint8Array(gridArea)
  const queue = new Int32Array(gridArea)

  // Track which symbol ids we've already swept.
  const symbolSwept = new Uint8Array(symbols.count)

  for (let reel = 0; reel < reelCount; reel++) {
    for (let row = 0; row < rowCount; row++) {
      const sym = grid.getSymbol(reel, row)
      if (sym === wildId) continue
      if (sym === EMPTY_SYMBOL) continue
      if (scatterId !== null && sym === scatterId) continue
      if (sym < 0 || sym >= symbols.count) continue
      if (symbolSwept[sym]) continue
      symbolSwept[sym] = 1

      const symbolPayouts = payouts[sym]
      if (!symbolPayouts) continue

      sweepSymbolClusters(
        grid,
        sym,
        wildId,
        scatterId,
        reelCount,
        rowCount,
        visited,
        queue,
        symbolPayouts,
        minPayCount,
        toName,
        hits,
      )
    }
  }

  let totalWin = 0
  for (let i = 0; i < hits.length; i++) totalWin += hits[i]!.totalPayout

  return { totalWin, hits }
}

/** Flood-fill every component of `targetSym` on the grid. */
function sweepSymbolClusters(
  grid: EvalGrid,
  targetSym: SymbolId,
  wildId: SymbolId,
  scatterId: SymbolId | null,
  reelCount: number,
  rowCount: number,
  visited: Uint8Array,
  queue: Int32Array,
  symbolPayouts: Float64Array,
  minPayCount: number,
  toName: readonly string[],
  hits: ClusterHit[],
): void {
  visited.fill(0)

  for (let reel = 0; reel < reelCount; reel++) {
    for (let row = 0; row < rowCount; row++) {
      if (grid.getSymbol(reel, row) !== targetSym) continue
      const startPos = reel * rowCount + row
      if (visited[startPos]) continue

      // Collected positions for this component.
      const positions: number[] = []
      let realCount = 0

      let head = 0
      let tail = 0
      queue[tail++] = startPos
      visited[startPos] = 1

      while (head < tail) {
        const pos = queue[head++]!
        const r = (pos / rowCount) | 0
        const c = pos - r * rowCount
        const cellSym = grid.getSymbol(r, c)

        positions.push(pos)
        if (cellSym === targetSym) realCount++

        // 4-connected neighbours.
        if (c > 0) {
          const nPos = pos - 1
          if (!visited[nPos]) {
            const nSym = grid.getSymbol(r, c - 1)
            if (isTraversable(nSym, targetSym, wildId, scatterId)) {
              visited[nPos] = 1
              queue[tail++] = nPos
            }
          }
        }
        if (c < rowCount - 1) {
          const nPos = pos + 1
          if (!visited[nPos]) {
            const nSym = grid.getSymbol(r, c + 1)
            if (isTraversable(nSym, targetSym, wildId, scatterId)) {
              visited[nPos] = 1
              queue[tail++] = nPos
            }
          }
        }
        if (r > 0) {
          const nPos = pos - rowCount
          if (!visited[nPos]) {
            const nSym = grid.getSymbol(r - 1, c)
            if (isTraversable(nSym, targetSym, wildId, scatterId)) {
              visited[nPos] = 1
              queue[tail++] = nPos
            }
          }
        }
        if (r < reelCount - 1) {
          const nPos = pos + rowCount
          if (!visited[nPos]) {
            const nSym = grid.getSymbol(r + 1, c)
            if (isTraversable(nSym, targetSym, wildId, scatterId)) {
              visited[nPos] = 1
              queue[tail++] = nPos
            }
          }
        }
      }

      // Pure-wild regions are impossible here (we only seed at real-symbol
      // cells), but keep the guard for future-proofing.
      if (realCount === 0) continue

      const size = positions.length
      if (size < minPayCount) continue
      const basePayout = symbolPayouts[size] ?? 0
      if (basePayout <= 0) continue

      hits.push({
        symbolId: targetSym,
        symbolName: toName[targetSym] ?? 'UNKNOWN',
        size,
        basePayout,
        totalPayout: basePayout,
        positions,
      })
    }
  }
}

function isTraversable(
  cellSym: SymbolId,
  targetSym: SymbolId,
  wildId: SymbolId,
  scatterId: SymbolId | null,
): boolean {
  if (cellSym === EMPTY_SYMBOL) return false
  if (scatterId !== null && cellSym === scatterId) return false
  return cellSym === targetSym || cellSym === wildId
}
