---
title: "Progress"
type: "progress-log"
tags: 
- "memory"
- "progress"
up: 
- "[[index]]"
---
# Progress

## Completed

- [[task_001_memory_bank_init]] — 2026-04-21 — Tier 0 bootstrap, full codebase map
- [[task_002_sim_engine_enhanced_reporting]] — 2026-04-21 — Enhanced reporting, fixed mt19937 bug, fixed Ancient Dragon bounds bug.
- [[task_003_code_quality_and_linting]] — 2026-04-21 — TS fixes and lint setup.
- [[task_004_slots_core_adoption]] — 2026-04-21 — Migrate Ancient Dragon to slots-core.
- [[task_005_cleanup_evaluation_logic]] — 2026-04-21 — Cleanup redundant evaluation logic.
- [[task_006_woodland_whisper_slots_core_adoption]] — 2026-04-21 — Migrate Woodland Whisper to slots-core.
- [[task_007_implement_scatter_support]] — 2026-04-21 — Implement standardized scatter evaluation in slots-core.
- [[task_008_standardize_scatter_evaluation]] — 2026-04-21 — Decouple scatter evaluation and refactor games.

- [[task_012_refactor_scatter_engine_polymorphism]] — 2026-04-21 — BaseScatterEngine polymorphism refactor; removed evaluateScatters; fixed NaN scatter win bug in ancient-dragon/logic.ts
- [[task_013_precomputed_scatter_engine]] — 2026-04-21 — PrecomputedScatterEngine O(R) scatter via prefix sums; fixed double-grid-build bug; decision log 002
- [[task_014_game_code_cleanup_and_alignment]] — 2026-04-21 — buildEngineFromArrays helper; removed boilerplate, dead code, alias exports; fixed scatter distribution bug; explicit index.ts exports
- [[task_015_pick_bonus_sampler_refactor]] — 2026-04-21 — Pick bonus moved to Sampler via flatMap; no rng in game logic; config-driven values; RNG discipline rule in coding_rules.md
- [[task_017_wager_and_cost_system]] — 2026-04-23 — Robust betting system ported from C# with improved naming
- [[task_018_production_betting_system]] — 2026-04-25 — Strict integer credits, denominations, and simulation engine integration
- [[task_019_betting_architecture_refactor]] — 2026-04-25 — Stateless state machines, zero-allocation grid projection, and pure credit math
- [[task_020_fix_free_spin_simulation]] — 2026-04-26 — Fixed Woodland Whisper free-spin loop and applied the intended 2x free-spin payout multiplier
- [[task_022_add_simulation_visualizer]] — 2026-04-26 — Added --visualize CLI flag for PDF/HTML simulation reports
- [[task_023_memory_sync]] — 2026-04-26 — Synchronized memory docs with current APIs, tests, dependencies, and contributor workflow
- [[task_024_obsidian_memory_refactor]] — 2026-04-26 — Upgraded the full memory vault with Obsidian frontmatter, aliases, tags, and hub links
- [[task_025_scoped_simulation_metrics_and_visualization]] — 2026-04-26 — Replaced slot-specific metrics with scoped generic metrics, normalized comparison targets, and HTML visualization.
- [[task_026_ancient_dragon_standardization]] — 2026-04-26 — Refactored Ancient Dragon for granular state and standardized metrics.
- [[task_027_woodland_whisper_scatter_rtp]] — 2026-04-26 — Added granular scatter RTP recording for base and free games.
- [[task_028_fix_dragon_rtp_config]] — 2026-04-27 — Fixed Ancient Dragon 33% RTP (BetConfig/payline mismatch); migrated to external config/config.json + parsheet.json; restored INNER mystery mechanic; scaled paytable to 88.05% target (verified 88.95% over 2M spins).
- [[task_029_split_payout_rtp_metric_kinds]] — 2026-04-27 — Split metrics into `payout` (aggregate) and `rtp` (wager-normalized) kinds; eliminated per-call denominator footgun; dashboard no longer shows `rtp N/A` or `rtp > 1`; ADR 003.
- [[task_030_modern_visualizer_and_canonical_metrics]] — 2026-04-27 — Canonical metric vocabulary across engine + games + parsheets; modern offline-capable visualizer with inlined ApexCharts (KPI count-ups, RTP donut, tolerance-band comparisons, per-metric-kind charts, sticky TOC, dark/light toggle); ADR 004.

- [[task_031_super_cascades_engine]] — 2026-04-28 — Added Cluster-Pays cluster evaluator and Super Cascades tumble engine to slots-core (mutable cascade grid, vanishing rules, Sampler-driven refill flow, 22 new tests).
- [[task_032_web_client_free_spins_status]] — 2026-05-06 — Added persistent free-spin remaining banner and dynamic awarded-spin announcements to the Woodland Whisper web client; added frontend status-derivation tests and a new [[web-client]] component note.
- [[task_033_web_client_responsive_layout]] — 2026-05-06 — Rebuilt the Woodland Whisper web client around a shared responsive Pixi layout model; refactored the HUD into a bottom-pinned slot footer and updated the auto-spin modal, pick-bonus board, and win overlay for portrait/landscape phone, tablet, and desktop support; added layout tests.

- [[task_034_api_dispatcher_architecture]] — 2026-05-10 — Type-safe stateless `GameRegistry + GameServer` dispatcher; `IGameModule` adapters for both games; `InMemorySessionManager`; generic `/game/:gameId/:action` + per-game typed routes; all 275 tests pass.
- [[task_035_web_client_plugin_refactor]] — 2026-05-11 — Multi-game plugin architecture for `apps/web-client`. `IGameClient<G>` contract + `GameRuntime<G>`; both WW and AD selectable via `?game=`; `GamePicker` DOM overlay; `SpinOrchestrator` replaces `GameController`; `PixiScene` layer stack; `@tgslots/shared-contracts` shared with `apps/api`. 6 new test files; dead code (`asset-loader.ts`, `pick-bonus-ui.ts`, `free-spins-status.ts`, `game-host.ts`, `asset-loader.test.ts`) removed. 318 tests pass.

## In Progress

_(none)_

## Backlog (Identified, Not Yet Tasked)

| Priority | Area           | Description                                              |
| -------- | -------------- | -------------------------------------------------------- |
| P0       | Testing        | Expand direct test coverage for games, payline/scatter core, and simulation-engine |
| P2       | Telegram Bot   | Bot layer, user sessions, bet handling                   |
| P2       | Wallet Service | Balance, transactions, bet deduction                     |
| P3       | New Game       | Third slot game                                          |
| P3       | CI             | GitHub Actions pipeline                                  |

## Quick Fixes

_(none yet)_

## Simulation RTP Verification Results (from code, not run)

- Ancient Dragon target: 88.05%
- Woodland Whisper target: 88.04%
