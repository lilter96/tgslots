# Task: task_018_production_betting_system

## Description

Design and implement a production-grade slot machine betting system in TypeScript.
The system must enforce strict integer math for credits and cents for currency.
It must support denominations, bet levels, bet ladders, and validation.
It also includes updating the simulation engine to use the new system.

## Requirements

- **Strict Integer Credits**: `creditsPerLine`, `totalWager`, `totalLineWager`, etc., must all be integers.
- **Strict Integer Currency**: All real-money values must be integers representing cents.
- **Denominations**: Support mapping credits to currency.
- **Bet Levels & Ladder**: Support a list of valid bet multipliers.
- **Validation**: Ensure wagers are valid against the game's cost structure and bet ladder.
- **Serialization**: Objects must be serializable to JSON.
- **Multi-frame Support**: Support homogeneous multi-frame wagering.
- **Simulation Engine Integration**: Update workers and main entry points.

## Implementation Plan

1.  **Refactor `@packages/slots-core` betting module**:
    - `Denomination`, `BetLevel`, `BetLadder`, `BetConfiguration`, `Wager`, `WagerBreakdown`.
2.  **Simulation Engine Integration**:
    - Update `WorkerPayload`, `runWorkerLoop`, `DataCollector`.
    - Update `apps/simulations/` main and workers.
3.  **Align Games**:
    - `Ancient Dragon`: 100 lines / 100 credits.
    - `Woodland Whisper`: 30 lines / 30 credits.
4.  **Tests**:
    - `packages/slots-core/src/__tests__/betting.test.ts`.

## Status

completed

## Summary

Implemented a production-grade betting system with strict integer math and denomination support.

### Key Changes:

- **Core Betting Module**:
  - `BetConfiguration` now enforces that `baseCost` is a multiple of `lineCount`, ensuring `creditsPerLine` is always an integer.
  - Introduced `Wager` class which combines `betMultiplier`, `Denomination`, and `BetConfiguration`.
  - `WagerBreakdown` updated to use strictly integer credits for all fields.
  - All betting entities support `toJSON()` for safe serialization.
- **Simulation Engine**:
  - Updated `WorkerPayload` to pass `betMultiplier` and `betConfig`.
  - Updated `runWorkerLoop` to use `sm.setWager()` if available on the state machine.
  - Updated CLI to support `--multiplier` / `-m` argument.
- **Game Alignment**:
  - **Ancient Dragon**: Adjusted to 100 lines for 100 credits (from 30) to maintain strict integer credits while preserving RTP.
  - **Woodland Whisper**: Integrated with new `WagerBreakdown` and verified with simulations.
- **Tests**:
  - Added comprehensive unit tests in `packages/slots-core/src/__tests__/betting.test.ts` covering integer math invariants, denominations, and multi-frame wagering.
