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

### Game specs
- [[le-militare-gdd]] — Full game design document (paytable, reel strips, edge cases, pseudocode) for handoff to Pragmatic mathematician

### Current work
[[active_context]] — what I'm working on right now and what's next.
