---
title: "Task 031: Super Cascades Engine"
type: "task"
task_id: "task_031_super_cascades_engine"
status: "completed"
tags:
- "memory"
- "task"
- "slots-core"
- "cascades"
- "cluster-pays"
up:
- "[[progress]]"
---
# Task 031: Super Cascades Engine

## Objective

Add a generic **Super Cascades** mechanic with **Cluster Pays** win detection to `@tgslots/slots-core`. Whenever a winning combination forms (4-connected cluster of same-type symbols ≥ threshold), all contributing symbols plus all matching-type cells visible on the grid vanish, new symbols tumble down into vacant cells, and the process repeats until no more wins form.

## Implementation Details

### New Files

- `packages/slots-core/src/paytable/cluster-paytable.ts` — `buildClusterPaytable`: builds `FlatPaytable` with `Float64Array(gridArea + 1)` per symbol (vs `reelCount + 1` for paylines), allowing cluster-size indexed lookups.
- `packages/slots-core/src/cluster/types.ts` — `ClusterHit`, `ClusterEvaluationResult` interfaces.
- `packages/slots-core/src/cluster/cluster-engine.ts` — `GameWithClustersConfig`, `ClusterSlotEngine` interface, `createClusterSlotEngine` factory.
- `packages/slots-core/src/cluster/evaluator.ts` — `evaluateClusters`: iterative per-symbol BFS flood-fill (4-connected), wild cells bridge clusters, same wild can appear in multiple hits, pure-wild components skipped. Uses `Uint8Array` visited bitmap + `Int32Array` queue; O(gridArea × symbolCount).
- `packages/slots-core/src/cascade/types.ts` — `RefillSource`, `CascadeStep`, `CascadeResult`, `CascadeOptions` interfaces.
- `packages/slots-core/src/cascade/cascade-grid.ts` — `MutableCascadeGrid` implementing `EvalGrid`. Owns `Int16Array` symbol buffer. `clearAt` sets `EMPTY_SYMBOL`. `applyGravity` compacts surviving symbols toward high row indices (visual bottom) and refills top via callback.
- `packages/slots-core/src/cascade/vanishing.ts` — `collectVanishPositions`: unions all hit positions, scans grid for all cells matching any winning symbol type, skips wilds outside winning clusters and scatters.
- `packages/slots-core/src/cascade/cascade-engine.ts` — `CascadeEngine.run`: synchronous tumble loop with configurable `maxSteps` (default 100). No `Rng` dependency — callers supply `RefillSource`.
- `packages/slots-core/src/cascade/sampler.ts` — `createCascadeSampler`: builds a `Sampler<CascadeResult>` via recursive `flatMap` chains on `Sampler<SymbolId>` per-reel refill samplers. Maintains Sampler monad discipline (no `Rng` in game logic).

### Modified Files

- `packages/slots-core/src/symbol-registry.ts` — Added `EMPTY_SYMBOL: SymbolId = -2` sentinel for vacated mid-cascade cells.
- `packages/slots-core/index.ts` — Added 9 new export lines for all cluster/ and cascade/ modules.
- `packages/slots-core/package.json` — Added `@tgslots/math` as workspace dependency.

### Tests

- `packages/slots-core/src/__tests__/cluster.test.ts` — 10 tests covering empty grid, all-wild, below-threshold, at-threshold, multiple disjoint clusters, wild bridge (same symbol), wild bridge (different symbols), pure-wild region, diagonal adjacency, totalWin computation.
- `packages/slots-core/src/__tests__/cascade.test.ts` — 14 tests covering `MutableCascadeGrid` (fromProjection, setSymbol, clearAt, gravity), `collectVanishPositions` (cluster-only, extra same-type cells, scatter/wild preservation), `CascadeEngine` (no-win, one-step, two-step, maxSteps cap), `createCascadeSampler` (equivalence with synchronous CascadeEngine).

## Verification

- `bun --filter @tgslots/slots-core test` — 202 total tests pass (was 168 before; +34 net including pre-existing tests).
- `bun run typecheck` — clean.
- `bun run build` — clean.
- `bun run lint` — no new errors.
- Existing payline games (`ancient-dragon`, `woodland-whisper`) unaffected — change is purely additive.

## Completion Date

2026-04-28
