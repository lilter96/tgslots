# Testing Strategy

## Framework

- **bun:test** (built into Bun runtime, Jest-compatible API)
- Run: `bun test` from any package directory or monorepo root

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

## Priority Order (current — 0% coverage)

1. `@tgslots/math` — RNG, Sampler, Distribution, AliasSampler
2. `@tgslots/slots-core` — evaluator, paytable, symbol registry
3. `@tgslots/ancient-dragon` — logic.ts, state machine
4. `@tgslots/woodland-whisper` — evaluation.ts, logic.ts, state machine
5. `@tgslots/slots-simulation-engine` — metrics, runner

## Test Seed Strategy

- Use fixed mt19937 seeds for deterministic unit/integration tests
- Statistical tests may use random seeds but must assert distributions, not exact values

## Current Status

- **0 test files** as of 2026-04-21
- No test scripts in any `package.json`
- Adding tests is the highest-priority technical debt
