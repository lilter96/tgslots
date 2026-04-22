// ══════════════════════════════════════════════════════════
//  Payline Trie — prefix tree with flat children + contiguous
//  payline index ranges for zero-allocation subtree emission
// ══════════════════════════════════════════════════════════

import type { PaylineDefinition } from './types.js'

/**
 * Trie node with flat array children (indexed by row).
 *
 * `plRange` = [start, end) into a shared `paylineOrder` array.
 * On break, emit paylineOrder[start..end) — covers the entire subtree
 * without recursion or per-node payline arrays.
 */
export interface TrieNode {
  /** children[rowIndex] = child node | null. Length = rowCount. */
  readonly children: (TrieNode | null)[]

  /** Start index (inclusive) into paylineOrder. */
  plStart: number

  /** End index (exclusive) into paylineOrder. */
  plEnd: number
}

export interface PaylineTrie {
  readonly root: TrieNode

  /**
   * Flat array of payline indices in DFS-leaf order.
   * Any node's subtree maps to a contiguous slice: paylineOrder[plStart..plEnd).
   */
  readonly paylineOrder: readonly number[]
}

// ── Internal build helpers ──

function createNode(rowCount: number): TrieNode {
  return {
    children: new Array<TrieNode | null>(rowCount).fill(null),
    plStart: 0,
    plEnd: 0,
  }
}

/**
 * Phase 1: Insert all paylines into the trie.
 * Returns root + temporary per-node payline lists (needed for ordering).
 */
function insertPaylines(
  paylines: readonly PaylineDefinition[],
  reelCount: number,
  rowCount: number,
): { root: TrieNode; nodeLists: Map<TrieNode, number[]> } {
  const root = createNode(rowCount)
  const nodeLists = new Map<TrieNode, number[]>()
  nodeLists.set(root, [])

  for (let lineIdx = 0; lineIdx < paylines.length; lineIdx++) {
    const line = paylines[lineIdx]
    if (!line) continue

    const rows = line.rows
    let node = root
    nodeLists.get(node)?.push(lineIdx)

    for (let reel = 0; reel < reelCount; reel++) {
      const row = rows[reel]
      if (row === undefined) break

      let child = node.children[row]

      if (!child) {
        child = createNode(rowCount)
        // Use a non-null assertion or cast because we know children is an array of size rowCount
        ;(node.children as (TrieNode | null)[])[row] = child
        nodeLists.set(child, [])
      }

      nodeLists.get(child)?.push(lineIdx)
      node = child
    }
  }

  return { root, nodeLists }
}

/**
 * Phase 2: DFS to assign contiguous payline ranges.
 * Leaf nodes push their payline indices into `paylineOrder`.
 * Internal nodes span from first descendant's start to last descendant's end.
 */
function assignContiguousRanges(
  root: TrieNode,
  rowCount: number,
  nodeLists: Map<TrieNode, number[]>,
): number[] {
  const paylineOrder: number[] = []

  function dfs(node: TrieNode): void {
    node.plStart = paylineOrder.length

    let hasChild = false
    for (let row = 0; row < rowCount; row++) {
      const child = node.children[row]
      if (child) {
        dfs(child)
        hasChild = true
      }
    }

    // leaf: push actual payline indices
    if (!hasChild) {
      const indices = nodeLists.get(node)
      if (indices) {
        for (const ln of indices) {
          paylineOrder.push(ln)
        }
      }
    }

    node.plEnd = paylineOrder.length
  }

  dfs(root)
  return paylineOrder
}

// ── Public API ──

export function buildPaylineTrie(
  paylines: readonly PaylineDefinition[],
  reelCount: number,
  rowCount: number,
): PaylineTrie {
  const { root, nodeLists } = insertPaylines(paylines, reelCount, rowCount)
  const paylineOrder = assignContiguousRanges(root, rowCount, nodeLists)

  return { root, paylineOrder }
}
