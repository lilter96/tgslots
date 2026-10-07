# Woodland Whisper — configuration version 2

Target RTP: **96%**. The current integer paytable has an analytical total RTP of
**96.0006093%** (79.7884193% base contribution, 16.2121900% free-spin contribution).
These are long-run mathematical expectations, not a promise about a session.

Run `python3 scripts/verify-woodland-math.py` from the repository root to reproduce
an independent reference without importing the game's evaluator or RNG.

The reference conditions marginal reel-symbol probabilities on the shared
replacement symbol, evaluates line expectations, convolves scatter counts from
all actual cyclic reel windows, and evaluates the first repeated weighted bonus
draw over every subset of the ten possible values. The bonus award average is
12.7458608 spins; it is not the mean of a single weighted draw. Including
retriggers, a triggered feature averages 14.0407750 free spins.

Three defects corrected during verification:

- The array-engine builder compacted non-paying symbols, shifting the integer IDs
  after Chest. Original symbol IDs must remain stable, including non-paying ones.
- Buying the bonus previously tried 500 natural spins and failed about 2.65% of
  the time. Exact weighted sampling of eligible stop groups now preserves the
  natural reel-stop distribution conditioned on a trigger, without rejection.
- The Monte Carlo runner stopped at the pick stage. A simulation-only player now
  resolves explicit card picks before continuing every awarded spin and retrigger.
  The HTTP game still requires actual player input.

The version 2 paytable uses integer payouts and preserves symbol tiers. Reel
strips, scatter payments, 30 paylines, pick weights, 2× free-spin multiplier and
100× bonus-buy cost retain their configured values. `parsheet.json` contains
analytical benchmarks. `parsheet.legacy.json` preserves the previous, unverified
benchmarks for comparison and must not be used to claim the current RTP.

The 96% target refers to normal paid base rounds including their free-spin
features. Bonus-buy return is a separate measurement; it does not automatically
have the same RTP.
