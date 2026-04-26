---
title: "task_019_betting_architecture_refactor"
type: "task"
tags: 
- "memory"
- "task"
up: 
- "[[index]]"
- "[[progress]]"
task_id: "task_019_betting_architecture_refactor"
status: "completed"
---
# Task: task_019_betting_architecture_refactor

## Description

Refactor the betting system to enforce strict integer math, remove currency contamination from the math core, and optimize performance for high-volume simulations.

## Requirements

- Move `Denomination` out of the core betting module.
- Enforce strict integer math in `BetConfiguration`.
- Refactor `StateMachine` to use stateless `spin(rng, wager)`.
- Optimize grid evaluation to reduce memory allocation.
- Align all games and simulation engine with the new architecture.

## Implementation Plan

1.  **Refactor `@packages/slots-core/betting`**:
    - Update `BetConfiguration` and `Wager`.
2.  **Update Simulation Core**:
    - Update `StateMachine` interface and `runCycle`.
3.  **Update Games**:
    - `Ancient Dragon` and `Woodland Whisper` state machine refactor.
4.  **Update Simulation Runner**:
    - Align `runSimulation` and workers.
5.  **Validation**:
    - Update and run unit tests.

## Status

completed

## Summary

Successfully refactored the betting system into a production-grade, simulation-optimized architecture.

### Key Architectural Improvements:

- **Pure Math Core**: Removed `Denomination` and currency logic from `Wager`. The engine now operates exclusively on integer credits.
- **Strict Invariants**: `BetConfiguration` now enforces that all costs and derived values (like `creditsPerLine`) are whole integers.
- **Stateless Execution**: Updated `StateMachine.spin` to `spin(rng, wager)`, making the game logic truly stateless and deterministic.
- **Zero-Allocation Hot Path**: Introduced `ProjectedGrid` and `EvalGrid` interface. Evaluation now reads directly from reel strips without allocating new arrays every spin, significantly reducing GC pressure.
- **Improved Validation**: Added explicit checks for `(baseCost - sideBetBase) % lineCount === 0`.

### Verification Results:

- **Unit Tests**: All 8 tests in `packages/slots-core/src/__tests__/betting.test.ts` passed.
- **Simulation**: Verified stability and performance with multi-million spin runs for `Ancient Dragon` and `Woodland Whisper`.
