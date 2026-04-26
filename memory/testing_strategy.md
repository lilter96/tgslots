---
title: "Testing Strategy"
type: "testing-strategy"
tags: 
- "memory"
- "testing"
up: 
- "[[index]]"
---
# Testing Strategy

## Framework

- **bun:test** (built into Bun runtime, Jest-compatible API)
- Run: `bun test` from the repo root, or `bun --filter @tgslots/<pkg> test` for a single workspace that defines tests

## Coverage Target

- **80%+** line coverage across all packages
- 100% coverage for math primitives (RNG, Sampler, Distribution)
- 100% coverage for payline evaluator (deterministic logic)

## Test Types

### Unit Tests

- Location: `packages/<name>/src/__tests__/` or co-located `*.test.ts`
- Scope: Single function or class in isolation
- Required for: all `@tgslots/math`, `@tgslots/slots-core` modules

### Integration Tests

- Location: `packages/<name>/src/__tests__/integration/`
- Scope: Game state machine full round-trip (spin → evaluate → collect)
- Required for: each game package

### Simulation/Statistical Tests

- Location: `packages/<name>/src/__tests__/simulation/`
- Scope: Run N spins, assert RTP within tolerance
- Tolerance: ±0.5% of target RTP at 1M spins
- Required for: each game, as regression guard

## Priority Order (current)

1. `@tgslots/slots-core` — payline/scatter evaluation, symbol registry, slot engine
2. `@tgslots/ancient-dragon` — sampler logic and state machine
3. `@tgslots/woodland-whisper` — sampler logic and state machine
4. `@tgslots/slots-simulation-engine` — metrics merge/finalize, runner, CLI parsing
5. Expand property/statistical checks where math primitives already have baseline coverage

## Test Seed Strategy

- Use fixed mt19937 seeds for deterministic unit/integration tests
- Statistical tests may use random seeds but must assert distributions, not exact values

## Current Status

- **10 test files / 165 passing tests** as of 2026-04-26
- Covered today: `@tgslots/math` RNG/probability/functionals and `@tgslots/slots-core` betting
- Missing today: direct coverage for both game packages, payline/scatter core, and simulation-engine
