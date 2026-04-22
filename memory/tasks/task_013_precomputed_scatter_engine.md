# Task: task_013_precomputed_scatter_engine

## Description
Implement `PrecomputedScatterEngine` — a strip-positional scatter evaluator that replaces the per-spin O(R×C) grid scan with an O(R) prefix-sum lookup precomputed at engine construction.

## Requirements
- Add `PositionalScatterEngine` interface to `slots-core/scatter/types.ts`.
- Create `PrecomputedScatterEngine` in `slots-core/scatter/precomputed-engine.ts`.
- Apply it in both game hot paths (ancient-dragon `logic.ts`, woodland-whisper `evaluation.ts`).
- Also fix double-grid-build bug in ancient-dragon `evaluateWithScatter`.

## Complexity analysis
| | Per-spin cost | Precompute |
|---|---|---|
| BaseScatterEngine | O(R × C) = 15–25 ops | none |
| PrecomputedScatterEngine | O(R) = 5 ops | O(R × N) once at init |

Improvement factor = C (rows). 3× for 5×3, 5× for 5×5.

## Key invariant
YINYANG (ancient-dragon) and COIN (woodland-whisper) are never INNER/REPLACEMENT
symbols, so scatter positions are identical across all resolved strip variants.
Precomputation from raw strip strings is therefore correct for all variants.

## Implementation Plan
1. Update `scatter/types.ts` — add `PositionalScatterEngine`.
2. Create `scatter/precomputed-engine.ts` — prefix-sum precomputation.
3. Update `ancient-dragon/logic.ts`:
   - Build `PrecomputedScatterEngine` at module level from `BASE_STRIP_STRINGS`.
   - Fix `evaluateWithScatter` double-grid-build bug.
   - Replace `scatterEngine.evaluate(grid, bet)` → `scatterEngine.evaluateAtPositions(positions, bet)`.
4. Update `woodland-whisper/evaluation.ts`:
   - Import `STRIP_STRINGS` and build precomputed engine at module level.
   - Replace `scatterEngine.evaluate(grid, bet)` → `scatterEngine.evaluateAtPositions(positions, bet)`.

## Files to Modify
- `packages/slots-core/src/scatter/types.ts`
- `packages/slots-core/src/scatter/precomputed-engine.ts` (new)
- `packages/games/ancient-dragon/src/logic.ts`
- `packages/games/woodland-whisper/src/evaluation.ts`

## Dependencies
- [[task_012_refactor_scatter_engine_polymorphism]] — `BaseScatterEngine` must exist first

## Summary
- `PositionalScatterEngine` interface added to `scatter/types.ts`
- `PrecomputedScatterEngine` created in `scatter/precomputed-engine.ts` — prefix-sum
  precomputation at init, O(R) `evaluateAtPositions` per spin
- Both games now use `PrecomputedScatterEngine` in the hot path
- Fixed double-grid-build bug in ancient-dragon `evaluateWithScatter` (was building
  the grid in the function body AND calling `evaluate()` which built it again)
- Decision log: `memory/decisions/decision_002_precomputed_scatter_engine.md`
- All packages typecheck with exit 0

## Status
completed
