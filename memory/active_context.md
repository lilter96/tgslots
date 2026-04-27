---
title: "Active Context"
type: "active-context"
aliases: 
- "Current Task"
tags: 
- "memory"
- "context"
up: 
- "[[index]]"
current_task: "task_029_split_payout_rtp_metric_kinds"
---
# Active Context

## Recent Changes
- Split simulation engine metrics into `payout` (aggregate; count/avg/total/min/max) and `rtp` (wager-normalized; ratio = total / cumulative `totalBet`). Dropped per-call `denominator` parameter from `payout`.
- Engine auto-emits `round-payout` as `rtp` kind — naturally equals `summary.rtp`.
- Migrated Ancient Dragon and Woodland Whisper state machines to use the appropriate kind per metric. Existing parsheet JSONs still resolve via `field: "ratio"` on the new `rtp` kind.
- Dashboard no longer surfaces misleading `rtp N/A` or `rtp > 1` values. Added ADR 003.
- Earlier: fixed Ancient Dragon 33% RTP bug (BetConfig/payline mismatch); migrated to external config format with comprehensive parsheet comparisons.

## Next Steps
- Expand test coverage for core packages.
- Implement the third slot game.
