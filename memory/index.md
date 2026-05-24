---
title: TgSlots Memory
type: map
tags: [memory, index]
---

# TgSlots Memory

## What's here

Memory stores only what code cannot tell you. If `ls`, `grep`, or `git log` can give you the answer, it doesn't belong here.

### Decisions (ADRs)

Architectural decisions capturing WHY at a point in time. Each is a design choice with context, alternatives considered, and consequences.

- [[decision_002_precomputed_scatter_engine]] — O(R) positional scatter via prefix sums
- [[decision_003_split_payout_and_rtp_metric_kinds]] — Separated `payout` (aggregate) and `rtp` (wager-normalized) metric kinds
- [[decision_004_canonical_metric_vocabulary_and_modern_visualizer]] — Canonical metric names across engine + games
- [[decision_005_cluster_pays_and_super_cascades]] — 4-connected BFS clusters, `Sampler<T>` cascade refill
- [[decision_006_api_dispatcher_architecture]] — Type-safe stateless GameRegistry + GameServer dispatcher
- [[decision_007_web_client_plugin_architecture]] — Multi-game Pixi plugin host via IGameClient
- [[decision_008_le_militare_math_rebalance]] — Le Militare tuned to 98.4% RTP: S300 free-only, run-length clustering, paytable scaler, 15,000× cap

### Components

- [[components/slots-simulation-engine]] — Simulation metrics engine, runner, and the shared fluent `slots-test-engine` harness

### Testing

- [[testing_strategy]] — Current testing rules, including the shared slot gameplay harness requirement
- [[progress]] — Recent implementation history and validation results
- [[tasks/task_026_slots_test_engine_refactor]] — Fluent slot test harness refactor and test migration

### Game specs

- [[le-militare-gdd]] — Full game design document (paytable, reel strips, edge cases, pseudocode) for handoff to Pragmatic mathematician

### Current work

[[active_context]] — what I'm working on right now and what's next.
