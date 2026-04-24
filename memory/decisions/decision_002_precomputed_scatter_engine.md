# Decision: PrecomputedScatterEngine for simulation hot path

## Context

`BaseScatterEngine.evaluate` scans every grid cell per spin — O(R×C) = 15–25 ops.
At 10M+ simulation spins this compounds into hundreds of millions of redundant iterations.
Strip content is fixed at startup; scatter positions never change between spins.

## Options Considered

1. **Keep BaseScatterEngine** — simple, no init cost, O(R×C) per spin.
2. **PrecomputedScatterEngine with prefix sums** — O(R×N) init once, O(R) per spin.
3. **Flat lookup table per position** — same as 2 but stores counts directly; chosen.

## Decision

Implement `PrecomputedScatterEngine` using prefix sums to build a per-reel
`scatterByPos[r][stopPosition]` lookup array at construction time.
`evaluateAtPositions(positions, bet)` replaces the grid scan in the simulation hot path.
`BaseScatterEngine` is kept for contexts where only a materialized grid is available.

## Key invariant relied upon

Neither YINYANG (ancient-dragon) nor COIN (woodland-whisper) appears in the
INNER/REPLACEMENT symbol pool. Therefore scatter positions are identical across
all resolved strip variants — precomputation from raw string strips is valid for all.

## Consequences

- Scatter evaluation in the simulation loop: O(R×C) → O(R), ~3× faster for 5×3.
- Also fixed a latent double-grid-build in `ancient-dragon/evaluateWithScatter`
  (grid was built twice: once in the function, once inside the `evaluate` call).
- `PositionalScatterEngine` interface added to `scatter/types.ts` as the contract.
- Future games must verify their scatter symbol is not a replacement candidate
  before using `PrecomputedScatterEngine`. Document in game's component file.
