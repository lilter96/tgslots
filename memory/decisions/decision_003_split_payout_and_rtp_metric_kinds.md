---
title: "Split metrics into payout (aggregate) and rtp (wager-normalized) kinds"
type: "decision"
aliases:
- "decision_003_split_payout_and_rtp_metric_kinds"
tags:
- "memory"
- "decision"
up:
- "[[index]]"
- "[[architecture]]"
decision_id: "decision_003_split_payout_and_rtp_metric_kinds"
status: "accepted"
---
# Decision: Split metrics into `payout` (aggregate) and `rtp` (wager-normalized) kinds

## Context

The original `payout` metric kind tried to carry both an aggregate (`count`, `total`, `average`, `min`, `max`) and an RTP-style ratio (`total / denominatorTotal`) where `denominatorTotal` was passed per-call and accumulated. This conflated two different statistics:

- **Aggregate**: "average win when X fires" — useful for `spin-win`, `feature-win`, `round-win`.
- **Wager-normalized RTP**: "feature wins ÷ total credits wagered" — useful for `feature-rtp`, base-game `win`, `round-payout`.

Because the denominator was per-call accumulated, the ratio was only a true RTP when the metric was recorded **on every round** with `round.bet`. Any other recording cadence (e.g., only on triggered rounds) produced ratios > 1, and omitting the denominator produced N/A. Two games drifted apart on the convention, the visualizer always showed the column anyway, and the dashboard surfaced nonsense like `feature-win rtp 8.89` and `spin-win rtp N/A`.

`RawSimulationMetrics.totalBet` already holds the canonical cumulative wager pool — but scoped metrics had no way to reference it.

## Options Considered

1. **Keep one kind, make `denominator` mandatory.** Forces every call site to pass a denominator. Doesn't fix the cadence trap (denominator still per-call accumulated) and doesn't address that aggregates legitimately have no denominator.
2. **Keep one kind, drop ratio entirely from the visualizer when zero.** Would hide the bug, not fix it. Loses the legitimate RTP normalization for metrics like `feature-rtp`.
3. **Split into two kinds (chosen).** Make intent explicit at the call site. `payout` for aggregates, `rtp` for wager-normalized contributions. The `rtp` kind has no per-call denominator — finalization divides by the global `totalBet`.

## Decision

Two metric kinds in `core/state-machine.ts`:

- **`payout`** — `count`, `total`, `average`, `min`, `max`. No ratio. API: `scope.payout(name, amount)`.
- **`rtp`** — `count`, `total`, `ratio`. Ratio computed at finalize: `total / rawSummary.totalBet`. API: `scope.rtp(name, amount)`.

The visualizer renders different columns per kind. The comparison resolver supports `field: "ratio"` and `field: "total"` on the new `rtp` kind, so existing parsheets continue to work without JSON changes.

## Consequences

- `ratio` on an `rtp` metric is always relative to the true total wager — never > 1 for honest games.
- Recording cadence is irrelevant for `rtp` — record on every round, only on triggered rounds, or per spin: each contributes only to the numerator.
- The sum of partitioning `rtp` metrics at the same level equals `summary.rtp` (e.g., `base-game/win + features/free-spins/feature-rtp = round-payout = summary.rtp`).
- Game state machines lose the per-call `denominator` argument — a deliberate API simplification that prevents the class of bugs above.
- The engine's automatic `round-payout` metric is now `rtp`-kind, naturally equal to `summary.rtp`.

## Coding rule

> RTP-style metrics use `scope.rtp(name, amount)`. Aggregates use `scope.payout(name, amount)`. Never re-introduce a per-call denominator on either.
