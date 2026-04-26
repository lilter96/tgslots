---
title: "task_015_pick_bonus_sampler_refactor"
type: "task"
tags: 
- "memory"
- "task"
up: 
- "[[index]]"
- "[[progress]]"
task_id: "task_015_pick_bonus_sampler_refactor"
status: "completed"
---
# Task: task_015_pick_bonus_sampler_refactor

## Description

Refactor `performPickBonus` out of `WoodlandWhisperStateMachine`. Move pick bonus
config values from hardcoded constants to `config.json`. Compose the pick bonus as
a proper `Sampler<T>` in `logic.ts` so no `rng` is ever passed into game logic.

## Issues Found

- `performPickBonus(rng: Rng)` in `game-state-machine.ts` — direct rng parameter
  violates the RNG discipline: all randomness must go through Sampler monads.
- Values `[8, 9, 10, 13, 15, 20, 30, 50, 75, 100]` hardcoded in state machine,
  not read from `config.feature.pick_bonus`.
- Fisher-Yates shuffle (19 rng draws) used when the outcome is already known to be
  uniform: first matched pair in a shuffled 20-card deck is uniform by symmetry.
- `FREE_SPIN_MULTIPLIER` (`* 2`) hardcoded in state machine instead of from config.

## Implementation Plan

1. Add `PICK_BONUS_VALUES` and `FREE_SPIN_MULTIPLIER` to `constants.ts` from `config.feature`.
2. In `logic.ts`, add internal `pickBonusSampler = Sampler.uniform(PICK_BONUS_VALUES)`.
3. Add `withPickBonus(base)` helper that composes pick bonus via `flatMap`:
   - `sc >= 3` → draw from `pickBonusSampler`, embed as `pickedBonus`
   - `sc < 3` → `Sampler.pure({...result, pickedBonus: 0})`
4. Rewrite `SPIN_WITH_SCATTER` and `FREE_SPIN_WITH_SCATTER` using `withPickBonus`.
5. In `game-state-machine.ts`:
   - Remove `performPickBonus` method entirely
   - Destructure `{ pickedBonus, ...result }` from `.sample(rng)`
   - Read `pickedBonus` directly from result; replace `* 2` with `FREE_SPIN_MULTIPLIER`
6. Record RNG discipline rule in `memory/coding_rules.md`.

## Files Modified

- `packages/games/woodland-whisper/src/constants.ts` (add PICK_BONUS_VALUES, FREE_SPIN_MULTIPLIER)
- `packages/games/woodland-whisper/src/logic.ts` (pickBonusSampler, withPickBonus, updated exports)
- `packages/games/woodland-whisper/src/game-state-machine.ts` (remove performPickBonus)
- `memory/coding_rules.md` (RNG discipline rule)

## Key Insight

`Sampler.uniform(PICK_BONUS_VALUES)` is mathematically equivalent to the
Fisher-Yates shuffle approach. In a uniformly random permutation of 20 cards
(2 of each of 10 values), each value has equal probability 1/10 of being the
first matched pair — by symmetry. This replaces 19 rng draws with 1.

## Dependencies

- [[task_014_game_code_cleanup_and_alignment]]

## Summary

- Added `PICK_BONUS_VALUES`, `FREE_SPIN_MULTIPLIER` to `constants.ts` from config
- `pickBonusSampler` and `withPickBonus` added to `logic.ts`; pick bonus is now
  composed into `SPIN_WITH_SCATTER` and `FREE_SPIN_WITH_SCATTER` via `flatMap`
- Result type becomes `{ win, sc, pickedBonus }` — state machine reads `pickedBonus`
  directly, never touches rng beyond the `.sample(rng)` call
- `performPickBonus(rng)` deleted entirely
- RNG discipline rule recorded in `coding_rules.md`
- All packages typecheck with exit 0

## Status

completed
