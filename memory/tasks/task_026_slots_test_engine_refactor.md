---
title: 'Task 026 Slots Test Engine Refactor'
type: 'task'
aliases:
  - 'task_026_slots_test_engine_refactor'
tags:
  - 'memory'
  - 'task'
up:
  - '[[index]]'
task_id: 'task_026_slots_test_engine_refactor'
status: 'done'
---

# Task 026: Slots test engine refactor

## Goal

Turn `packages/slots-simulation-engine/src/testing/slots-test-engine.ts` into the mandatory shared harness for slot gameplay/state-machine tests, while keeping the production `StateMachine` contract narrow and extensible.

## Completed

- Replaced the fixed helper with a fluent builder-based harness
- Added registered actions/scenarios/probes so games can model `buyBonus`, `pickBall`, seeded feature entry, and future flows without editing the shared core
- Removed duplicated round-execution logic by composing production `runCycle()` for full-cycle tests
- Migrated Ancient Dragon, Woodland Whisper, and Le Militare gameplay/state-machine suites onto the harness
- Added direct harness tests in `packages/slots-simulation-engine/src/__tests__/slots-test-engine.test.ts`

## Validation

- `bun test` in `packages/slots-simulation-engine`
- `bun test` in `packages/games/ancient-dragon`
- `bun test` in `packages/games/woodland-whisper`
- `bun test` in `packages/games/le-militare`
- `bun run typecheck` at the repo root
