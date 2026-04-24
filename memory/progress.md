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

## In Progress

_(none)_

## Backlog (Identified, Not Yet Tasked)

| Priority | Area           | Description                                              |
| -------- | -------------- | -------------------------------------------------------- |
| P0       | Testing        | Write bun:test unit tests — 0% coverage is critical debt |
| P2       | Telegram Bot   | Bot layer, user sessions, bet handling                   |
| P2       | Wallet Service | Balance, transactions, bet deduction                     |
| P3       | New Game       | Third slot game                                          |
| P3       | CI             | GitHub Actions pipeline                                  |

## Quick Fixes

_(none yet)_

## Simulation RTP Verification Results (from code, not run)

- Ancient Dragon target: 88.04%
- Woodland Whisper target: 88.04%
