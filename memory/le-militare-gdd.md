# Le Militare — playable specification, math version 2

The source of truth is `packages/games/le-militare/config/config.json`. This
specification describes the giant sticky WILD design selected on 2026-10-07.
Earlier drafts describing five independent permanent WILDs, sticky interception
cells, 500× multipliers, 100× buys or a 96.2% target are superseded.

## Board, stake and pays

The board has six reels and five rows. A cluster consists of matching paying
symbols connected horizontally or vertically; diagonals do not connect. The
minimum payable count is six. BULLET, GRENADE, HELMET, MEDAL, RIFLE, TANK,
SOLDIER, GENERAL and PLANE have integer cluster paytables in the configuration.
WILD substitutes; SCATTER and S300 do not have cluster payouts.

Paytables list awards at a base stake of one. Awards scale with the integer
wager multiplier. Different winning clusters in a step are added. The same
WILD cannot support different symbol types in the same step: symbol types are
visited in grid scan order, and WILDs are claimed only by a paying cluster.
Pure-WILD regions do not pay independently.

## Giant sticky WILD — exact counting

In free spins, an S300 on a launcher reel (indices 0, 2, 4) activates the whole
column. That column becomes **one giant sticky WILD**, not five independently
paying symbols. Its full five-row footprint connects adjacent symbols at every
height, but adds **one** to a cluster's payable size. Two connected giants add
two. An ordinary interception WILD adds one as usual.

Examples:

- One giant + one paying symbol: count two, no payout.
- One giant + five connected paying symbols: count six, use the six-symbol award.
- Two giants + four connected paying symbols: count six.

The cluster evaluator retains physical positions for highlighting and clearing,
but applies the effective payable count before checking the minimum, looking up
the paytable, or claiming WILDs. A losing candidate must not claim a giant that
could support a later winning candidate.

Every cell of an activated column is excluded from clearing and gravity. It
remains WILD through all remaining cascades and free spins, including retriggers.
It is painted and held **before** other reels begin spinning. Activation is
presented once; carried columns do not replay the activation. The board renders
a single tall WILD labelled LOCKED / 1 SYMBOL. Winning giants highlight as one
symbol. The next paid round clears the previous bonus's locks and multiplier.

## Combat and cascades

Free-spin launcher reels may contain S300; target reels (indices 1, 3, 5) may
contain PLANE. If at least one launcher is armed, all PLANE symbols currently
on the grid are intercepted before cluster evaluation. Each intercepted plane
becomes an ordinary WILD and adds a sampled multiplier to the running sum.

**Interception WILDs in free spins are consumable:** they clear when part of a
winning cluster. Their multiplier contributions remain banked even after the
cells clear. Only the giant launcher columns are permanently pinned. This
prevents ordinary WILDs from accumulating into a self-paying persistent region.

For each cascade:

1. Detect new launcher activations and plane interceptions.
2. Paint giant columns and interception WILDs; add new multipliers.
3. Evaluate paying clusters with each giant counted once.
4. Clear winning positions except pinned giant columns.
5. Apply gravity and draw contiguous refill chunks from the corresponding strips.
6. Repeat until there is no paying cluster.

The defensive cascade limit is 100 steps. The audit treats reaching it as a
failure, rather than presenting a truncated round as successful verification.
Refill scatters accumulate toward the spin's scatter count; existing scatters
are retained on the board and are not counted again merely because a new step
starts.

## Multipliers and payout accounting

Combat multipliers use integer weighted pools specific to Recon, Assault and
Siege. There is no outcome-dependent adjustment, player history, or adaptive RNG.
The complete spin award is:

```
baseClusterWin = sum(step.stepWin)
effectiveMultiplier = max(1, endMultiplierSum)
uncappedWin = baseClusterWin * effectiveMultiplier * wager.multiplier
paidWin = min(uncappedWin, remainingRoundBudget)
```

The final accumulated multiplier applies to the sum of cluster awards for that
spin. In free spins it carries into the next spin and can only increase within
the same bonus. It does not carry into a new paid round.

The complete round, including entry, all free spins and retriggers, is capped
at **15,000× the triggering stake**. Reaching the cap terminates the bonus with
zero spins remaining and no additional retrigger. Serialized state preserves
`roundWin`, so reconstructing the machine cannot reset the remaining budget.
Raw sampled wins may exceed the remaining budget; displayed and paid result
wins are capped by the state machine.

## Free-spin entry and retriggers

Four / five / six / seven or more accumulated scatters award 9 / 13 / 17 / 21
free spins. A natural entry starts with no armed reels and multiplier zero.
Retriggers award the corresponding number while preserving existing locks and
multiplier. All free spins retain the triggering wager.

Strip probabilities determine natural triggers. The version-2 base strips
contain four scatters per reel, improving the trigger cadence from the previous
roughly 420-spin cycle to roughly 150 spins. The audit reports measured cadence;
this is an average, not a guarantee or timer.

## Paid features and volatility

Players select Recon / Assault / Siege before opening a paid round. Free spins
retain that round's mode. Modes have distinct multiplier tails and Air Raid
frequencies. The ordinary-spin RTP target is **98.4%** for each mode.

Feature prices live in each mode's `buy_costs`, and are read by the menu,
affordability check, stake deduction and audit through `getFeatureBuyCost`.
Legacy default exports mirror Assault prices for compatibility. Costs may have
decimals; symbol awards and multipliers remain integers.

- **Recon Strike:** one paid spin with approximately five times the natural
  free-spin trigger probability. An independent weighted roll can inject four
  scatters. Other naturally present scatters and refill scatters can increase
  the award. Consequently its payout distribution differs from a fixed nine-spin buy.
- **Air Raid:** a guaranteed base-game squadron. Planes can miss; zero successful
  interceptions still presents the complete squadron. Interceptions drop
  ordinary multiplier WILDs. The running multiplier resets after the paid round.
- **Combat Op:** guaranteed four-scatter entry, exactly nine initial free spins.
- **Elite Op:** guaranteed six-scatter entry, exactly seventeen initial free spins.
- **Super Op:** guaranteed seven-scatter entry, exactly twenty-one initial free
  spins and a starting multiplier of three.

Buy entry awards are fixed by the purchased tier. Additional entry-grid scatters
must not silently inflate a purchased tier. Retriggers during the bonus still
apply normally. No buy guarantees a winning or profitable result.

## Balance and engagement criteria

Balance prioritizes a readable progression: a more frequent natural bonus,
visible permanent columns, interceptions that feed a persistent multiplier,
ordinary winning cascades, and distinct volatility tails. The third launcher
is rarer than the first two, and target-reel plane density is reduced to keep
three-column cascades and multiplier growth within the RTP budget.

The target does not establish an exact theoretical RTP. `config/math-audit.json`
records independent seeded full-round Monte Carlo runs, 95% confidence intervals,
base and bonus contributions, hit rates, trigger cycles, empty bonus frequency,
lock frequency, quantiles, cap frequency, and maximum observed cascade length.
Buy prices are calibrated from a separate sample and checked against another
seed. Samples and uncertainty must be reported honestly; these portfolio
checks are not a production gambling certification.

## Reproduction and regression coverage

```
MODE=assault ROUNDS=20000000 PURCHASES=300000 SEED=20261008 \
  bun packages/games/le-militare/scripts/math-audit.ts
bun run validate
bun run build
```

The harness uses complete rounds and fails on negative or fractional paid wins,
round-accounting discrepancies, a payout above the round cap, or reaching the
cascade safety limit. Regression tests verify weighted cluster counting, wild
claim order, persistence through gravity, persistence between free spins,
consumption of interception WILDs, reset on the next paid round, multiplier
progression, and pre-spin presentation order. RTP regression bounds account for
measured full-round variance; the long independent audit supplies the stronger
statistical evidence.

## Independent verification snapshot

Each ordinary mode was checked over 20 million complete rounds (seed 20261008).
Each fixed-entry buy was checked over 400,000 complete bonuses on independent
seeds; each enhanced single-spin feature was checked over three million rounds.
These verification samples total 81.6 million rounds and exclude calibration.

| Ordinary mode | Measured RTP | 95% interval | Natural bonus cycle | Bonuses with a locked column | Winning free spins |
| --- | --- | --- | --- | --- | --- |
| Recon | 98.52% | 97.48–99.55% | 152.5 | 77.2% | 31.5% |
| Assault | 98.65% | 97.36–99.94% | 152.5 | 77.2% | 31.5% |
| Siege | 99.44% | 97.98–100.90% | 152.4 | 77.3% | 31.6% |

All ordinary and purchase cases include the 98.4% target in their individual
95% confidence intervals. Maximum observed cascade length in independent
verification was 78 steps, below the 100-step guard. No round-accounting,
integer-payout or 15,000× cap check failed. Simulated intervals are estimates,
and the rare-tail uncertainty is largest in Siege and enhanced single spins.

Measured natural bonuses have no free-spin payout in about 6.6–6.7% of cases.
The base round may still have paid. This distinction is preserved in the audit's
`emptyBonusRate` and `emptyRoundRate`, rather than counting the entry payout as
a successful free-spin bonus. Fixed nine-spin buys lock a column in about 76%
of cases; longer tiers do so more often.
