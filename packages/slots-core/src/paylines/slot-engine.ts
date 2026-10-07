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

  // Grids and strips already contain these integer IDs. Compacting the registry
  // to paying symbols changes their meaning when a non-paying symbol is interleaved.
  const entries = Object.entries(raw.symbols)
  const toId = new Map(entries)
  const toName = Array<string>(Math.max(-1, ...entries.map(([, id]) => id)) + 1).fill('')
  for (const [name, id] of entries) {
    if (!Number.isInteger(id) || id < 0 || toName[id]) {
      throw new Error(`Invalid or duplicate symbol ID: ${name}=${id}`)
    }
    toName[id] = name
  }
  const wildId = toId.get(raw.wildSymbol)
  if (wildId === undefined) throw new Error(`Missing wild symbol: ${raw.wildSymbol}`)
  const symbols: SymbolRegistry = { toId, toName, wildId, count: toName.length }
  return {
    reelCount: raw.reelCount,
    rowCount: raw.rowCount,
    symbols,
    paytable: buildFlatPaytable(paytable, symbols, raw.reelCount),
    trie: buildPaylineTrie(paylines, raw.reelCount, raw.rowCount),
  }
}
