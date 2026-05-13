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
| Testing         | bun:test (318 passing tests as of 2026-05-11) |
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
    ├── api/                    ← Elysia HTTP API (port 3001)
    ├── simulations/            ← CLI entry points (not a publishable package)
    ├── web-client/             ← Pixi multi-game frontend (Woodland Whisper + Ancient Dragon)
    └── marketing/              ← React 18 + Tailwind game presentation site (port 3003)
```

## Layer Architecture

```
┌──────────────────────────────────────────┐
│  apps/api (Elysia, port 3001)            │  GameServer + IGameModule dispatcher
│  apps/simulations / apps/web-client      │  CLI, worker spawning, Pixi frontend
│  apps/marketing (React, port 3003)       │  Game presentation pages; iframe → web-client
├──────────────────────────────────────────┤
│  @tgslots/slots-simulation-engine        │  Parallel runner, scoped metrics, reports
├──────────────────┬───────────────────────┤
│ @tgslots/        │ @tgslots/             │
│ ancient-dragon   │ woodland-whisper      │  Game logic, constants, sampling
├──────────────────┴───────────────────────┤
│         @tgslots/slots-core              │  Paylines, paytable, symbol registry
├──────────────────────────────────────────┤
│           @tgslots/math                  │  RNG, Sampler, Distribution, functionals
└──────────────────────────────────────────┘
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
    flat-paytable.ts        Flat O(1) lookup
    paytable-config.ts      Config validation
    cluster-paytable.ts     Cluster-sized paytable builder (gridArea + 1 entries)
  spin-grid/
    spin-grid.ts       EvalGrid interface
  cluster/
    types.ts           ClusterHit, ClusterEvaluationResult
    cluster-engine.ts  ClusterSlotEngine, createClusterSlotEngine
    evaluator.ts       evaluateClusters — 4-connected BFS cluster evaluator
  cascade/
    types.ts           CascadeStep, CascadeResult, RefillSource, CascadeOptions
    cascade-grid.ts    MutableCascadeGrid implementing EvalGrid
    vanishing.ts       collectVanishPositions — union hits + same-type grid scan
    cascade-engine.ts  CascadeEngine.run — synchronous tumble orchestrator
    sampler.ts         createCascadeSampler — Sampler-monad cascade
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

### apps/api

```
src/
  index.ts                     wiring: registers both game modules, mounts all routes
  dispatcher.ts                GameServer — register(), synchronous execute()
  game-module.ts               IGameModule<G> interface
  session-manager.ts           ISessionManager + SessionEntry interfaces
  in-memory-session-manager.ts Map-backed impl; 1-hour TTL, purgeExpired on access
  types/
    game-registry.ts           GameRegistry + GameId/GameState/GameResult/ActionType/ActionPayload
    actions.ts                 ActionRequest, ActionResponse, DispatchOutcome
    woodland-whisper.reg.ts    declaration merge: registers 'woodland-whisper'
    ancient-dragon.reg.ts      declaration merge: registers 'ancient-dragon'
  modules/
    woodland-whisper-state.ts  WoodlandWhisperSerializedState (triggeringMultiplier, not Wager)
    woodland-whisper.module.ts WoodlandWhisperModule implements IGameModule
    ancient-dragon-state.ts    AncientDragonSerializedState
    ancient-dragon.module.ts   AncientDragonModule implements IGameModule
  routes.ts                    generic POST /game/:gameId/:action
  routes/
    woodland-whisper.routes.ts typed wrappers at /woodlandwhisper (spin, buybonus, freespin, pick, state)
    ancient-dragon.routes.ts   typed wrappers at /ancientdragon (spin, freespin, state)
  dtos.ts                      shared TypeBox response schemas
```

- **Adding a new game**: implement `IGameModule<G>`, declare-merge the registry, mount routes. Dispatcher core unchanged.
- **Session format**: JSON only — `triggeringMultiplier: number` replaces `Wager` instances; module hydrates on load.
- **`/state` fallback**: expired sessionId silently creates a new session (retries with `sessionId: undefined`).

## Key Design Decisions

- **State machine pattern** for game flow (base game ↔ feature states)
- **Sampler monad** for composable probabilistic sampling
- **Alias sampler** for O(1) weighted reel sampling in hot path
- **Worker threads** for embarrassingly parallel simulation
- **Integer symbol IDs** (not strings) in evaluation hot path
- **Integer credit betting model** via `BetConfiguration` and `Wager`
- **GameRegistry declaration merging** for compile-time type safety across dispatcher, modules, and routes
- Config-driven (Woodland Whisper JSON config; Ancient Dragon inline constants)

## Marketing App — iframe Integration Contract

`apps/marketing` embeds the Pixi game via a same-origin `<iframe>`. The contract:

- Marketing dev server (port 3003) proxies `/web-client/*` → `http://localhost:3002/*` via Vite dev proxy.
- Launch URL: `/web-client/?game=<slug>` — handled by `apps/web-client/src/main.ts:219-229`.
- **No changes required to `apps/web-client`** for new games — the iframe contract is purely URL-based.
- Prod: reverse proxy serves marketing at `/`, web-client at `/web-client/`.

## Architectural Gaps (as of 2026-05-13)

1. Test coverage is still concentrated in `math` and `slots-core` betting; game packages need more direct tests.
2. No Telegram bot layer yet.
3. No wallet/economy service.
4. No CI pipeline is documented or present in the repo.
5. "Play for Real" on the marketing site renders but is disabled — no auth/wallet integration yet.
