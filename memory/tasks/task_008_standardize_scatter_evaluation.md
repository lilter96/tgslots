# Task: task_008_standardize_scatter_evaluation

## Description

Extend `slots-core` to provide a standardized scatter evaluation interface and update all memory documentation.

## Summary

- Added `ScatterDefinition` and `ScatterResult` interfaces.
- Implemented `evaluateScatters` in `packages/slots-core/src/scatter/evaluator.ts` (independent from payline evaluation).
- Updated `slots-core` exports.
- Updated `Ancient Dragon` to use the new `evaluateScatters` function.
- Verified simulation test for `Ancient Dragon`.

## Status

completed
