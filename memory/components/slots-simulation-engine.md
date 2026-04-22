# Component: Slots Simulation Engine

## Package

`@tgslots/slots-simulation-engine` — `packages/slots-simulation-engine/`

## Responsibility

Parallel simulation runner: distributes spin work across CPU worker threads, collects metrics, formats results. Also provides CLI arg parsing and RTP verification mode.

## Public API

### State Machine Types (core/state-machine.ts)

```typescript
// Events games emit during simulation
type SimulationEvent =
  | { type: 'spin'; betAmount: number; winAmount: number }
  | { type: 'feature_trigger'; featureType: string }
  | { type: 'feature_retrigger'; featureType: string }
  | { type: 'feature_win'; winAmount: number }

// Collects events from one simulation run
class ModernDataCollector {
  emit(event: SimulationEvent): void
  getMetrics(): Metrics
}

// Final simulation metrics
interface Metrics {
  totalSpins: number
  totalBet: number
  totalWin: number
  rtp: number
  baseGame: { totalWin: number; winRate: number; averageWin: number }
  feature: { totalTriggers: number; totalRetriggers: number; averageFeatureWin: number }
  maxWinObserved: number
  winDistribution: Record<string, number>
}
```

### Runner (runner/index.ts)

```typescript
// Game adapter interface — implemented by each game
interface GameAdapter {
  createWorkerUrl(): URL
  getDefaultSpins(): number
}

// Parallel runner
async function runSimulation(
  workerPath: string,
  totalSpins: number,
  workerCount?: number, // defaults to os.cpus().length
): Promise<Metrics>
```

### CLI (cli/index.ts)

```typescript
// Parses process.argv, runs simulation, prints formatted table
async function runCli(adapter: GameAdapter): Promise<void>

// Modes
// --mode verify    : higher spin count, strict RTP assertion
// --workers N      : override worker count
// --spins N        : override spin count
```

## Dependencies

- `[[math]]` (Rng type)
- `node:worker_threads`, `node:os` (Bun built-ins)

## Worker Protocol

Each game provides a worker entry point (e.g., `ancient-dragon-worker.ts`) that:

1. Receives `{ spins: number; seed: number }` via `parentPort.on('message')`
2. Runs the game state machine N times
3. Posts `Metrics` back via `parentPort.postMessage`
