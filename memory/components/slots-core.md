---
title: "Slots Core"
type: "component"
aliases: 
- "slots-core"
tags: 
- "memory"
- "component"
- "slots-core"
up: 
- "[[index]]"
- "[[architecture]]"
- "[[dependencies]]"
component: "slots-core"
---
# Component: Slots Core

## Package

`@tgslots/slots-core` — `packages/slots-core/`

## Responsibility

Shared slot engine primitives: symbol registry, payline and scatter evaluation, flat paytable lookups, projected grids, and integer-credit betting primitives. Used by all game packages and the simulation runner.

## Public API

### Core config and engine

```typescript
interface GameWithPaylinesConfig {
  readonly reelCount: number
  readonly rowCount: number
  readonly paytable: PaytableConfig
  readonly paylines: readonly PaylineDefinition[]
  readonly scatterDefinition?: ScatterDefinition
  readonly wildSymbol?: string
}
function createSlotEngine(config: GameWithPaylinesConfig): SlotWithPaylinesEngine
function buildEngineFromArrays(raw: RawGameArrays): SlotWithPaylinesEngine
```

### Registry, evaluation, and scatter

```typescript
function createSymbolRegistry(paytableSymbols: readonly string[], wildSymbol: string): SymbolRegistry
function evaluateSpin(grid: EvalGrid, engine: SlotWithPaylinesEngine): EvaluationResult
class BaseScatterEngine { evaluate(grid: EvalGrid, bet: number): ScatterResult }
class PrecomputedScatterEngine {
  evaluateAtPositions(positions: readonly number[], bet: number): ScatterResult
}
```

### Betting

```typescript
class BetConfiguration { static fromLineCount(lineCount: number): BetConfiguration }
class MultiFrameBetConfiguration { static build(...): MultiFrameBetConfiguration }
class Wager { constructor(multiplier: number, config: BetConfiguration) }
```

## Dependencies

- `[[math]]` (Rng-related types used by higher layers)
