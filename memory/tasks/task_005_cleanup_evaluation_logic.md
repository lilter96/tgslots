# Task: task_005_cleanup_evaluation_logic

## Description

Remove redundant `evaluate` function from `packages/games/ancient-dragon/src/evaluation.ts` which is now superseded by the implementation in `logic.ts`.

## Summary

- Removed `evaluate` from `evaluation.ts`.
- Retained `evaluateWithScatter` as the export.
- Verified simulation test still passes.

## Status

completed
