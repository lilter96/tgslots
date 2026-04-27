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

Parallel simulation runner with worker-thread fanout, generic scoped metrics collection, normalized reference comparisons, CLI reporting, and self-contained HTML visualization.

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
  recordResultMetrics?(collector: DataCollector, result: T, context: { phase: 'spin' | 'next'; wager: Wager }): void
  recordRoundMetrics?(collector: DataCollector, round: RoundMetricsSnapshot, wager: Wager): void
  readonly state: S
}

interface DataCollector {
  beginRound(bet: number): void
  collect(result: SpinResult): void
  endRound(): void
  scope(path: string | string[]): ScopedMetrics
  count(name: string, amount?: number): void
  value(name: string, observed: number): void
  distribution(name: string, bucket: string, amount?: number): void
  /** Aggregate-style: count/avg/total/min/max. No ratio field. */
  payout(name: string, amount: number): void
  /** Wager-normalized: ratio = total / cumulative-totalBet at finalize. */
  rtp(name: string, amount: number): void
  getLastRoundSnapshot(): RoundMetricsSnapshot | null
  getRawMetrics(): RawSimulationMetrics
}

interface SimulationMetrics {
  schemaVersion: 2
  summary: SimulationSummary
  scopes: FinalMetricScope
}
```

### Runner (`runner/index.ts`)

```typescript
async function runSimulation(
  workerPath: URL,
  config: SimRunnerConfig & { betMultiplier?: number; betConfig?: BetConfiguration },
  progressCallback?: (snapshot: SimulationMetrics, elapsedSec: number) => void,
): Promise<SimRunnerResult>
```

### CLI (`cli/index.ts`)

```typescript
type ParsheetConfig = LegacyParsheetConfig | NormalizedParsheetConfig

function parseSimArgs(defaults?: Partial<SimCliOpts>): SimCliOpts
async function runAndPrint(...): Promise<void>
async function printSimResult(...): Promise<void>
```

### Visualization (`visualizer/`)

```typescript
async function visualizeMetrics(report: SimulationJsonReport, outputPath: string): Promise<void>
```

Composed module split across `index.ts`, `template.ts`, `styles.ts`, `client.ts`, `assets.ts`, `labels.ts`, `format.ts`, and `sections/{header,kpis,rtp-donut,comparisons,distribution,scopes,toc}.ts`. ApexCharts UMD bundle is read at render time from `node_modules` and embedded inline so reports open offline.

## Engine-emitted metrics (root scope)

| Name | Kind | Meaning |
| --- | --- | --- |
| `rounds` | count | Rounds played. |
| `round-rtp` | rtp | Per-round RTP contribution; `ratio` equals `summary.rtp`. |
| `round-win-amount` | value | Round win aggregate (avg/min/max/sum). |
| `spins-per-round` | value | Spin results per round (avg/min/max). |
| `round-win-multiplier` | distribution | Bucketed `roundWin / bet`. |
| `spin-types/<type>/results` | count | Spin results per spin type (BASE/FREE/PICK). |

## Key Behaviors

- Built-in summary metrics are intentionally small: rounds, bet/win totals, variance, max round win, round-win distribution, and result-type distribution.
- Game-specific telemetry must be recorded through scoped collector APIs in `recordResultMetrics()` and/or `recordRoundMetrics()`, not by expanding `SpinResult` into a slot-specific reporting schema.
- Reference comparisons are normalized into selector-based targets and may carry an optional `category` (`rtp` / `cycle` / `average` / `distribution` / `count`) plus `description`, both consumed by the visualizer for grouping and tooltips. CLI verify mode and HTML dashboards compare the same resolved metrics.
- `--visualize` writes a self-contained HTML dashboard with ApexCharts inlined: KPI count-up cards, RTP composition donut, tolerance-band comparison cards, distribution histograms, spin-type donut, collapsible scope tree with per-metric charts (gauge/bar/min-max/distribution), sticky TOC, and dark/light theme toggle. No CDN access required.

## Dependencies

- `[[math]]` (Rng type)
- `[[slots-core]]` (BetConfiguration, Wager)
- `node:worker_threads`, `node:os`, `node:fs`

## Worker Protocol

Each game provides a worker entry point (for example `ancient-dragon-worker.ts`) that:

1. Receives `workerData` containing spin count, seed, warmup, batch size, and serialized betting config.
2. Runs the game state machine through `runWorkerLoop()`.
3. Posts periodic raw scoped metrics snapshots and one final aggregated result back to the parent worker host.
