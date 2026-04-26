---
title: "Dependency Graph"
type: "dependency-graph"
tags: 
- "memory"
- "dependencies"
up: 
- "[[index]]"
---
# Dependency Graph

## Package Dependency Graph

```
apps/simulations
  ├── @tgslots/math                  (mt19937 RNG seed)
  ├── @tgslots/slots-simulation-engine
  ├── @tgslots/ancient-dragon
  └── @tgslots/woodland-whisper

@tgslots/ancient-dragon
  ├── @tgslots/math                  (Rng, Sampler, Array1, SamplingPlan)
  ├── @tgslots/slots-core            (slot engine, scatter engine, betting, projected grid)
  └── @tgslots/slots-simulation-engine (StateMachine and SpinResult types)

@tgslots/woodland-whisper
  ├── @tgslots/math                  (Rng, Sampler, Array1, SamplingPlan)
  ├── @tgslots/slots-core            (slot engine, scatter engine, betting, projected grid)
  └── @tgslots/slots-simulation-engine (StateMachine and SpinResult types)

@tgslots/slots-simulation-engine
  ├── @tgslots/math                  (Rng type)
  ├── @tgslots/slots-core            (BetConfiguration, Wager)
  └── node:worker_threads, node:os, node:fs (worker pool + HTML reporting)

@tgslots/slots-core
  └── @tgslots/math                  (Rng, symbol types)

@tgslots/math
  └── (no internal deps — foundation layer)
```

## System Dependency Layers

```
Layer 0 (foundation):  @tgslots/math
Layer 1 (core):        @tgslots/slots-core
Layer 2 (games):       @tgslots/ancient-dragon, @tgslots/woodland-whisper
Layer 2 (infra):       @tgslots/slots-simulation-engine
Layer 3 (apps):        apps/simulations
```

## Runtime Dependencies

| Package           | External Deps                         |
| ----------------- | ------------------------------------- |
| All               | TypeScript 5.9 (dev), bun-types (dev) |
| simulation-engine | Node/Bun built-ins only |
| All games         | None (pure TS logic)                  |

## Critical Coupling Risks

1. **Worker protocol**: `apps/simulations` worker files and `runWorkerLoop()` depend on the game state-machine contract and serialized `betConfig`.
2. **Rng interface**: All packages depend on the functional `Rng` type from `@tgslots/math`. Changing it is cross-cutting.
3. **Simulation metadata**: The unified CLI expects each game package to export `SIM_CONFIG` with normalized comparison targets, betting, and state-machine wiring.
4. **Betting contract**: `Wager` and `BetConfiguration` semantics now affect games, workers, and reporting together.
