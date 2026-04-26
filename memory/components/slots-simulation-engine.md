---
title: "Slots Simulation Engine"
type: "component"
aliases: 
- "slots-simulation-engine"
tags: 
- "memory"
- "component"
- "slots-simulation-engine"
up: 
- "[[index]]"
- "[[architecture]]"
- "[[dependencies]]"
component: "slots-simulation-engine"
---
# Component: Slots Simulation Engine

## Package

`@tgslots/slots-simulation-engine` — `packages/slots-simulation-engine/`

## Responsibility

Parallel simulation runner: distributes spin work across CPU worker threads, collects detailed metrics, formats reports, and can emit JSON/HTML/PDF outputs.

## Public API

### Core state-machine types (`core/state-machine.ts`)

```typescript
interface SpinResult {
  type: 'BASE' | 'FREE' | 'RESPIN'
  win: number
  isTrigger: boolean
  isRetrigger?: boolean
  scatters?: number
  featureType?: string
}

interface StateMachine<T extends SpinResult = SpinResult, S = unknown> {
  spin(rng: Rng, wager: Wager): T
  next(rng: Rng): T | null
  readonly state?: S
}

class ModernDataCollector {
  beginRound(bet: number): void
  collect(result: SpinResult): void
  endRound(): void
  getRawMetrics(): RawSimulationMetrics
}

interface SimulationMetrics {
  totalSamples: number
  totalBet: number
  rtp: { total: number; base: number; feature: number; withoutJackpots: number }
  hitRates: { baseHitRate: number; featureTriggerRate: number }
  features: { totalTriggers: number; totalRetriggers: number; averageFeatureWin: number }
  scatter: { distribution: Record<string, number>; cycle: number }
  variance: { mean: number; variance: number; stdDev: number }
  maxWinObserved: number
  winDistribution: Record<string, number>
}
```

### Runner (runner/index.ts)

```typescript
async function runSimulation(
  workerPath: URL,
  config: SimRunnerConfig & { betMultiplier?: number; betConfig?: BetConfiguration },
  progressCallback?: (snapshot: SimulationMetrics, elapsedSec: number) => void,
): Promise<SimRunnerResult>

function performWarmup<T extends SpinResult>(...): void
function runWorkerLoop<T extends SpinResult>(...): void
```

### CLI (cli/index.ts)

```typescript
function parseSimArgs(defaults?: Partial<SimCliOpts>): SimCliOpts
async function runAndPrint(...): Promise<void>
function printSimResult(...): void
```

### Visualizer (`visualizer/index.ts`)

```typescript
async function visualizeMetrics(metrics: SimulationMetrics, outputPath: string): Promise<void>
```

## Dependencies

- `[[math]]` (Rng type)
- `[[slots-core]]` (BetConfiguration, Wager)
- `chart.js`, `chartjs-node-canvas`, `pdfkit`
- `node:worker_threads`, `node:os`

## Worker Protocol

Each game provides a worker entry point (for example `ancient-dragon-worker.ts`) that:

1. Receives `workerData` containing spin count, seed, warmup, batch size, and serialized betting config.
2. Runs the game state machine through `runWorkerLoop()`.
3. Posts periodic snapshots and one final aggregated result back to the parent worker host.
