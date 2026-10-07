# How TGSlots mathematics work

This document follows the implementation from probability configuration to a
paid result and its independent verification. The four games share probability,
evaluation and reporting primitives; their actual feature rules remain in their
game packages. The browser renders results returned by the API.

[README](../README.md#mathematics-and-verification) ·
[Game packages](../packages/games) ·
[Math primitives](../packages/math/src) ·
[Simulation infrastructure](../packages/slots-simulation-engine/src)

## 1. Why the mathematical layer is separate

A game configuration describes strips, symbol IDs, paytables, weighted events,
feature prices and caps. A sampler generates an outcome according to that
configuration. An evaluator determines which combinations pay. A state machine
applies feature rules and the remaining round budget. The API handles the session
and, for X7, the authoritative demo wallet. Animation does not determine awards.

```text
configuration + prior state + wager + RNG
                  ↓
           sampled stops / events
                  ↓
          deterministic evaluation
                  ↓
       next state + payable result
             ↙              ↘
     API / client       simulation collector
```

This separation lets the HTTP game, seeded tests and simulations execute the same
rules. Independent references are implemented separately to detect mistakes in
those shared rules, rather than merely repeat their answer.

## 2. RNG and composable probability models

### The RNG boundary

[`Rng`](../packages/math/src/rng/types.ts) is an integer-draw function over
`[lo, hi)`. The project's
[`seeded generator`](../packages/math/src/rng/mt19937.ts) provides repeatable draws
for simulations and tests. Its bounded-draw path rejects values above the largest
multiple of the requested range before applying modulo. This avoids the unequal
bucket sizes produced by direct modulo reduction.

The ordinary Bun API currently injects `jsRng()`, backed by `Math.random`, into its
game dispatcher. It is not seedable. X7 instead obtains a 32-bit seed from
`crypto.getRandomValues` in Bun mode or `crypto/rand` in Go mode, then passes it
to the same seeded executor. The seeded generator itself is not a cryptographic
randomness service, and this repository does not implement a commit/reveal
provably-fair protocol.

A reproducible X7 transition depends on **configuration/version, prior state,
action, multiplier and seed**, not the seed alone. Go retains a pending command's
seed after an ambiguous RPC failure, so a retry computes the original outcome
instead of drawing a new one.

### `Sampler<T>` and `SamplingPlan<T>`

[`Sampler<T>`](../packages/math/src/probability/distribution.ts) expresses a
weighted or composed random process. `map` transforms a sampled value; `flatMap`
selects a dependent process; `sequence` and `traverse` combine draws. Game logic
builds these processes and state-machine entry points run them with the RNG.

[`SamplingPlan<T>`](../packages/math/src/probability/sampling-plan.ts) represents
those operations as `Pure`, `Draw` and `FlatMap` nodes. Its iterative interpreter
uses an explicit continuation stack, keeping deeply composed plans stack-safe.
`Sampler` also keeps direct sampling functions where available, avoiding AST
interpretation on that path. This preserves a common probability abstraction
without requiring every simulated draw to traverse an interpreter.

Weighted selection is chosen by table size:

| Strategy                             | Implementation                                                             | Why it exists                                                                                                |
| ------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Linear scan, ≤32 entries             | [`LinearSampler`](../packages/math/src/samplers/linear-sampler.ts)         | Small symbol, prize and multiplier pools use a simple cumulative-weight scan                                 |
| Walker–Vose alias table, >32 entries | [`AliasSampler`](../packages/math/src/samplers/alias-sampler.ts)           | Build a table once; subsequent selection uses one bounded draw and indexed lookup                            |
| AVL cumulative-weight tree           | [`CumulativeSampler`](../packages/math/src/samplers/cumulative-sampler.ts) | Separate primitive supporting weighted lookup and insertion; not the default `Sampler.fromWeighted` strategy |

For an integer-weight linear pool, `P(item i) = weight_i / sum(weights)`, subject
to the supplied RNG. The alias implementation quantizes bucket thresholds to
`2^20` units; it is a finite-precision approximation, not an exact rational
sampler. This matters when interpreting an analytical reference versus actual
sampling. The threshold and implementation are code choices, not a measured
performance guarantee for every workload.

## 3. Two different ways to generate a board

Ancient Dragon and Woodland Whisper draw stops on configured cyclic reel strips.
The visible three-row window contains adjacent strip entries; rows on the same
reel are therefore not independent symbol draws. Resolved strip variants replace
the mystery symbol consistently with the selected replacement symbol. The shared
replacement also introduces dependence between reels until conditioned on that
choice.

X7 uses a different model: its
[`base sampler`](../packages/games/x7-club/src/samplers.ts) samples 15 weighted
symbol cells, plus prize values. It does not pretend those symbols came from the
classic games' reel strips. Its Hold & Spin sampler generates coin arrivals and
awards; the machine discards arrivals at occupied positions.

Le Militare uses configured strips and
[`contiguous refill chunks`](../packages/games/le-militare/src/grid-samplers.ts).
Refilling a cascade preserves the strip-based model instead of replacing it with
unrelated independent cell probabilities.

## 4. Payline evaluation

At load time, the
[`engine builder`](../packages/slots-core/src/paylines/slot-engine.ts) creates a
symbol registry, a flat typed-array paytable and a
[`payline trie`](../packages/slots-core/src/paylines/payline-trie.ts). Lines with
the same row choices on their first reels share a prefix in the trie.

The [`evaluator`](../packages/slots-core/src/paylines/evaluator.ts) walks this
structure with iterative DFS. A path tracks the resolved symbol, consecutive
match count and WILD multiplier. Shared prefixes are evaluated together; when a
combination ends, the applicable subtree's lines receive the appropriate award.
All-WILD combinations use the best configured award for their length.

The paytable lookup is `payouts[symbolId][matchCount]`. Integer IDs stay stable
when non-paying symbols occur between paying ones. Removing a non-paying symbol
from the registry would change the meaning of subsequent IDs in strips and grids.

Why this structure: it prepares reusable evaluation data outside the spin loop,
shares work between overlapping paylines, and returns line IDs and award details
that the client can highlight. Stack frames and hit arrays still allocate per
call; this is not an allocation-free evaluator.

For the classic games, the payout basis is explicit:

```text
line win    = sum(line paytable awards) × credits per line × feature multiplier
scatter win = scatter award × total stake × feature multiplier
spin win    = line win + scatter win
```

The [`scatter engine`](../packages/slots-core/src/scatter/precomputed-engine.ts)
precomputes visible scatter counts at strip positions using prefix sums. Classic
games append the initial two entries to their strips to represent wrapping
three-row windows. A spin then needs one scatter-count lookup per reel.

## 5. Cluster geometry, giant WILDs and cascades

The [`cluster evaluator`](../packages/slots-core/src/cluster/evaluator.ts) performs
iterative, four-connected BFS for each paying symbol present on the board. WILDs
are traversable; a component must contain a real paying symbol. Diagonals do not
connect, and pure-WILD regions do not pay independently. In Le Militare, a WILD
claimed by one winning symbol type cannot pay again for another type in that step.

Physical connectivity and payable size are deliberately separate. A five-row
giant WILD has one anchor with weight 1 and four cells with weight 0. All five
cells participate in connectivity and highlighting, but their combined payable
weight is one. A giant plus five connected paying symbols reaches the six-symbol
minimum; a giant plus one paying symbol does not.

The [`combat cascade sampler`](../packages/games/le-militare/src/combat.ts)
combines launcher activations, interceptions, shared cluster evaluation,
clearing, gravity and strip-chunk refills. Pinned giant columns are excluded from
clearing and gravity. Ordinary interception WILDs can clear; their sampled
multiplier contributions remain in the bonus state.

```text
base cluster award = sum(all cascade-step awards)
combat factor      = max(1, accumulated multiplier)
uncapped spin win  = base cluster award × combat factor × wager multiplier
paid spin win      = min(uncapped spin win, remaining round budget)
```

The multiplier applies to the complete spin's cluster sum, not separately sampled
animation events. Free spins carry the multiplier and locked reels forward.
`roundWin` survives serialization, so restoring a bonus cannot reset its cap.
The independent audit treats reaching the defensive cascade limit as a failed
integrity check.

## 6. State machines and credit accounting

The shared [`StateMachine` contract](../packages/slots-simulation-engine/src/core/state-machine.ts)
defines an initial `spin`, continuation `next`, state and metric hooks. A paid
round may produce many results: an entry, free spins, retriggers, respins or
boosters. The state machine decides when the round is finished; visual timing
does not advance its rules.

[`Wager`](../packages/slots-core/src/betting/wager.ts) validates the integer
multiplier and checks `totalLineWager + totalSideBet = totalWager`. It separates
per-line credits from total stake to prevent using the wrong payout basis.
Free spins and bonus prizes retain the triggering multiplier rather than a
subsequently selected UI bet.

Symbol awards and held prizes use integer credits. Le Militare's feature purchase
prices can be fractional multiples of its base stake, so claiming that every
wallet operation across all games uses integer-only amounts would be inaccurate.
Round caps are game-specific. For X7, preceding base wins consume part of the
same budget that limits the final held-prize payout.

## 7. Woodland Whisper: deriving the full-round expectation

The [`Python reference`](../scripts/verify-woodland-math.py) reads configuration
without importing the game's RNG or evaluator. It computes normal-round expected
return in four stages.

1. **Line expectation.** Condition on each shared replacement symbol, compute
   per-reel symbol marginals, evaluate the longest payable combinations and
   all-WILD cases, then average over replacement probabilities. Conditioning
   prevents incorrectly treating the shared replacement as independent per reel.
2. **Scatter expectation.** Count scatters in every actual cyclic three-row
   window. Convolve the five reel count distributions to obtain scatter payments
   and the probability `p` of a pick-feature trigger.
3. **Pick award.** Evaluate weighted draws until the first repeated value over
   all subsets of already-seen values. Ten distinct values give `2^10 = 1,024`
   states. The mean award is not the mean of one weighted draw.
4. **Retriggers.** Account for additional features generated during free spins.

For seen-value set `S`, award values `v_i` and draw probabilities `q_i`:

```text
A(S) = sum_i q_i × (v_i if i is already in S, otherwise A(S union {i}))
a    = A(empty set)
```

Let `b` be expected base-spin return per original stake. Free spins use multiplier
2, so their expected per-spin return is `2b`. Each free spin has expected `pa`
additional awarded spins. When `pa < 1`:

```text
expected free spins after entry T = a / (1 - p × a)
normal-round RTP                 = b + p × T × 2b
```

For the stored configuration, `a ≈ 12.7458608`, `T ≈ 14.0407750`, base return
is approximately **79.7884193%**, and feature contribution is approximately
**16.2121900%**, giving **96.0006093%**. These are numerically evaluated
analytical expectations, not claims about a short player's session.

Purchased entry uses
[`scatter-count groups`](../packages/games/woodland-whisper/src/bonus-position-sampler.ts).
Eligible group combinations are weighted by the product of their stop counts,
then stops are drawn within those groups. This models natural stop combinations
conditioned on a trigger and guarantees entry without a finite rejection loop.
Its sampling still inherits the weighted-sampler precision described above.
A bonus purchase has its own cost and distribution; the normal-round formula
does not automatically establish its purchase return.

## 8. X7: held prizes, booster state and purchase normalization

The game supplies sampled events to the deterministic
[`Hold & Spin primitives`](../packages/slots-core/src/hold-spin/hold-spin.ts).
Those primitives check position uniqueness, preserve held prizes, update respins,
and manage completed/pending columns. Separate sampled events and state updates
make it possible to test the mechanics without relying only on rare random hits.

Each empty cell receives a coin with probability `85 / 1000`. With `m` empty cells,
independent arrivals give:

```text
P(at least one new coin) = 1 - (1 - 0.085)^m
```

Any arrival resets respins; otherwise they decrease. As the board fills, the
number of opportunities changes. A completed column queues one booster and keeps
its respin count unchanged while that booster resolves. The weighted outcomes
are bank 65, +1× stake 24, +2× stake 10 and ×7 1. A ×7 or bank finishes it; a
seven-pull limit also ends it. Additive awards and multiplication affect the
column's current coin values, making their order relevant.

The [`purchase simulation adapter`](../packages/games/x7-club/src/simulation-state-machine.ts)
uses a 1,540-credit paid cost (`20 × 77`) at multiplier 1, while the game retains
the original 20-credit stake for prizes and the cap. Dividing purchase winnings
by 20 instead of 1,540 would overstate purchase return by a factor of 77.
The adapter changes entry and accounting, then uses the same bonus transitions.

## 9. Monte Carlo rounds, metrics and uncertainty

[`runCycle`](../packages/slots-simulation-engine/src/core/state-machine.ts)
opens one paid round, collects its entry result and every continuation, then
closes it. Woodland's simulation adapter resolves explicit picks as part of
this progression. Counting only base spins, or treating free spins as new paid
rounds, would distort both RTP and volatility.

The collector distinguishes award sums from wager-normalized return:

```text
observed RTP = total paid winnings / total paid wager
payout metric = summed credit amount
RTP metric    = summed credit amount / cumulative paid wager
```

The [`worker runner`](../packages/slots-simulation-engine/src/runner/index.ts)
uses `node:worker_threads`, deterministic per-worker seeds and merged metrics.
Warmup runs execute the game without collecting reported results. Reproducing
an audit requires its configuration, seed, worker count, warmup and mode; changing
worker count changes the seed streams, even if the top-level seed stays the same.

For a fixed paid cost, define each complete round's normalized return as
`X = paid round win / paid cost`. Stored audits report normal-approximation
95% intervals of the form `mean(X) ± 1.96 × stdDev(X) / sqrt(rounds)`.
This exposes sampling uncertainty, particularly for rare, high-value features;
an interval containing a target is not proof of an exact RTP or complete tail
coverage. The shared collector also reports hit/trigger rates, feature metrics
and payout-distribution buckets.

## 10. Why there are independent references as well as simulations

A million runs of a buggy evaluator can consistently estimate the wrong model.
This project therefore combines several kinds of evidence:

| Check                                                 | What it establishes                                                                                                             |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Seeded state-machine and mechanic tests               | Rule behaviour, replay, locking, award timing, serialization and limits                                                         |
| Woodland analytical reference                         | Expected return calculated independently from configuration                                                                     |
| Le Militare held-out complete-round Monte Carlo audit | Actual game engine, verification seeds separate from calibration, accounting invariants, capped returns and per-mode statistics |
| X7 shared-runner audit                                | Complete normal and purchased rounds with correct cost normalization and confidence intervals                                   |
| X7 API/race checks                                    | Wallet and request correctness around the mathematical outcome                                                                  |
| Browser recordings                                    | Presentation follows actual API results; recordings do not establish RTP                                                        |

The stored Le Militare audit records 81.6M complete verification rounds and
configuration hashes. Here, independent verification means new seed streams
separate from calibration; its runner calls the actual game engine, rather than
a separately implemented cluster or combat evaluator. X7 records 5M base rounds
and 1M purchases. These counts describe the stored reports. See [the README evidence table](../README.md#mathematics-and-verification)
for observed values and reproduction commands.

## 11. Calibration and engagement without adaptive outcomes

A target RTP constrains the long-run mean, but does not determine hit frequency,
bonus cadence or the shape of the payout distribution. Reel/coin probabilities
control opportunity rates, paytables control award scales, multiplier pools
shape upper tails, and purchase prices change return relative to paid cost.
Consequently two modes can aim at the same RTP and still have different
volatility and feature progression.

Le Militare's verification tracks natural trigger cadence, activated-reel rate,
empty bonuses, free-spin hits and payout statistics alongside mean return.
Its report explicitly excludes calibration samples from independent verification
counts. X7's state controls occupied cells, resets and queued boosts; its
probability pools remain configured rather than adjusted using player losses.
Woodland's analytical reference reads the current configuration and computes its
expectation; it does not tune awards until the answer matches a target.

The workflow is: choose rules and configuration, calculate or measure their
return, adjust the configuration if needed, then verify that frozen configuration
with separate checks. No model here promises a win after a fixed number of
misses or changes its RNG probabilities to recover a particular player's balance.
