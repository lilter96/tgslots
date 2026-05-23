---
title: 'Slots Simulation Engine'
type: 'component'
aliases:
  - 'components/slots-simulation-engine'
tags:
  - 'memory'
  - 'component'
up:
  - '[[index]]'
component: 'slots-simulation-engine'
status: 'active'
---

# Slots Simulation Engine

## Responsibilities

- Own the generic simulation/reporting primitives in `packages/slots-simulation-engine`
- Provide the shared `StateMachine`-driven execution path used by simulations and gameplay-oriented slot tests
- Keep slot-specific behavior out of the engine core; games extend behavior through hooks and test-harness registration

## Testing harness

`src/testing/slots-test-engine.ts` is the required harness for slot gameplay/state-machine tests.

- The harness is built through `createSlotsTestEngine(...).registerAction(...).registerScenario(...).registerProbe(...).build()`
- Built-in execution paths are `spin`, `next`, `cycle`, and `round`
- Custom game flows like `buyBonus`, `pickBall`, or seeded feature-entry belong in registered actions/scenarios, not in the shared `StateMachine` interface
- Full-round execution must compose the production `runCycle()` helper instead of duplicating its logic

## Extension rule

- When a new slot action or tracked artifact is needed in tests, add it via fluent registration in the game’s test-engine setup
- Do not widen the production `StateMachine` contract just to satisfy tests unless the production simulation path itself needs the new operation
