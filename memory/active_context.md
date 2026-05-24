---
title: Active Context
type: active-context
tags: [memory, context]
up: '[[index]]'
---

# Active Context

## Current focus

Le Militare: building the **Player-Control Kit** (plan: `currently-my-math-config-velvet-horizon.md`).
Done so far (Phase 0 + Phase 1, see [[decision_009_le_militare_air_raid_and_integer_payouts]]):
- **Integer-only payouts** — all paytable entries, multipliers, and awards are whole numbers
  (`buildPaytable` rounds to int; the decimal `paytableScale` knob was removed). RTP is steered by
  integer reel counts, multiplier pool, scatter/Air-Raid rates.
- **Air Raid base feature** — base spins stage the Combat Operation: an S300 intercepts a plane
  squadron; hits drop multiplier-WILDs on random cells (per-spin, resets). `airRaidSampler` in
  `combat.ts`, wired into the base branch of `createSpinSampler` (`logic.ts`); config block
  `air_raid`. Free spins keep the persistent version.
- Fixed a latent bug: `FREE_SPIN_AWARDS` is now read from config (was hardcoded in `constants.ts`).
- Converged integer config ≈97.8% at 30M (within ±1.5%); base ≈0.52 / feature ≈0.46, trigger
  ≈1/425, max 15,000×, high-vol with a live base feature. Parsheet sub-targets updated.

**Phase 2 (feature-buy menu) — engine + API done.** State machine: `buyBonus(option)` with tiers
(standard/elite/super, differentiated by guaranteed scatter count → spin count, super also starts
with a ×3 multiplier; no starting armed reel — too strong), plus `buyChanceSpin` (×5 trigger via a
forced-trigger roll) and `buyAirRaidSpin` (guaranteed Air Raid). Costs in config `buy_options`,
tuned via `scripts/buy-rtp.ts` so each option's EV/cost ≈ 0.984 (standard 184, elite 874, super
1795, chance 4.2, air-raid 1.9; the old 100× buy was badly underpriced). API routes/module/reg
updated. Buy options don't touch `spin`/`next`, so base-game total RTP is unchanged.

Earlier baseline (Phase: pre-kit, [[decision_008_le_militare_math_rebalance]]): rebalanced from a
broken ~8368% to 98.4% with S300 gated to free spins. Remaining kit work: Phase 3 (selectable
volatility modes) and the web client buy-menu UI (needs browser verification).

`packages/slots-simulation-engine/src/testing/slots-test-engine.ts` is a fluent, extensible gameplay test harness. Ancient Dragon, Woodland Whisper, and Le Militare state-machine/gameplay suites use registered actions/scenarios/probes instead of direct `_state` mutation or hand-rolled round execution.

## Next

- Sweep any remaining gameplay-style slot tests onto the shared harness if new suites are added
- Keep `slots-test-engine` extensible through registration rather than widening the production `StateMachine` contract
- Continue expanding deterministic tests around slot math, feature transitions, and metrics reporting
