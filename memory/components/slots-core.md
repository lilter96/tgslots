# Component: Slots Core

## Package

`@tgslots/slots-core` — `packages/slots-core/`

## Responsibility

Shared slot engine primitives: symbol registry, payline evaluation (iterative DFS via prefix trie), flat paytable lookups. Used by all game packages.

## Public API

### GameConfig

```typescript
interface GameConfig {
  rows: number
  reels: number
  paylines: ReadonlyArray<ReadonlyArray<number>>
}
```

### SymbolRegistry

```typescript
class SymbolRegistry {
  constructor(symbols: string[])
  getId(symbol: string): SymbolId
  getSymbol(id: SymbolId): string
  size: number
}
```

### Scatter Evaluation

```typescript
interface ScatterDefinition {
  symbolId: number
  payouts: number[] // Index = count
}

// Grid-based engine — O(R×C) per spin; useful when positions are unavailable
class BaseScatterEngine implements ScatterEngine {
  constructor(def: ScatterDefinition)
  evaluate(grid: EvalGrid, bet: number): ScatterResult
}

// Positional engine — O(R) per spin via prefix-sum precomputation at init O(R×N)
// Requires strips + row count at construction; call evaluateAtPositions in hot path
class PrecomputedScatterEngine implements PositionalScatterEngine {
  constructor(def: ScatterDefinition, strips: readonly Uint8Array[], rows: number)
  evaluateAtPositions(positions: readonly number[], bet: number): ScatterResult
}
```

### PaylineTrie

```typescript
// Prefix trie — groups paylines by shared prefixes for batch evaluation
function buildPaylineTrie(paylines: number[][]): PaylineTrie
```

### FlatPaytable

```typescript
// O(1) lookup: (symbolId, count) → win multiplier
class FlatPaytable {
  constructor(config: PaytableConfig)
  lookup(symbolId: SymbolId, count: number): number
}
```

### SlotEngine (combined)

```typescript
// Build engine from raw array constants (PAYLINE_DATA flat Uint8Array, PAY_TABLE, Symbols enum)
interface RawGameArrays {
  paylineData: Uint8Array // flat: reelCount values per payline
  reelCount: number
  rowCount: number
  wildSymbol: string
  payTable: readonly (readonly number[])[] // [symbolId][matchCount-2] → multiplier
  symbols: Record<string, number> // name → id
}
function buildEngineFromArrays(raw: RawGameArrays): SlotWithPaylinesEngine

// Low-level constructor — prefer buildEngineFromArrays for game packages
function createSlotEngine(config: GameWithPaylinesConfig): SlotWithPaylinesEngine
```

## Dependencies

- `[[math]]` (Rng, symbol types)
