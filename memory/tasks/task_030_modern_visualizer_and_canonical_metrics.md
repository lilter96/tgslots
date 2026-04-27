---
title: "task_030_modern_visualizer_and_canonical_metrics"
type: "task"
tags:
- "memory"
- "task"
up:
- "[[index]]"
- "[[progress]]"
task_id: "task_030_modern_visualizer_and_canonical_metrics"
status: "completed"
---
# Task: task_030_modern_visualizer_and_canonical_metrics

## Description

Two coordinated improvements driven by a 10M-spin Ancient Dragon dashboard review:

1. **Metric vocabulary**: cross-game inconsistencies (`hits` vs `winning-spins`, `awarded-spins` vs `spins-awarded`, `spins` vs `spins-played`) and engine misnomers (`round-payout` is rtp-kind, `round-win` collides with the per-feature `round-win`) made reports hard to read.
2. **Visualizer**: the existing HTML report had no charts, no animations, no theme toggle, and rendered every metric kind through the same anonymous 3-cell row.

The user requested a modern, animated, offline-capable dashboard with cleaned-up vocabulary.

## Requirements

- Pick a canonical name per concept and apply across both games + engine + parsheets + tests + memory docs.
- Replace the visualizer with a composed module that renders KPI count-up cards, RTP composition donut, tolerance-band comparison cards, distribution histograms, spin-type donut, and a collapsible scope tree with per-metric charts.
- Charts must work offline — no CDN; bundle ApexCharts inline.
- Add light/dark theme toggle that persists.
- Verify all parsheet comparisons still pass after the rename.

## Status

completed

## Summary

- **Engine** (`packages/slots-simulation-engine/src/core/state-machine.ts`): renamed auto-emitted `round-payout` → `round-rtp`, `round-win` → `round-win-amount`, `result-count` → `spins-per-round`.
- **Ancient Dragon** (`game-state-machine.ts`): `awarded-spins` → `spins-awarded`, `spins` → `spins-played`, `feature-win` → `session-win`, `round-win` → `triggered-round-win`.
- **Woodland Whisper** (`game-state-machine.ts`): `winning-spins` → `hits`, `feature-win` → `session-win`, `round-win` → `triggered-round-win`.
- **Parsheets**: updated AD/WW JSONs to point at the canonical names; wire format unchanged.
- **Comparison API** (`cli/comparison.ts`): added optional `category` and `description` to `ComparisonTarget` (auto-inferred when omitted) for visualizer grouping and tooltips.
- **Visualizer rewrite**: replaced single-file `visualizer/index.ts` with composed module (`template`, `styles`, `client`, `assets`, `labels`, `format`, `sections/*`). Added `apexcharts ^3.54.0` dependency; the UMD bundle is read from `node_modules` at HTML render time and inlined so reports open offline. New sections: hero with theme toggle, animated KPI grid with sparklines, RTP composition donut, grouped tolerance-band comparison cards, round-win histogram, spin-type donut, collapsible scope tree where each metric kind gets its own visualization (count → rate gauge bar; value → min/avg/max ApexCharts bar; payout → bar of average + total; rtp → radial gauge; distribution → ApexCharts horizontal bar). Sticky TOC scroll-spy on desktop, collapses on mobile.
- **Tests**: updated `metrics-reporting.test.ts` for the new engine metric name. 176 tests still pass.
- **Verification**: `bun run typecheck` clean; `bun test` 176/176; both games run end-to-end with 200K spins (`bun run sim --game {ancient-dragon|woodland-whisper} --visualize ...`); HTML report ~600KB self-contained, opens offline, all chart hooks (`data-chart`, `data-metric-chart`) populated for ApexCharts hydration.
- **Memory**: `decision_004_canonical_metric_vocabulary_and_modern_visualizer` ADR; canonical vocabulary added to `coding_rules.md`; metric tables added to AD and WW component docs; visualizer responsibilities and root metrics added to `slots-simulation-engine.md`.
