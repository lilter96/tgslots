---
title: "Decision 010: Le Militare Player-Control Kit (buy menu + volatility modes)"
type: "decision"
decision_id: "decision_010_le_militare_player_control_kit"
status: "accepted"
tags:
- "memory"
- "decision"
- "le-militare"
- "math"
- "buy-bonus"
- "volatility"
up:
- "[[index]]"
---
# Decision 010: Le Militare Player-Control Kit

## Context

After the base game was made engaging via the Air Raid (decision_009), the approved plan
added a "player-control kit": a feature-buy menu and selectable volatility modes. Both build on
the converged 98.4% integer-payout config; every option/mode is tuned to the same 98.4% RTP.

## Decision 1: Feature buy menu, priced from measured EV

Buys are exercised only via `buyBonus`/`buyChanceSpin`/`buyAirRaidSpin` (the main simulation
drives `spin`/`next`), so their RTP is verified by a dedicated harness (`scripts/buy-rtp.ts`)
and each cost is set to `EV / 0.984`. This surfaced and fixed a real bug: the old buy bonus was
priced at 100× but its EV was ~184× (≈177% RTP).

- **Bonus buys** (`buyBonus(option)`): standard / elite / super, differentiated by guaranteed
  scatter count → spin count; super also starts with a ×3 multiplier. **Rejected** a starting
  *armed reel* for the tiers — a persistent full-wild reel is so strong it forced impractical
  costs (elite would need ~1466×); spin-count + a small multiplier keep costs sane (≈184 / 874 /
  1795).
- **Enhanced single spins**: `buyChanceSpin` (a forced-trigger roll giving ~5× the Free Spins
  chance) and `buyAirRaidSpin` (the Air Raid forced on). Priced ≈4.2× / ≈1.9× stake.
- **Forced-entry award fix**: injecting scatters at the start of the entry spin let the cascade
  accumulate *extra* scatters and inflate the awarded spin count. The buy now awards spins from
  the *purchased* tier's scatter count, not the cascade-inflated count.

## Decision 2: Selectable volatility modes share strips; differ in multiplier + Air Raid

Three modes — **recon** (low), **assault** (standard/default), **siege** (high) — are selected at
bet time. To avoid maintaining six separate strip sets, **modes share the reel strips, paytable,
scatter/trigger rate, and buy options**, and differ only in:
- **Multiplier pool** (siege adds a heavy 50/100× tail; recon caps low), and
- **Air Raid intensity** (recon fires frequent low-multiplier raids — steady base wins; siege
  fires rare raids and leans on the feature tail).

Each mode is re-centered to 98.4% via those integer levers (tuned with `scripts/mode-rtp.ts`),
giving the same RTP at different variance (stdDev ordering recon < assault < siege). `assault`
is byte-identical to the pre-modes 98.4% config, so the default game and all tests are unchanged.

**Rejected**: per-mode reel strips / trigger rates — 3× the strip tuning for marginal benefit;
the multiplier tail + Air Raid intensity already deliver the variance spread.

## Implementation

- `combat.ts` builds per-mode samplers (`MODE_SAMPLERS`); the multiplier sampler is threaded
  through `combatCascadeLoopSampler` / `runCombatOperationSampler` (no module-level mutable state —
  RNG discipline preserved).
- `LeMilitareStateMachine(initialState?, mode = 'assault')` selects the active mode; samplers take
  the mode. Config: `config.modes.{recon,assault,siege}`; top-level keys mirror assault.
- API payload/serialized-state/registry carry an optional `mode`; a new round adopts the payload
  mode, free spins keep the session mode. Sim worker selects mode via `LM_MODE` env for `verify`.

## Consequences

- All payouts remain integers; buy costs may be fractional (they are bet sizes, not payouts).
- Web client buy-menu + mode-selector UI is not yet wired (needs browser verification); the
  default single buy button already uses the corrected standard cost.
- New harnesses: `scripts/buy-rtp.ts`, `scripts/mode-rtp.ts`. Per-mode + buy regression tests guard
  convergence.
