---
title: "Architecture"
type: "architecture"
tags: 
- "memory"
- "architecture"
up: 
- "[[index]]"
---
# Architecture

## Technology Stack

| Concern         | Choice                           |
| --------------- | -------------------------------- |
| Runtime         | Bun v1.3.12+                     |
| Language        | TypeScript 5.9, strict mode, ESM |
| Package manager | Bun workspaces                   |
| Testing         | bun:test (11 files / 168 passing tests as of 2026-04-26) |
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
│  @tgslots/slots-simulation-engine│  Parallel runner, scoped metrics, reports
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
  probability/   distribution.ts (Sampler, Distribution, TrackedDistribution), sampling-plan.ts
  samplers/      alias-sampler.ts (O(1) Walker-Vose), cumulative-sampler.ts, linear-sampler.ts
  functional/    either.ts (Either<L,R>), array1.ts (NonEmptyArray)
  index.ts       root exports RNG + utility primitives
```

### @tgslots/slots-core

```
src/
  game-config.ts       core slot config interfaces
  symbol-registry.ts   symbol name ↔ integer ID registry
  paylines/
    types.ts           PaylineHit, EvaluationResult, ScatterDefinition
    evaluator.ts       Iterative DFS payline evaluator + Scatter evaluation
    payline-trie.ts    Prefix trie for payline grouping
    slot-engine.ts     Combines trie + paytable
  scatter/
    evaluator.ts       Grid-based scatter evaluator
    precomputed-engine.ts Precomputed O(R) positional scatter evaluator
  paytable/
    flat-paytable.ts   Flat O(1) lookup
    paytable-config.ts Config validation
  spin-grid/
    spin-grid.ts       EvalGrid interface
  betting/
    config.ts          BetConfiguration and MultiFrameBetConfiguration
    wager.ts           integer-credit Wager model
```

### @tgslots/slots-simulation-engine

```
src/
  core/state-machine.ts   StateMachine, scoped collectors, raw/finalized metrics
  runner/index.ts         Parallel worker pool + snapshot reporting
  cli/index.ts            Arg parsing, benchmark/verify/sample modes, JSON/HTML output
  cli/comparison.ts       Normalized parsheet comparisons and selectors
  visualizer/index.ts     Self-contained HTML dashboard generation
  index.ts                root exports core state-machine types
```

### @tgslots/ancient-dragon

```
src/
  constants.ts         Symbols, paytable table, reel strips (5×), 100 paylines
  engine.ts            SlotEngine initialization
  logic.ts             Wager-aware sampler + scatter evaluation
  game-state-machine.ts State machine (base/free spin states)
  index.ts             exports StateMachine, BET_CONFIG, SIM_CONFIG
```

- **Uses** `@tgslots/slots-core`
- Wild: GOLDDRAGON, Scatter: YINYANG, Mystery: INNER

### @tgslots/woodland-whisper

```
src/
  constants.ts         Loads from config/config.json
  engine.ts            SlotEngine initialization
  logic.ts             Wager-aware sampler, pick bonus sampling, free-spin handling
  game-state-machine.ts State machine + pick bonus / free-spin transitions
  index.ts             exports StateMachine, sampler, BET_CONFIG, SIM_CONFIG
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
- **Integer credit betting model** via `BetConfiguration` and `Wager`
- Config-driven (Woodland Whisper JSON config; Ancient Dragon inline constants)

## Architectural Gaps (as of 2026-04-26)

1. Test coverage is still concentrated in `math` and `slots-core` betting; game packages and simulation-engine need direct tests.
2. No Telegram bot layer yet (simulation-only project).
3. No wallet/economy service.
4. No CI pipeline is documented or present in the repo.
