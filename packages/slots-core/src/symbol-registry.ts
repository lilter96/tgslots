/** Internal integer ID for symbols. Avoids string comparisons in hot path. */
export type SymbolId = number

/** Sentinel: no base symbol resolved yet (all wilds so far). */
export const UNRESOLVED_SYMBOL: SymbolId = -1

export interface SymbolRegistry {
  readonly toId: ReadonlyMap<string, SymbolId>
  readonly toName: readonly string[]
  readonly wildId: SymbolId
  readonly count: number
}

export function createSymbolRegistry(
  paytableSymbols: readonly string[],
  wildSymbol: string,
): SymbolRegistry {
  const toId = new Map<string, SymbolId>()
  const toName: string[] = []

  const register = (name: string): SymbolId => {
    const existing = toId.get(name)
    if (existing !== undefined) return existing

    const id = toName.length
    toId.set(name, id)
    toName.push(name)
    return id
  }

  // wild always gets id 0 for fast comparison
  const wildId = register(wildSymbol)

  for (const sym of paytableSymbols) {
    register(sym)
  }

  return { toId, toName, wildId, count: toName.length }
}
