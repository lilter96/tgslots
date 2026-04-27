import { BetConfiguration } from '@tgslots/slots-core/betting/config'
import config from '../config/config.json' with { type: 'json' }

export const BET_CONFIG = BetConfiguration.fromLineCount(config.game_metadata.lines)

// ─── Symbols ───────────────────────────────────────────────────────────────

export const SYM_NAMES = [...config.symbols.regular] as const

export type SymbolName = (typeof SYM_NAMES)[number]

export const Symbols = SYM_NAMES.reduce(
  (acc, name, index) => {
    acc[name as SymbolName] = index
    return acc
  },
  {} as Record<SymbolName, number>,
)

// ─── Pay Table ─────────────────────────────────────────────────────────────

// Index 0: 2-of-a-kind, Index 1: 3-of-a-kind, Index 2: 4-of-a-kind, Index 3: 5-of-a-kind
const _PAY_TABLE: number[][] = Array.from({ length: SYM_NAMES.length }, () => [0, 0, 0, 0])

const paytable = config.paytable as Record<string, Record<string, number>>
Object.entries(paytable).forEach(([symName, pays]) => {
  const symId = Symbols[symName as SymbolName]
  if (symId !== undefined) {
    Object.entries(pays).forEach(([count, pay]) => {
      const idx = parseInt(count) - 2
      if (idx >= 0 && idx <= 3) {
        const row = _PAY_TABLE[symId]
        if (row) row[idx] = pay
      }
    })
  }
})

export const PAY_TABLE: readonly (readonly number[])[] = _PAY_TABLE

// ─── Scatter Pay ───────────────────────────────────────────────────────────

// Index = scatter count; values are multipliers applied to total bet
const _SCATTER_PAY = [0, 0, 0, 0, 0, 0]

const scatterPay = config.scatter_paytable.YINYANG as Record<string, number>
Object.entries(scatterPay).forEach(([count, pay]) => {
  const idx = parseInt(count)
  if (idx >= 0 && idx <= 5) _SCATTER_PAY[idx] = pay
})

export const SCATTER_PAY: readonly number[] = _SCATTER_PAY

// ─── Paylines ──────────────────────────────────────────────────────────────

// 25 paylines for 5-reel 3-row game; row indices: 0=top, 1=middle, 2=bottom
export const PAYLINE_DATA = new Uint8Array([
  1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 0, 1, 2, 1, 0, 2, 1, 0, 1, 2, 0, 0, 1, 0, 0, 2, 2, 1,
  2, 2, 1, 0, 1, 0, 1, 1, 2, 1, 2, 1, 0, 1, 0, 1, 0, 2, 1, 2, 1, 2, 1, 0, 0, 0, 1, 1, 2, 2, 2, 1, 0,
  1, 1, 1, 0, 2, 1, 1, 1, 2, 1, 1, 0, 1, 1, 1, 1, 2, 1, 1, 0, 0, 2, 0, 0, 2, 2, 0, 2, 2, 0, 2, 0, 2,
  0, 2, 0, 2, 0, 2, 0, 2, 2, 2, 0, 2, 0, 0, 0, 2, 1, 0, 2, 0, 1, 1, 2, 0, 2, 1,
])

// ─── Reel Strips ───────────────────────────────────────────────────────────

const strips = config.reel_strips
export const STRIP_STRINGS: readonly string[][] = [
  strips.reel1,
  strips.reel2,
  strips.reel3,
  strips.reel4,
  strips.reel5,
]

// ─── Mystery / INNER Symbol Weights ────────────────────────────────────────

// Count occurrences of each symbol in the inner reel to derive weights
const innerCounts = new Map<string, number>()
for (const sym of config.inner_reel_strip.reel1) {
  innerCounts.set(sym, (innerCounts.get(sym) ?? 0) + 1)
}

export const INNER_WEIGHTS: readonly (readonly [number, number])[] = Array.from(
  innerCounts.entries(),
).map(([symName, count]) => [Symbols[symName as SymbolName]!, count] as const)
