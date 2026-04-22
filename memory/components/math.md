# Component: Math

## Package

`@tgslots/math` — `packages/math/`

## Responsibility

Foundation layer providing RNG, probabilistic sampling primitives, and functional utilities. Zero dependencies on other tgslots packages.

## Public API

### RNG

```typescript
// types.ts
interface Rng {
  nextInt32(): number
}

// mt19937.ts
function mt19937(seed: number): Rng
```

### Sampler (composable random process monad)

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

### Distribution (discrete probability distribution)

```typescript
const Distribution = {
  pure<T>(value: T): Distribution<T>
  weighted<T>(items: Array1<readonly [number, T]>): Distribution<T>
  uniform<T>(items: Array1<T>): Distribution<T>
  sample<T>(dist: Distribution<T>, rng: Rng): T
  enumerate<T>(dist: Distribution<T>): Generator<{ value: T; probability: number }>
  expectedValue(dist: Distribution<number>): number
}
```

### Samplers

```typescript
// O(1) Walker-Vose alias method — use for large weighted sets (reels)
class AliasSampler { constructor(weights: number[]); sample(rng: Rng): number }
// O(n) cumulative — use for small sets
class CumulativeSampler { ... }
// O(n) linear scan
class LinearSampler { ... }
```

### Functional Utilities

```typescript
// Non-empty array
type Array1<T> = [T, ...T[]]

// Either monad
type Either<L, R> = { tag: 'left'; value: L } | { tag: 'right'; value: R }
```

## Dependencies

- None (foundation layer)

## Performance Notes

- AliasSampler uses interleaved uint32 pairs for cache efficiency
- mt19937 rejection sampling eliminates modulo bias
- Period: 2^19937-1
