import { buildPaylineTrie, type PaylineTrie } from './payline-trie.js'
import { createSymbolRegistry, type SymbolRegistry } from '../symbol-registry.js'
import { buildFlatPaytable, type FlatPaytable } from '../paytable/flat-paytable.js'
import type { GameWithPaylinesConfig } from '../game-config.js'

export interface SlotWithPaylinesEngine {
  readonly trie: PaylineTrie
  readonly symbols: SymbolRegistry
  readonly paytable: FlatPaytable
  readonly reelCount: number
  readonly rowCount: number
}

/** Builds the engine once at game load. All hot-path structures are pre-allocated. */
export function createSlotEngine(config: GameWithPaylinesConfig): SlotWithPaylinesEngine {
  const wildSymbol = config.wildSymbol ?? 'WILD'

  const symbols = createSymbolRegistry(Object.keys(config.paytable), wildSymbol)

  const paytable = buildFlatPaytable(config.paytable, symbols, config.reelCount)

  const trie = buildPaylineTrie(config.paylines, config.reelCount, config.rowCount)

  return {
    trie,
    symbols,
    paytable,
    reelCount: config.reelCount,
    rowCount: config.rowCount,
  }
}

export interface RawGameArrays {
  readonly paylineData: Uint8Array
  readonly reelCount: number
  readonly rowCount: number
  readonly wildSymbol: string
  readonly payTable: readonly (readonly number[])[]
  readonly symbols: Record<string, number>
}

/** Converts flat array constants (PAYLINE_DATA, PAY_TABLE, Symbols) into a ready engine. */
export function buildEngineFromArrays(raw: RawGameArrays): SlotWithPaylinesEngine {
  const paylines: { rows: number[] }[] = []
  for (let i = 0; i < raw.paylineData.length; i += raw.reelCount) {
    paylines.push({
      rows: Array.from({ length: raw.reelCount }, (_, j) => raw.paylineData[i + j]!),
    })
  }

  const paytable: Record<string, Record<number, number>> = {}
  for (const [name, id] of Object.entries(raw.symbols)) {
    const row = raw.payTable[id]
    if (!row) continue
    const entry: Record<number, number> = {}
    row.forEach((p, idx) => {
      if (p > 0) entry[idx + 2] = p
    })
    if (Object.keys(entry).length > 0) paytable[name] = entry
  }

  return createSlotEngine({
    reelCount: raw.reelCount,
    rowCount: raw.rowCount,
    wildSymbol: raw.wildSymbol,
    paytable,
    paylines,
  })
}
