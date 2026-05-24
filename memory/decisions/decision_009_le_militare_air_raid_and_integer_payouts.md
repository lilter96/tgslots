---
title: "Decision 009: Le Militare Air Raid Base Feature & Integer-Only Payouts"
type: "decision"
decision_id: "decision_009_le_militare_air_raid_and_integer_payouts"
status: "accepted"
tags:
- "memory"
- "decision"
- "le-militare"
- "math"
- "feature"
up:
- "[[index]]"
---
# Decision 009: Le Militare Air Raid Base Feature & Integer-Only Payouts

## Context

After [[decision_008_le_militare_math_rebalance]] gated the S300 Combat Operation to free spins,
the base game was flat — pure cluster pays with no signature feature between rare bonuses. The
direction chosen (industry review of modern high-vol slots) is a "Player-Control Kit"; this ADR
covers its first two pieces, plus a hard product constraint.

## Decision 1: All payouts are integers

Product constraint: no decimal/float payouts anywhere. `buildClusterPaytable` consumes whatever the
config holds, so the generator's `buildPaytable` now emits `Math.max(1, Math.round(start + step·k))`
— integer payouts, minimum `1×`. The decimal `paytableScale` master knob from decision 008 is
removed; RTP is steered with integer levers (reel-strip symbol counts, multiplier pool weights,
scatter frequency, Air-Raid rates). The win formula
(`baseClusterWin × max(1, multSum) × wager.multiplier`) is therefore integer end-to-end. A test
guards that every configured payout/multiplier/award is an integer.

## Decision 2: Air Raid — the base-game Combat Operation

Rather than a watered-down or generic base mechanic, the genuine Combat Operation runs in the base
as a per-spin "Air Raid": a squadron flies over, the S300 intercepts each plane (hit/miss), and
**every interception drops a multiplier-WILD on a random cell** while missed planes fly off. The
summed interception multipliers seed the spin's multiplier (per-spin in the base; resets each
spin), so wins flow through the existing `max(1, multSum)` machinery. This reuses the multiplier
pool and the WILD/multiplier-sum mechanic, and mirrors the bonus (free spins keep the persistent
armed-reel + accumulating-multiplier version) — base↔bonus differ only by persistence, the modern
high-vol pattern (Gates of Olympus / Sugar Rush).

Implementation: `airRaidSampler` in `combat.ts` (all randomness via `Sampler<T>`; integer weight
ratios for trigger/squadron/hit, never float probabilities), composed into the base branch of
`createSpinSampler` in `logic.ts`. Config block `air_raid` (generator-emitted) tunes
trigger/squadron/hit; RTP re-centered by reducing passive base (commons) and the multiplier pool.

## Decision 3: Free-spin awards are config-driven

`FREE_SPIN_AWARDS` was hardcoded in `constants.ts` and silently overrode the config value (the
generator's awards did nothing). It now derives from `config.scatter_definition.free_spins_awarded`,
making award count a real generator-controlled lever.

## Consequences

- Integer config converges to ≈97.8% at 30M spins (target 98.4%, within ±1.5%); base ≈0.52 /
  feature ≈0.46, trigger ≈1/425, max 15,000×. High volatility with a live base feature.
- Base/feature split and trigger/win cycles shifted; parsheet sub-targets updated (total RTP
  remains the hard constraint).
- Heavy feature tail (persistent multiplier + cap) makes RTP noisy — tuning requires 30M+ spin
  runs; the 500k `rtp.test.ts` guard uses a wide ±0.04 band to stay stable.
- Remaining Player-Control Kit work: feature-buy menu (incl. ×5-chance and guaranteed-Air-Raid
  spins) and selectable volatility modes.
