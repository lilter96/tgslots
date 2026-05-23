---
title: Active Context
type: active-context
tags: [memory, context]
up: '[[index]]'
---

# Active Context

## Current focus

`packages/slots-simulation-engine/src/testing/slots-test-engine.ts` is now a fluent, extensible gameplay test harness. Ancient Dragon, Woodland Whisper, and Le Militare state-machine/gameplay suites use registered actions/scenarios/probes instead of direct `_state` mutation or hand-rolled round execution.

## Next

- Sweep any remaining gameplay-style slot tests onto the shared harness if new suites are added
- Keep `slots-test-engine` extensible through registration rather than widening the production `StateMachine` contract
- Continue expanding deterministic tests around slot math, feature transitions, and metrics reporting
