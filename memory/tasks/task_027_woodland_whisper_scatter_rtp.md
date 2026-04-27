---
title: "Task 027: Woodland Whisper Scatter RTP"
type: "task"
task_id: "task_027_woodland_whisper_scatter_rtp"
status: "completed"
tags: 
- "memory"
- "task"
- "woodland-whisper"
- "metrics"
up: 
- "[[progress]]"
---
# Task 027: Woodland Whisper Scatter RTP

## Objective

Add granular scatter RTP recording for both base game and free game phases in the Woodland Whisper state machine to allow better visibility into the contribution of scatter wins to total RTP.

## Implementation Details

- Modified `logic.ts`: Added `scatterWin` to `SpinEvaluationResult` and updated `evaluateWithWager` to return it.
- Modified `game-state-machine.ts`: Removed direct imports of `SCATTER_PAY` and `FREE_SPIN_MULTIPLIER`. Added `scatterWin` to result interfaces. Updated `baseGameSpin` and `freeGameSpin` to propagate the engine-calculated `scatterWin`.
- Added `_currentRoundFreeScatterWin` to `WoodlandWhisperStateMachine` to accumulate scatter wins across multiple free spins in a single round.
- Updated `recordResultMetrics` to record scatter wins using the value provided in the result object.
- Updated `recordRoundMetrics` to record `scatter-rtp` for free spins against the round bet.
- Fixed type errors in `packages/games/ancient-dragon/src/__tests__/state-machine.test.ts` related to `verbatimModuleSyntax`.
- Fixed test errors in `packages/games/woodland-whisper/src/__tests__/state-machine.test.ts` where `pickBall` was called with an unused `rng` argument.
- Added a new test case to verify the scatter RTP recording logic, updating mock results to include `scatterWin`.

## Verification

- `bun run typecheck`: Passed.
- `bun test packages/games/woodland-whisper`: Passed (4 tests, including new scatter-win test).

## Completion Date

2026-04-26
