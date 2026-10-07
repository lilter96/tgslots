import { describe, expect, test } from 'bun:test'
import { evaluateSpin } from '@tgslots/slots-core/paylines/evaluator'
import { engine as dragonEngine } from '@tgslots/ancient-dragon/engine'
import { engine as forestEngine } from '@tgslots/woodland-whisper/engine'
import {
  PAYLINE_DATA as dragonLines,
  SYM_NAMES as dragonNames,
} from '@tgslots/ancient-dragon/constants'
import {
  PAYLINE_DATA as forestLines,
  SYM_NAMES as forestNames,
} from '@tgslots/woodland-whisper/constants'
import { gameRules } from '../../app/game-rules.js'
import { manifest as dragonManifest } from '../../games/ancient-dragon/manifest.js'
import { manifest as forestManifest } from '../../games/woodland-whisper/manifest.js'

// Independent, deliberately simple evaluator: scan each configured line directly.
// It reads the authoring paytable rather than the engine's precomputed trie/table.
function reference(
  grid: number[][],
  lines: Uint8Array,
  names: readonly string[],
  paytable: Record<string, Record<string, number>>,
): Array<{ lineIndex: number; matchCount: number; totalPayout: number }> {
  const hits = []
  for (let line = 0; line < lines.length / 5; line++) {
    const symbols = Array.from({ length: 5 }, (_, reel) => grid[lines[line * 5 + reel]!]![reel]!)
    const target = symbols.find((symbol) => symbol !== 0)
    let count = 0
    for (const symbol of symbols) {
      if (symbol !== 0 && symbol !== target) break
      count++
    }
    const payout =
      target === undefined
        ? Math.max(0, ...Object.values(paytable).map((pays) => pays[String(count)] ?? 0))
        : (paytable[names[target]!]?.[String(count)] ?? 0)
    if (payout > 0) hits.push({ lineIndex: line, matchCount: count, totalPayout: payout })
  }
  return hits
}

describe('every payline against an independent authoring-paytable reference', () => {
  for (const [manifest, engine, lines, names] of [
    [dragonManifest, dragonEngine, dragonLines, dragonNames],
    [forestManifest, forestEngine, forestLines, forestNames],
  ] as const) {
    test(`${manifest.gameId}: every symbol, 3/4/5 matches and every wild placement on every line`, () => {
      const paytable = gameRules[manifest.gameId]!.paytable
      const scatter = manifest.symbols.find((symbol) => symbol.kind === 'scatter')!.id
      let cases = 0
      for (let line = 0; line < lines.length / 5; line++) {
        for (const name of Object.keys(paytable)) {
          const symbol = names.indexOf(name)
          expect(symbol).toBeGreaterThan(0)
          for (const count of [3, 4, 5]) {
            for (let wildMask = 0; wildMask < 1 << count; wildMask++) {
              const grid = Array.from({ length: 3 }, () => Array<number>(5).fill(scatter))
              for (let reel = 0; reel < count; reel++) {
                grid[lines[line * 5 + reel]!]![reel] = wildMask & (1 << reel) ? 0 : symbol
              }
              const actual = evaluateSpin(
                {
                  reelCount: 5,
                  rowCount: 3,
                  getSymbol: (reel: number, row: number) => grid[row]![reel]!,
                  getMultiplier: () => 1,
                },
                engine,
              )
              const expected = reference(grid, lines, names, paytable)
              expect(
                actual.hits
                  .map(({ lineIndex, matchCount, totalPayout }) => ({
                    lineIndex,
                    matchCount,
                    totalPayout,
                  }))
                  .sort((a, b) => a.lineIndex - b.lineIndex),
              ).toEqual(expected)
              expect(actual.totalWin).toBe(expected.reduce((sum, hit) => sum + hit.totalPayout, 0))
              cases++
            }
          }
        }
      }
      expect(cases).toBe((lines.length / 5) * Object.keys(paytable).length * (8 + 16 + 32))
      for (const symbol of manifest.symbols) expect(names[symbol.id]).toBe(symbol.name)
    })
  }
})
