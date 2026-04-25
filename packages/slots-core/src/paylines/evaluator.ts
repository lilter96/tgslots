// ══════════════════════════════════════════════════════════
//  Payline Evaluator — iterative DFS, zero closures,
//  typed-array lookups, batch subtree emission
// ══════════════════════════════════════════════════════════

// ── DFS stack frame (explicit, no recursion) ──

import type { TrieNode } from './payline-trie.js'
import type { EvaluationResult, PaylineHit } from './types.js'
import type { SlotWithPaylinesEngine } from './slot-engine.js'
import { type SymbolId, UNRESOLVED_SYMBOL } from '../symbol-registry.js'
import type { EvalGrid } from '../spin-grid/spin-grid.js'
import { findBestWildPayout } from '../paytable/flat-paytable.js'

interface DfsFrame {
  node: TrieNode
  reel: number
  baseSymId: SymbolId
  matchCount: number
  wildMult: number
  nextChildRow: number // resume point after returning from a child
}

// ── Public API ──

/**
 * Evaluates all paylines for a single spin.
 * Mutates nothing on the engine — safe for concurrent calls.
 */
export function evaluateSpin(grid: EvalGrid, engine: SlotWithPaylinesEngine): EvaluationResult {
  const { trie, symbols, paytable, reelCount, rowCount } = engine
  const { root, paylineOrder } = trie
  const { payouts, minPayCount } = paytable
  const { wildId, toName } = symbols

  const hits: PaylineHit[] = []
  let totalWin = 0

  // ── emit: resolve a contiguous range of paylines ──

  const emitRange = (
    plStart: number,
    plEnd: number,
    baseSymId: SymbolId,
    matchCount: number,
    wildMult: number,
  ): void => {
    let basePayout = 0

    if (baseSymId === UNRESOLVED_SYMBOL) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [bestPay, _bestId] = findBestWildPayout(paytable, symbols, matchCount)
      basePayout = bestPay
    } else {
      const symPayouts = payouts[baseSymId]
      if (symPayouts) {
        basePayout = symPayouts[matchCount] ?? 0
      }
    }

    if (basePayout <= 0) return

    const linePayout = basePayout * wildMult
    const resolvedName = baseSymId === UNRESOLVED_SYMBOL ? 'WILD' : (toName[baseSymId] ?? 'UNKNOWN')

    for (let i = plStart; i < plEnd; i++) {
      const lineIndex = paylineOrder[i]
      if (lineIndex === undefined) continue

      totalWin += linePayout
      hits.push({
        lineIndex,
        symbolName: resolvedName,
        matchCount,
        basePayout,
        wildMultiplier: wildMult,
        totalPayout: linePayout,
      })
    }
  }

  // ── iterative DFS ──

  const stack: DfsFrame[] = [
    {
      node: root,
      reel: 0,
      baseSymId: UNRESOLVED_SYMBOL,
      matchCount: 0,
      wildMult: 1,
      nextChildRow: 0,
    },
  ]

  while (stack.length > 0) {
    const frame = stack[stack.length - 1]
    if (!frame) {
      stack.pop()
      continue
    }

    // terminal: all reels scanned
    if (frame.reel === reelCount) {
      if (frame.matchCount >= minPayCount) {
        emitRange(
          frame.node.plStart,
          frame.node.plEnd,
          frame.baseSymId,
          frame.matchCount,
          frame.wildMult,
        )
      }
      stack.pop()
      continue
    }

    // advance to next non-null child
    const children = frame.node.children
    let row = frame.nextChildRow
    while (row < rowCount && children[row] === null) row++

    if (row >= rowCount) {
      stack.pop()
      continue
    }

    // bookmark: when this frame resumes, try the next row
    frame.nextChildRow = row + 1

    const child = children[row]
    if (!child) continue

    const cellSym = grid.getSymbol(frame.reel, row)
    const cellMult = grid.getMultiplier(frame.reel, row)

    if (cellSym === wildId) {
      // wild extends the chain and accumulates multiplier
      stack.push({
        node: child,
        reel: frame.reel + 1,
        baseSymId: frame.baseSymId,
        matchCount: frame.matchCount + 1,
        wildMult: frame.wildMult * cellMult,
        nextChildRow: 0,
      })
    } else if (frame.baseSymId === UNRESOLVED_SYMBOL) {
      // first non-wild: locks the base symbol
      stack.push({
        node: child,
        reel: frame.reel + 1,
        baseSymId: cellSym,
        matchCount: frame.matchCount + 1,
        wildMult: frame.wildMult,
        nextChildRow: 0,
      })
    } else if (cellSym === frame.baseSymId) {
      // match continues
      stack.push({
        node: child,
        reel: frame.reel + 1,
        baseSymId: frame.baseSymId,
        matchCount: frame.matchCount + 1,
        wildMult: frame.wildMult,
        nextChildRow: 0,
      })
    } else {
      // ── chain broken: batch-emit entire subtree ──
      if (frame.matchCount >= minPayCount) {
        emitRange(child.plStart, child.plEnd, frame.baseSymId, frame.matchCount, frame.wildMult)
      }
      // skip subtree — no push
    }
  }

  return { totalWin, hits }
}
