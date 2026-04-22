# Dependency Graph

## Package Dependency Graph

```
apps/simulations
  ├── @tgslots/math                  (mt19937 RNG seed)
  ├── @tgslots/slots-simulation-engine
  ├── @tgslots/ancient-dragon
  └── @tgslots/woodland-whisper

@tgslots/ancient-dragon
  ├── @tgslots/math                  (Rng, Sampler, AliasSampler)
  └── @tgslots/slots-core            (Slot engine, evaluator)

@tgslots/woodland-whisper
  ├── @tgslots/math                  (Rng, Sampler, AliasSampler)
  └── @tgslots/slots-core            (Slot engine, evaluator)

@tgslots/slots-simulation-engine
  └── @tgslots/math                  (Rng type)
  └── node:worker_threads, node:os   (Node/Bun built-ins)

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
| simulation-engine | node:worker_threads, node:os          |
| All games         | None (pure TS logic)                  |

## Critical Coupling Risks

1. **Worker protocol**: `apps/simulations` worker files couple to game package internals. Changes to game state machine interface break workers.
2. **Rng interface**: All packages depend on the `Rng` type from `@tgslots/math`. Changing it is a cross-cutting concern.
