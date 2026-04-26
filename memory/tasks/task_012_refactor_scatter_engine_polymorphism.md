---
title: "task_012_refactor_scatter_engine_polymorphism"
type: "task"
tags: 
- "memory"
- "task"
up: 
- "[[index]]"
- "[[progress]]"
task_id: "task_012_refactor_scatter_engine_polymorphism"
status: "completed"
---
# Task: task_012_refactor_scatter_engine_polymorphism

## Description

Refactor ScatterEngine into an abstract class or interface that allows for clean, overridable implementation of scatter evaluation logic, removing standalone functions in favor of encapsulated engine methods.

## Requirements

- Refactor packages/slots-core/src/scatter/evaluator.ts to enforce engine-based evaluation.
- Ensure bet multiplication is part of the core engine contract.
- Enable game-specific overrides by extending BaseScatterEngine.

## Implementation Plan

1. Refactor packages/slots-core/src/scatter/evaluator.ts to define BaseScatterEngine class.
2. Move the core calculation logic into BaseScatterEngine.evaluate method.
3. Update Ancient Dragon and Woodland Whisper to extend BaseScatterEngine for their specific needs.
4. Verify simulation tests.

## Files Modified

- packages/slots-core/src/scatter/evaluator.ts — removed standalone `evaluateScatters`, renamed `DefaultScatterEngine` → `BaseScatterEngine`
- packages/games/ancient-dragon/src/logic.ts — replaced `evaluateScatters` calls with `scatterEngine.evaluate(grid, BET)`; fixed missing `bet` parameter bug
- packages/games/ancient-dragon/src/evaluation.ts — updated import to `BaseScatterEngine`
- packages/games/woodland-whisper/src/evaluation.ts — updated import to `BaseScatterEngine`

## Summary

- `evaluateScatters` standalone function removed; logic consolidated into `BaseScatterEngine.evaluate`
- `BaseScatterEngine` is a concrete, extensible class with `protected readonly def` — games can subclass and override `evaluate`
- Fixed a latent bug in `ancient-dragon/logic.ts` where `evaluateScatters` was called without a `bet` argument, yielding NaN scatter wins
- All packages typecheck cleanly (exit 0)

## Status

completed
