---
title: "task_029_split_payout_rtp_metric_kinds"
type: "task"
tags:
- "memory"
- "task"
up:
- "[[index]]"
- "[[progress]]"
task_id: "task_029_split_payout_rtp_metric_kinds"
status: "completed"
---
# Task: task_029_split_payout_rtp_metric_kinds

## Description
Architectural fix for the metrics/wager misalignment surfaced by the Ancient Dragon dashboard showing `rtp N/A` for `spin-win`, `feature-win`, `round-win` and (previously) `rtp > 1` for `feature-win` and `round-win`. The root cause was the `payout` metric kind conflating aggregate stats with RTP normalization, with a per-call denominator footgun that only produced a true RTP when recorded on every round.

## Requirements
- Split metric kinds into `payout` (aggregate, no ratio) and `rtp` (wager-normalized against cumulative total bet).
- `rtp` finalization uses `RawSimulationMetrics.totalBet` so recording cadence does not matter.
- Drop the `denominator` parameter from `payout` entirely.
- Migrate both games consistently.
- Preserve the parsheet wire format (`field: "ratio"` works on `rtp` kind).
- HTML visualizer and console formatter render appropriate columns per kind — no more N/A or > 1 ratios.

## Status
completed

## Summary
- **Engine** (`packages/slots-simulation-engine/src/core/state-machine.ts`): added `RawRtpMetric`/`FinalRtpMetric`, removed `denominatorTotal`/`ratio` from `RawPayoutMetric`/`FinalPayoutMetric`, plumbed `rawSummary.totalBet` into `finalizeScope`/`finalizeMetric`, added `recordRtp`/`rtp(...)` API on `ScopedMetrics`, dropped `denominator` from `payout(...)`. The auto-emitted `round-payout` now uses `rtp` kind and naturally equals `summary.rtp`.
- **Comparison resolver** (`cli/comparison.ts`): added `rtp` case supporting `field: "ratio"` and `field: "total"`. Existing parsheet JSONs unchanged.
- **Console formatter** (`cli/formatter.ts`) and **HTML visualizer** (`visualizer/index.ts`): different render paths per kind; `payout` shows count/avg/total, `rtp` shows count/total/ratio.
- **Ancient Dragon** (`game-state-machine.ts`): `payout('feature-rtp', win, round.bet)` → `rtp('feature-rtp', win)`.
- **Woodland Whisper** (`game-state-machine.ts`): six metrics migrated — `base-game/win`, `base-game/scatter-win`, `feature-rtp`, `scatter-rtp` to `rtp`; `spin-win`, `scatter-win` (free-spin scope) drop their per-record denominators and become aggregate `payout`.
- **Tests** (`__tests__/metrics-reporting.test.ts`, `woodland-whisper/__tests__/state-machine.test.ts`): added `rtp` finalization tests including cumulative-bet semantics and null-ratio for zero rounds; updated mock `DataCollector`/`ScopedMetrics` shapes.
- **Verification**: `bun run typecheck` clean, `bun test` passes 176/176, Ancient Dragon 2M benchmark 88.95% RTP (target 88.05% ± 1%) — all 6 parsheet comparisons PASS, dashboard shows clean partition: `round-payout ratio=0.8895` exactly equals `summary.rtp`. HTML output verified: `payout` rows show count/avg/total only, `rtp` rows show count/total/ratio.
