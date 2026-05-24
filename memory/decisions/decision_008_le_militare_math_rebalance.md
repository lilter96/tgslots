---
title: "Decision 008: Le Militare Math Rebalance to 98.4% RTP"
type: "decision"
decision_id: "decision_008_le_militare_math_rebalance"
status: "accepted"
tags:
- "memory"
- "decision"
- "le-militare"
- "math"
- "rtp"
up:
- "[[index]]"
---
# Decision 008: Le Militare Math Rebalance to 98.4% RTP

## Context

The Le Militare config was never converged to its 98.4% RTP target — a baseline
simulation returned ~8368% RTP (the game overpaid ~85×), with uncapped round wins
up to ~1,000,000× stake. It also paid clusters of size 5 even though
`game_metadata.min_cluster` and the GDD specify 6 (`buildClusterPaytable` derives
`minPayCount` from the lowest paytable key). The game has no closed-form RTP
(cascades, persistent armed reels, a persistent additive multiplier applied to
every spin's full win, and retriggers), so RTP can only be measured by
Monte-Carlo simulation. This ADR records the design choices made to reach a clean,
high-volatility 98.4% game.

## Decision 1: S300 wild-flood gated to free spins only

The S300 "Combat Operation" floods an entire reel to WILD; in a 6-wide cluster
grid one full wild column connects almost any neighbouring symbols into large
clusters. Diagnostics showed S300 in the base game was responsible for essentially
all base RTP (base RTP collapsed from 6.7× to 0.004× when base S300 was removed),
making the base impossible to balance. S300 now appears only on the free-spin
strips, where armed reels persist across the session — the flood is a bonus
escalation mechanic. The base game is a pure cluster-pays game.

**Rejected**: keeping S300 in the base at very low frequency — still dominated base
RTP and coupled base balance to the explosive feature.

## Decision 2: Even base game, run-length-driven clustering

With contiguous-window reel sampling, a perfectly even (anti-clump) strip almost
never forms 6-clusters (base hit rate dropped to 1-in-525). Strips are generated
from per-symbol **run lengths**: common low-pay symbols use runs of 2 so they can
stack vertically and connect across reels; high-pay symbols stay singletons so they
rarely cluster. This makes cluster frequency a tunable knob rather than an accident
of hand-authored runs.

## Decision 3: Paytable decouples base from feature

Base wins come from small clusters (size 6–8, dominated by the paytable `start`
value); feature floods produce large clusters (size 15–30, dominated by
`start + step×size`). Tuning per-symbol `step` shrinks feature wins while barely
touching the base, decoupling the two contributions. A single global
`paytableScale` is the master RTP scaler (both base and feature scale linearly with
it, since feature win = cluster_win × multiplier).

## Decision 4: Multiplier pool tamed; trigger rate carries volatility

The persistent additive multiplier (applied to the full win of every spin in a
session) is intrinsically explosive. The pool was reduced to `[1,2,3,5,10,25]` with
most weight on 1–2. Volatility is delivered by a relatively rare trigger
(~1 in 333), a punchy average session (~170× stake), and the max-win cap, rather
than by an unbounded multiplier snowball.

## Decision 5: 15,000× max-win cap ends the feature

A round-level cap (base spin + all free spins) clamps cumulative win to
`max_win_multiplier × stake` and ends the feature the moment it is reached
(industry-standard "max win ends the bonus"). Enforced in `LeMilitareStateMachine`
(`spin`/`freeGameSpin`/`buyBonus`), not in the pure sampler. This bounds the tail
that otherwise dominated RTP and variance.

## Decision 6: config.json is a generated artifact

`scripts/generate-reels.ts` is the source of truth for the math knobs (strip
composition, paytable curve, multiplier pool, awards, max win). It produces strips
by even block placement with deterministic jitter and writes config.json. Re-run
after editing the `SPEC`. This makes reel generation reproducible and the math
tunable from one place; config.json remains the file the runtime reads (no build
step added).

## Consequences

- Converged RTP ≈ 98.2–99.0% across 40–60M-spin runs (target 98.4%, parsheet
  tolerance ±1.5%); split ≈ base 0.47 / feature 0.51.
- Profile is high volatility: ~76% losing rounds, frequent small base wins (1–5×),
  rare big wins, capped at 15,000×.
- `min_cluster` reconciled to 6 (size-5 paytable tier removed).
- Parsheet sub-targets (base/feature RTP, trigger & win cycles) updated to the
  converged math; total RTP remains the hard constraint.
- New simulation RTP regression test guards convergence
  (`src/__tests__/simulation/rtp.test.ts`).
