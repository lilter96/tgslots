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

Shared slot engine primitives: symbol registry, payline and scatter evaluation, cluster-pays evaluation, cascade/tumble orchestration, flat paytable lookups, projected grids, and integer-credit betting primitives. Supports both payline-based and cluster-pays evaluation models. Used by all game packages and the simulation runner.

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

### Cluster Pays evaluation

```typescript
interface GameWithClustersConfig extends BasicSlotGameConfig, GameWithPayTableConfig {
  readonly wildSymbol?: string
  readonly scatterDefinition?: ScatterDefinition
}
interface ClusterSlotEngine {
  readonly symbols: SymbolRegistry
  readonly paytable: FlatPaytable    // sized for cluster sizes (gridArea + 1)
  readonly reelCount: number
  readonly rowCount: number
  readonly gridArea: number
  readonly scatterId: SymbolId | null
}
function createClusterSlotEngine(config: GameWithClustersConfig): ClusterSlotEngine
function evaluateClusters(grid: EvalGrid, engine: ClusterSlotEngine): ClusterEvaluationResult
function buildClusterPaytable(config: PaytableConfig, registry: SymbolRegistry, gridArea: number): FlatPaytable

interface ClusterHit {
  readonly symbolId: SymbolId; readonly symbolName: string; readonly size: number
  readonly basePayout: number; readonly totalPayout: number
  readonly positions: readonly number[]  // reel * rowCount + row
}
interface ClusterEvaluationResult { readonly totalWin: number; readonly hits: readonly ClusterHit[] }
```

### Cascade / tumble

```typescript
interface RefillSource { drawNext(reel: number): SymbolId }

class MutableCascadeGrid implements EvalGrid {
  static fromProjection(grid: EvalGrid): MutableCascadeGrid
  clearAt(positions: readonly number[]): void
  applyGravity(refill: (reel: number) => SymbolId): void
}

function collectVanishPositions(hits: readonly ClusterHit[], grid: EvalGrid, engine: ClusterSlotEngine): readonly number[]

class CascadeEngine {
  constructor(slot: ClusterSlotEngine, options?: CascadeOptions)
  run(initialGrid: EvalGrid, refill: RefillSource): CascadeResult
}

function createCascadeSampler(
  engine: ClusterSlotEngine,
  initialGridSampler: Sampler<EvalGrid>,
  refillSamplers: readonly Sampler<SymbolId>[],
  options?: CascadeOptions,
): Sampler<CascadeResult>
```

## Dependencies

- `[[math]]` (`Sampler<T>`, `Rng` types used by cascade sampler and higher layers)
