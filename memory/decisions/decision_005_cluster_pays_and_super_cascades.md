---
title: "Decision 005: Cluster Pays and Super Cascades Engine Design"
type: "decision"
decision_id: "decision_005_cluster_pays_and_super_cascades"
status: "accepted"
tags:
- "memory"
- "decision"
- "slots-core"
- "cascades"
- "cluster-pays"
up:
- "[[index]]"
---
# Decision 005: Cluster Pays and Super Cascades Engine Design

## Context

Task 031 required adding a new win evaluation model (Cluster Pays) and a tumble/cascade mechanic to `@tgslots/slots-core`. Two key design choices arose: how to detect cluster wins, and how to integrate randomness (refill symbols) with the existing `Sampler<T>` monad discipline.

## Decision 1: 4-Connected BFS Cluster Evaluation

**Chosen approach**: Per-symbol 4-connected BFS flood-fill. For each non-wild, non-scatter symbol `S`, scan the grid for unvisited `S` cells, BFS-flood treating wilds as traversable, record the component. A component only pays if it contains at least one true `S` cell. Wild cells are **not** permanently visited across symbol sweeps — each symbol gets a fresh visited bitmap — so the same wild can appear in multiple cluster hits.

**Rejected alternative**: Diagonal connectivity (8-connected). Standard cluster-pays games (Reactoonz, Cluster Tumble) use only 4-connected adjacency to give better control over win frequency and cluster shape.

**Rejected alternative**: Payline-based "pays anywhere" detection. Paylines are fixed-position patterns; clusters are topology-based and scale naturally with grid size without requiring explicit payline definitions.

## Decision 2: `FlatPaytable` Reuse for Cluster Sizes

**Chosen approach**: Reuse the existing `FlatPaytable` shape (`payouts: readonly Float64Array[]`) but allocate `Float64Array(gridArea + 1)` per symbol instead of `Float64Array(reelCount + 1)`. The `minPayCount` field doubles as the cluster threshold. This avoids introducing a new paytable interface and keeps the evaluator generic.

**Rejected alternative**: A new `ClusterPaytable` interface. Would require forking the evaluator's type dependency and preventing the FlatPaytable convention from being reused.

## Decision 3: Sampler Monad for Cascade Refill

**Chosen approach**: `createCascadeSampler` builds a `Sampler<CascadeResult>` via recursive `flatMap` chains — the cascade loop is encoded as a chain of monadic steps. Each step counts empty cells per reel, composes the exact number of `Sampler<SymbolId>` draws via `Sampler.sequence`, and flatMaps into the next cascade step. No `Rng` parameter appears anywhere in game logic.

**Rejected alternative**: Passing `Rng` or a `() => SymbolId` callback into the engine. This would violate the coding rule in `memory/coding_rules.md` that game randomness must flow through `Sampler<T>` abstractions.

**Rationale**: The Sampler monad approach ensures that simulation engines can compose cascade sampling with the same `flatMap`/`traverse` infrastructure used for reel strips and pick bonuses. It also makes cascade outcomes testable with `Sampler.pure`-based mock refills.

## Decision 4: Synchronous `CascadeEngine` as Imperative Alternative

The `CascadeEngine.run(initialGrid, refill: RefillSource)` API is provided alongside `createCascadeSampler` for contexts where the caller already holds an `Rng` and wants a simple imperative loop (e.g., unit tests, one-shot simulation). The `RefillSource` interface is trivially backed by a scripted queue in tests or by `sampler.sample(rng)` calls in production.

## Consequences

- Games adopting cluster pays call `createClusterSlotEngine` instead of `createSlotEngine`. The evaluation call is `evaluateClusters` instead of `evaluateSpin`.
- Existing payline games are unaffected — no interfaces were modified, only added.
- The cascade grid uses `EMPTY_SYMBOL = -2` (distinct from `UNRESOLVED_SYMBOL = -1`) so the cluster evaluator can safely skip vacated cells without special-casing.
- Wild cells appearing in multiple cluster hits is intentional and correct per the Reactoonz-style design: a wild between an A-cluster and B-cluster simultaneously bridges both.
