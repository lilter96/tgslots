# Task: task_016_math_tests

## Description

Write comprehensive unit tests for the entire `@tgslots/math` package. Zero tests existed before this task.

## Requirements

- 100% coverage of all exported modules
- Fixed seeds for all deterministic tests
- Statistical tolerance tests for samplers (300k samples, ±1.5% tolerance)
- Error case coverage (invalid inputs, boundary conditions)
- Monad law coverage (pure, map, flatMap identity/composition)
- Stack-safety test for SamplingPlan (10k nested flatMaps)

## Implementation Plan

1. mt19937.test.ts — RNG determinism, range bounds, edge cases
2. sampling-plan.test.ts — AST nodes, interpret, sampleN, stack safety
3. alias-sampler.test.ts — build, sample, getSamplerData, statistical, errors
4. cumulative-sampler.test.ts — build, lookup, insert, toArray, errors
5. linear-sampler.test.ts — constructor, lookup, edge cases
6. array1.test.ts — of, fromArray, unsafeFromArray, head, map
7. either.test.ts — left/right construction, match, map variants, guards
8. sampler.test.ts — pure, fromWeighted, uniform, traverse, sequence, map, flatMap, sampleN
9. distribution.test.ts — pure, weighted, uniform, map, flatMap, sample, enumerate, expectedValue, distributionDo, Distributions

## Files to Modify

- `packages/math/src/__tests__/` (new directory + 9 test files)
- `packages/math/package.json` (add test script)

## Dependencies

- bun:test (built-in)
- @tgslots/math internal modules

## Status

completed

## Summary

Created 9 test files covering all exported math primitives. All tests pass.
Modules covered: mt19937, jsRng, SamplingPlan, AliasSampler, CumulativeSampler,
LinearSampler, Array1, Either, Sampler, Distribution, TrackedDistribution,
Distributions, distributionDo. Added `"test": "bun test"` to package.json.
