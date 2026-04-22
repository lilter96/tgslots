# Architecture

## Technology Stack

| Concern         | Choice                           |
| --------------- | -------------------------------- |
| Runtime         | Bun v1.3.12+                     |
| Language        | TypeScript 5.9, strict mode, ESM |
| Package manager | Bun workspaces                   |
| Testing         | bun:test (0% coverage currently) |
| Parallelism     | node:worker_threads via Bun      |

## Repository Layout

```
tgslots/                        ← Bun monorepo root
├── packages/
│   ├── math/                   ← @tgslots/math
│   ├── slots-core/             ← @tgslots/slots-core
│   ├── slots-simulation-engine/← @tgslots/slots-simulation-engine
│   └── games/
│       ├── ancient-dragon/     ← @tgslots/ancient-dragon
│       └── woodland-whisper/   ← @tgslots/woodland-whisper
└── apps/
    └── simulations/            ← CLI entry points (not a publishable package)
```

## Layer Architecture

```
┌─────────────────────────────────┐
│       apps/simulations          │  CLI, worker spawning
├─────────────────────────────────┤
│  @tgslots/slots-simulation-engine│  Parallel runner, metrics, state machine
├──────────────┬──────────────────┤
│ @tgslots/    │ @tgslots/        │
│ ancient-     │ woodland-        │  Game logic, constants, sampling
│ dragon       │ whisper          │
├──────────────┴──────────────────┤
│       @tgslots/slots-core       │  Paylines, paytable, symbol registry
├─────────────────────────────────┤
│         @tgslots/math           │  RNG, Sampler, Distribution, functionals
└─────────────────────────────────┘
```

## Module Structure (per package)

### @tgslots/math

```
src/
  rng/           mt19937.ts (Mersenne Twister), types.ts
  probability/   distribution.ts (Sampler + Distribution monads), sampling-plan.ts
  samplers/      alias-sampler.ts (O(1) Walker-Vose), cumulative-sampler.ts, linear-sampler.ts
  functional/    either.ts (Either<L,R>), array1.ts (NonEmptyArray)
  index.ts       barrel export
```

### @tgslots/slots-core

```
src/
  game-config.ts       GameConfig interface
  symbol-registry.ts   SymbolId ↔ string bidirectional map
  paylines/
    types.ts           PaylineHit, EvaluationResult, ScatterDefinition
    evaluator.ts       Iterative DFS payline evaluator + Scatter evaluation
    payline-trie.ts    Prefix trie for payline grouping
    slot-engine.ts     Combines trie + paytable
  paytable/
    flat-paytable.ts   Flat O(1) lookup
    paytable-config.ts Config validation
  spin-grid/
    spin-grid.ts       EvalGrid interface
```

### @tgslots/slots-simulation-engine

```
src/
  core/state-machine.ts   SimulationEvent, ModernDataCollector, Metrics types
  runner/index.ts          Parallel worker pool (os.cpus() workers)
  cli/index.ts             Arg parsing, table formatting, RTP verify mode
  index.ts                 barrel export
```

### @tgslots/ancient-dragon

```
src/
  constants.ts         Symbols, paytable table, reel strips (5×), 100 paylines
  engine.ts            SlotEngine initialization
  evaluation.ts        Grid evaluation, scatter counting
  logic.ts             Spin sampling
  game-state-machine.ts State machine (base/free spin states)
  index.ts             barrel export
```

- **Uses** `@tgslots/slots-core`
- Wild: GOLDDRAGON, Scatter: YINYANG, Mystery: INNER

### @tgslots/woodland-whisper

```
src/
  constants.ts         Loads from config/config.json
  engine.ts            SlotEngine initialization
  evaluation.ts        Grid evaluation (uses slots-core)
  logic.ts             Sampling + strip encoding
  game-state-machine.ts State machine + pick bonus logic
  index.ts             barrel export
config/config.json     Complete game config (symbols, paylines, reels)
```

- **Uses** `@tgslots/slots-core`
- Wild: WOMAN, Scatter: COIN, Pick Bonus: matching pair → free spins
- Free spin multiplier: 2x

## Key Design Decisions

- **State machine pattern** for game flow (base game ↔ feature states)
- **Sampler monad** for composable probabilistic sampling
- **Alias sampler** for O(1) weighted reel sampling in hot path
- **Worker threads** for embarrassingly parallel simulation
- **Integer symbol IDs** (not strings) in evaluation hot path
- Config-driven (Woodland Whisper JSON config; Ancient Dragon inline constants)

## Architectural Gaps (as of 2026-04-21)

1. No test infrastructure
2. No Telegram bot layer yet (simulation-only project)
3. No wallet/economy service
