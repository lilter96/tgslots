---
title: "task_014_game_code_cleanup_and_alignment"
type: "task"
tags: 
- "memory"
- "task"
up: 
- "[[index]]"
- "[[progress]]"
task_id: "task_014_game_code_cleanup_and_alignment"
status: "completed"
---
# Task: task_014_game_code_cleanup_and_alignment

## Description

Refactor both game packages for correctness, naming consistency, and elimination of
boilerplate. Games share the same flow; their code should reflect that. Remove dead code,
leaked internals, and redundant aliases. Fix broken scatter-distribution reporting.

## Issues Found (audit)

### Cross-game

1. `engine.ts` boilerplate is 100% duplicated — PAYLINE_DATA→paylines and PAY_TABLE→paytableConfig
   conversion is identical in both games (~30 lines × 2). Extract to `buildEngineFromArrays` in slots-core.
2. `BASE_STRIP_STRINGS = STRIP_STRINGS` alias exists in both `constants.ts` — same value, pointless.
3. Both `index.ts` use `export *` which leaks internal functions into the public API.

### Ancient Dragon

4. `evaluation.ts` is dead code — not exported from `index.ts`, never imported, uses old
   `BaseScatterEngine` and still has the double-grid-build bug.
5. `logic.ts` exports `evaluate`, `evaluateWithScatter`, `resolveStrips` — internal implementation
   details that should not be public.
6. `game-state-machine.ts` never sets `scatters` on the result — simulation scatter distribution
   is silently broken (always 0) because `ModernDataCollector` reads `result.scatters`, not `result.sc`.
7. Stale comment in `engine.ts` line 39: `// Changed back to 3`.

### Woodland Whisper

8. `logic.ts` has full `BASE_*` duplication (BASE_INT_STRIPS, BASE_RESOLVED, BASE_SCATTER_VARIANTS,
   BASE_POS_SAMPLERS, BASE_REEL_SIZES) — all identical to non-BASE variants because
   `BASE_STRIP_STRINGS === STRIP_STRINGS`. Dead computation.
9. `logic.ts` exports `RESOLVED`, `BASE_RESOLVED`, `SCATTER_VARIANTS`, `BASE_SCATTER_VARIANTS`,
   `POS_SAMPLERS`, `BASE_POS_SAMPLERS` — internal symbols that should not be public.
10. `logic.ts` exports `BASE_SPIN_WITH_SCATTER` and `FS_SPIN_WITH_SCATTER` as aliases for
    `SPIN_WITH_SCATTER` and `FREE_SPIN_WITH_SCATTER` — confusing redundant names.
11. `game-state-machine.ts` imports the alias names instead of the canonical ones.
12. `game-state-machine.ts` has a dead `getAwardedSpins` method (comment says "now handled by
    performPickBonus", never called).

## Implementation Plan

1. Add `buildEngineFromArrays` to `slots-core/paylines/slot-engine.ts`.
2. Rewrite both `engine.ts` files to use the helper (~8 lines each).
3. Remove `BASE_STRIP_STRINGS` from both `constants.ts`.
4. Delete `ancient-dragon/evaluation.ts`.
5. Remove `export` from internal functions in `ancient-dragon/logic.ts`; fix `BASE_STRIP_STRINGS` ref.
6. Fix `ancient-dragon/game-state-machine.ts`: add `scatters: result.sc`.
7. Simplify `woodland-whisper/logic.ts`: remove all `BASE_*` duplicates, remove alias exports.
8. Update `woodland-whisper/game-state-machine.ts`: new import names, delete dead method.
9. Rewrite both `index.ts` with explicit named exports only.
10. Typecheck all packages.
11. Update memory.

## Files to Modify

- `packages/slots-core/src/paylines/slot-engine.ts` (add helper)
- `packages/games/ancient-dragon/src/evaluation.ts` (DELETE)
- `packages/games/ancient-dragon/src/engine.ts` (rewrite)
- `packages/games/ancient-dragon/src/constants.ts` (remove alias)
- `packages/games/ancient-dragon/src/logic.ts` (remove exports + alias ref)
- `packages/games/ancient-dragon/src/game-state-machine.ts` (fix scatters field)
- `packages/games/ancient-dragon/src/index.ts` (explicit exports)
- `packages/games/woodland-whisper/src/engine.ts` (rewrite)
- `packages/games/woodland-whisper/src/constants.ts` (remove alias)
- `packages/games/woodland-whisper/src/logic.ts` (simplify, remove exports)
- `packages/games/woodland-whisper/src/game-state-machine.ts` (imports, dead method)
- `packages/games/woodland-whisper/src/index.ts` (explicit exports)

## Dependencies

- [[task_013_precomputed_scatter_engine]] — PrecomputedScatterEngine must be in place

## Summary

- Added `buildEngineFromArrays` + `RawGameArrays` interface to `slots-core/paylines/slot-engine.ts`
- Both `engine.ts` files reduced from ~43 lines to 11 lines each using the helper
- Deleted `ancient-dragon/evaluation.ts` (dead code — never imported, old BaseScatterEngine, double-grid-build bug)
- Removed `BASE_STRIP_STRINGS` alias from both `constants.ts`
- Made `evaluate`, `evaluateWithScatter`, `resolveStrips` non-exported in `ancient-dragon/logic.ts`
- Fixed scatter distribution reporting: added `scatters: result.sc` to both spin/next results in `ancient-dragon/game-state-machine.ts`
- Simplified `woodland-whisper/logic.ts`: removed all `BASE_*` duplicates (~30 lines), removed alias exports
- Updated `woodland-whisper/game-state-machine.ts`: canonical import names, removed dead `getAwardedSpins`
- Rewrote both `index.ts` with explicit named exports only (3–4 lines each)
- All packages typecheck with exit 0

## Status

completed
