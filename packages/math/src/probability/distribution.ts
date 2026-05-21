/* eslint-disable @typescript-eslint/no-restricted-types -- distribution CE (computation expressions) requires unknown for heterogeneous generator yield types; no safe alternative */
import type { Rng } from '../rng'
import { Either } from '../functional/either.js'
import { Array1 } from '../functional/array1.js'
import { SamplingPlan } from './sampling-plan.js'
import { AliasSampler } from '../samplers/alias-sampler.js'
import { LinearSampler } from '../samplers/linear-sampler.js'

// ─── WeightedSampler — Polymorphic selection strategies ───────────────────

export type WeightedSampler<T> = AliasSampler<T> | LinearSampler<T>

const LINEAR_THRESHOLD = 32

export function createWeightedSampler<T>(
  items: ReadonlyArray<readonly [T, number]>,
): WeightedSampler<T> {
  return items.length <= LINEAR_THRESHOLD ? new LinearSampler(items) : AliasSampler.build(items)
}

function samplerToPlan<T>(s: WeightedSampler<T>): SamplingPlan<T> {
  if (s instanceof AliasSampler) {
    const { range, sampleFn } = s.getSamplerData()
    return SamplingPlan.drawWith(0, range, (draw) => SamplingPlan.pure(sampleFn(draw)))
  } else {
    const tw = s.totalWeight
    return SamplingPlan.drawWith(0, tw, (n) => SamplingPlan.pure(s.lookup(n)))
  }
}

// ─── Sampler<T> — Composable random processes ───────────────────────────────

/**
 * Sampler<T> represents a random process that produces values of type T.
 *
 * It is built on top of SamplingPlan (the AST) but optimized for high throughput
 * by bypassing the interpreter when a direct sampler strategy is available.
 */
export class Sampler<T> {
  public readonly plan: SamplingPlan<T>
  private readonly _sampler: ((rng: Rng) => T) | null

  constructor(plan: SamplingPlan<T>, directSampler?: ((rng: Rng) => T) | null) {
    this.plan = plan
    this._sampler = directSampler ?? null
  }

  static pure<T>(value: T): Sampler<T> {
    return new Sampler(SamplingPlan.pure(value), () => value)
  }

  static fromWeighted<T>(items: Array1<readonly [T, number]>): Sampler<T> {
    const strategy = createWeightedSampler(items)
    const sampler =
      strategy instanceof AliasSampler
        ? (rng: Rng) => (strategy as AliasSampler<T>).sample(rng)
        : (rng: Rng) => {
            const s = strategy as LinearSampler<T>
            return s.lookup(rng(0, s.totalWeight))
          }
    return new Sampler(samplerToPlan(strategy), sampler)
  }

  static uniform<T>(items: Array1<T>): Sampler<T> {
    return Sampler.fromWeighted(Array1.map(items, (v) => [v, 1] as const))
  }

  static traverse<A, B>(items: readonly A[], f: (a: A, i: number) => Sampler<B>): Sampler<B[]> {
    if (items.length === 0) return Sampler.pure([])
    let acc: Sampler<B[]> = f(items[0]!, 0).map((v) => [v])
    for (let i = 1; i < items.length; i++) {
      const idx = i
      acc = acc.flatMap((arr) =>
        f(items[idx]!, idx).map((v) => {
          arr.push(v)
          return arr
        }),
      )
    }
    return acc
  }

  static sequence<T>(samplers: readonly Sampler<T>[]): Sampler<T[]> {
    return Sampler.traverse(samplers, (s) => s)
  }

  map<U>(f: (v: T) => U): Sampler<U> {
    const parentSampler = this._sampler
    return new Sampler(
      SamplingPlan.map(this.plan, f),
      parentSampler ? (rng: Rng) => f(parentSampler(rng)) : null,
    )
  }

  flatMap<U>(f: (v: T) => Sampler<U>): Sampler<U> {
    const parentSampler = this._sampler
    return new Sampler(
      SamplingPlan.flatMap(this.plan, (v) => f(v).plan),
      parentSampler
        ? (rng: Rng) => {
            const v = parentSampler(rng)
            const child = f(v)
            return child._sampler ? child._sampler(rng) : SamplingPlan.interpret(child.plan, rng)
          }
        : null,
    )
  }

  // ─── Combinators ──────────────────────────────────────────────────────

  /** Run the process to produce a sample. */
  sample(rng: Rng): T {
    return this._sampler ? this._sampler(rng) : SamplingPlan.interpret(this.plan, rng)
  }

  sampleN(n: number, rng: Rng): T[] {
    const out = new Array<T>(n)
    if (this._sampler) {
      const s = this._sampler
      for (let i = 0; i < n; i++) out[i] = s(rng)
    } else {
      for (let i = 0; i < n; i++) out[i] = SamplingPlan.interpret(this.plan, rng)
    }
    return out
  }
}

// ─── TrackedDistribution<T, Path> — Enumerable random processes ─────────────

export interface WeightedBranch<T, Path> {
  readonly asSampler: Sampler<TrackedDistribution<T, Path>>
  readonly weightedItems: ReadonlyArray<readonly [number, TrackedDistribution<T, Path>]>
}

export type Resolved<T, Path> = { readonly value: T; readonly path: Path }
export type TrackedDistribution<T, Path> = Either<Resolved<T, Path>, WeightedBranch<T, Path>>

export const TrackedDistribution = {
  resolved<T, Path>(value: T, path: Path): TrackedDistribution<T, Path> {
    return Either.left({ value, path })
  },

  branch<T, Path>(s: WeightedBranch<T, Path>): TrackedDistribution<T, Path> {
    return Either.right(s)
  },

  fromWeightedValues<T, Path>(
    items: Array1<readonly [number, T]>,
    pathFn: (v: T) => Path,
  ): TrackedDistribution<T, Path> {
    const outcomes = Array1.map(
      items,
      ([w, v]) => [w, TrackedDistribution.resolved<T, Path>(v, pathFn(v))] as const,
    )
    const sampler = createWeightedSampler(Array1.map(outcomes, ([w, o]) => [o, w] as const))
    return Either.right({
      asSampler: new Sampler(samplerToPlan(sampler)),
      weightedItems: outcomes,
    })
  },

  sample<T, Path>(dist: TrackedDistribution<T, Path>, rng: Rng): Resolved<T, Path> {
    let cur = dist
    for (;;) {
      if (Either.isLeft(cur)) return cur.value
      cur = cur.value.asSampler.sample(rng)
    }
  },

  map<T, U, Path>(
    dist: TrackedDistribution<T, Path>,
    f: (v: T) => U,
  ): TrackedDistribution<U, Path> {
    if (Either.isLeft(dist))
      return Either.left({ value: f(dist.value.value), path: dist.value.path })
    const s = dist.value
    return Either.right({
      asSampler: s.asSampler.map((inner) => TrackedDistribution.map(inner, f)),
      weightedItems: s.weightedItems.map(
        ([w, inner]) => [w, TrackedDistribution.map(inner, f)] as const,
      ),
    })
  },

  flatMap<T, U, Path>(
    dist: TrackedDistribution<T, Path>,
    f: (v: T, path: Path) => TrackedDistribution<U, Path>,
  ): TrackedDistribution<U, Path> {
    if (Either.isLeft(dist)) return f(dist.value.value, dist.value.path)
    const s = dist.value
    return Either.right({
      asSampler: s.asSampler.map((inner) => TrackedDistribution.flatMap(inner, f)),
      weightedItems: s.weightedItems.map(
        ([w, inner]) => [w, TrackedDistribution.flatMap(inner, f)] as const,
      ),
    })
  },

  /** Exhaustively enumerate all leaf outcomes of the distribution. */
  *enumerate<T, Path>(
    dist: TrackedDistribution<T, Path>,
    maxDepth = 50,
    minProb = 0,
  ): Generator<{ value: T; path: Path; probability: number }> {
    const stack: Array<[TrackedDistribution<T, Path>, number, number]> = [[dist, 1, 0]]

    while (stack.length > 0) {
      const [node, prob, depth] = stack.pop()!
      if (prob < minProb) continue
      if (Either.isLeft(node)) {
        yield { value: node.value.value, path: node.value.path, probability: prob }
        continue
      }
      if (depth >= maxDepth) continue
      const s = node.value
      const totalW = s.weightedItems.reduce((sum, [w]) => sum + w, 0)
      if (totalW === 0) continue
      for (let i = s.weightedItems.length - 1; i >= 0; i--) {
        const [w, inner] = s.weightedItems[i]!
        stack.push([inner, prob * (w / totalW), depth + 1])
      }
    }
  },
} as const

// ─── Distribution<T> — Standard discrete probability distribution ───────────

export type Distribution<T> = TrackedDistribution<T, void>

export const Distribution = {
  pure<T>(value: T): Distribution<T> {
    return TrackedDistribution.resolved(value, undefined)
  },

  weighted<T>(items: Array1<readonly [number, T]>): Distribution<T> {
    return TrackedDistribution.fromWeightedValues(items, () => undefined)
  },

  uniform<T>(items: Array1<T>): Distribution<T> {
    return Distribution.weighted(Array1.map(items, (v) => [1, v] as const))
  },

  map<T, U>(dist: Distribution<T>, f: (v: T) => U): Distribution<U> {
    return TrackedDistribution.map(dist, f)
  },

  flatMap<T, U>(dist: Distribution<T>, f: (v: T) => Distribution<U>): Distribution<U> {
    return TrackedDistribution.flatMap(dist, (v) => f(v))
  },

  sample<T>(dist: Distribution<T>, rng: Rng): T {
    return TrackedDistribution.sample(dist, rng).value
  },

  enumerate<T>(dist: Distribution<T>, maxDepth = 50, minProb = 0) {
    return TrackedDistribution.enumerate(dist, maxDepth, minProb)
  },

  expectedValue(dist: Distribution<number>, maxDepth = 50): number {
    let ev = 0
    for (const o of Distribution.enumerate(dist, maxDepth)) ev += o.value * o.probability
    return ev
  },
} as const

// ─── Distribution CE ────────────────────────────────────────────────────────

export function* bind<T>(dist: Distribution<T>): Generator<Distribution<T>, T, T> {
  return yield dist
}

export function distributionDo<T>(
  genFactory: () => Generator<Distribution<unknown>, T>,
): Distribution<T> {
  return buildCE(genFactory, [])
}

function buildCE<T>(
  genFactory: () => Generator<Distribution<unknown>, T>,
  pastValues: readonly unknown[],
): Distribution<T> {
  const it = genFactory()
  let step = it.next()
  for (let i = 0; i < pastValues.length; i++) {
    step = it.next(pastValues[i])
  }
  if (step.done) return Distribution.pure(step.value as T)
  return Distribution.flatMap(step.value as Distribution<unknown>, (v: unknown) =>
    buildCE(genFactory, [...pastValues, v]),
  )
}

// ─── Common Distributions ────────────────────────────────────────────────────

export const Distributions = {
  bernoulli(p: number): Distribution<boolean> {
    const w1 = Math.round(p * 1_000_000),
      w0 = 1_000_000 - w1
    return Distribution.weighted(Array1.of([w1, true] as const, [w0, false] as const))
  },
  uniformInt(lo: number, hi: number): Sampler<number> {
    return new Sampler(SamplingPlan.draw(lo, hi + 1))
  },
  fairDie(n: number): Distribution<number> {
    const faces = Array.from({ length: n }, (_, i) => [1, i + 1] as const)
    return Distribution.weighted(Array1.unsafeFromArray(faces) as Array1<readonly [number, number]>)
  },
} as const
