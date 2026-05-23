---
title: 'Testing Strategy'
type: 'testing-strategy'
aliases:
  - 'testing_strategy'
tags:
  - 'memory'
  - 'testing'
up:
  - '[[index]]'
status: 'active'
---

# Testing Strategy

## Slot gameplay tests

- All slot gameplay/state-machine/feature-flow tests must use `@tgslots/slots-simulation-engine/testing/slots-test-engine`
- Configure game-specific flows through fluent registration: actions, scenarios, and probes
- Avoid direct private `_state` mutation inside test files; if unreachable setup is required, localize it in one registered scenario
- Use the harness round/session helpers instead of hand-rolling `beginRound` / `collect` / `recordResultMetrics` / `recordRoundMetrics`

## Low-level logic tests

- Pure deterministic unit tests for isolated samplers/helpers may stay direct when they are not exercising slot round/state-machine behavior
- Keep these tests narrowly scoped and deterministic; use the shared harness once the test starts asserting gameplay state transitions, feature sessions, or round metrics
