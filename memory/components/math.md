---
title: "Math"
type: "component"
aliases: 
- "math"
tags: 
- "memory"
- "component"
- "math"
up: 
- "[[index]]"
- "[[architecture]]"
- "[[dependencies]]"
component: "math"
---
# Component: Math

## Package

`@tgslots/math` — `packages/math/`

## Responsibility

Foundation layer providing RNG, probabilistic sampling primitives, and functional utilities. Zero dependencies on other tgslots packages.

## Public API

### Root exports (`@tgslots/math`)

```typescript
type Rng = (lo: number, hi: number) => number
function mt19937(seed: number): Rng
function jsRng(lo: number, hi: number): number
type Array1<T> = [T, ...T[]]
type Either<L, R> = { tag: 'left'; value: L } | { tag: 'right'; value: R }
```

### Probability subpath (`@tgslots/math/probability`)

```typescript
class Sampler<T> {
  sample(rng: Rng): T
  sampleN(n: number, rng: Rng): T[]
  map<U>(f: (v: T) => U): Sampler<U>
  flatMap<U>(f: (v: T) => Sampler<U>): Sampler<U>
  static pure<T>(value: T): Sampler<T>
  static fromWeighted<T>(items: Array1<readonly [T, number]>): Sampler<T>
  static uniform<T>(items: Array1<T>): Sampler<T>
  static traverse<A, B>(...): Sampler<B[]>
  static sequence<T>(...): Sampler<T[]>
}
```

const Distribution = {
  pure<T>(value: T): Distribution<T>
  weighted<T>(items: Array1<readonly [number, T]>): Distribution<T>
  uniform<T>(items: Array1<T>): Distribution<T>
  sample<T>(dist: Distribution<T>, rng: Rng): T
  enumerate<T>(dist: Distribution<T>): Generator<{ value: T; probability: number }>
  expectedValue(dist: Distribution<number>): number
}

type TrackedDistribution<T, Path> = ...
```

### Samplers

```typescript
class AliasSampler<T> { static build<T>(items: ReadonlyArray<readonly [T, number]>): AliasSampler<T> }
class CumulativeSampler<T> { ... }
class LinearSampler<T> { ... }
```

## Dependencies

- None (foundation layer)

## Performance Notes

- AliasSampler uses interleaved uint32 pairs for cache efficiency
- mt19937 rejection sampling eliminates modulo bias
- Tests currently cover RNG, samplers, distributions, `Array1`, and `Either`
