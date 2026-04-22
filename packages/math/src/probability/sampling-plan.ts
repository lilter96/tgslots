import type { Rng } from '../rng'

/**
 * SamplingPlan<T> — A composable blueprint for a random process.
 *
 * Implemented as a Free Monad + Trampoline. It models a probabilistic
 * computation as a data structure (AST) that can be interpreted later.
 *
 * Nodes:
 *   Pure     (0) — A deterministic value.
 *   Draw     (1) — A primitive RNG draw in [lo, hi).
 *   FlatMap  (2) — A monadic bind for sequential sampling.
 */

interface Pure<T> {
  readonly _t: 0
  readonly v: T
}

interface Draw<T> {
  readonly _t: 1
  readonly lo: number
  readonly hi: number
  readonly k: (n: number) => SamplingPlan<T>
}

interface FlatMap<T> {
  readonly _t: 2
  readonly src: SamplingPlan<unknown>
  readonly f: (a: unknown) => SamplingPlan<T>
}

export type SamplingPlan<T> = Pure<T> | Draw<T> | FlatMap<T>

export const SamplingPlan = {
  /** Lift a value into a deterministic plan. */
  pure<T>(value: T): SamplingPlan<T> {
    return { _t: 0, v: value }
  },

  /** A plan that draws a random integer in [lo, hi). */
  draw(lo: number, hi: number): SamplingPlan<number> {
    return { _t: 1, lo, hi, k: (n: number) => ({ _t: 0 as const, v: n }) }
  },

  /** A plan that draws and then continues with a new plan. */
  drawWith<T>(lo: number, hi: number, k: (n: number) => SamplingPlan<T>): SamplingPlan<T> {
    return { _t: 1, lo, hi, k }
  },

  map<T, U>(plan: SamplingPlan<T>, f: (v: T) => U): SamplingPlan<U> {
    return { _t: 2, src: plan, f: (a: unknown) => ({ _t: 0 as const, v: f(a as T) }) }
  },

  flatMap<T, U>(plan: SamplingPlan<T>, f: (v: T) => SamplingPlan<U>): SamplingPlan<U> {
    return { _t: 2, src: plan, f: f as (a: unknown) => SamplingPlan<U> }
  },

  /**
   * Interpret the plan using an RNG. Uses an iterative trampoline to remain stack-safe
   * even for deeply nested sequences.
   */
  interpret<T>(plan: SamplingPlan<T>, rng: Rng): T {
    type K = (a: unknown) => SamplingPlan<unknown>
    let cur: SamplingPlan<unknown> = plan as SamplingPlan<unknown>
    let stk: K[] = []
    let sp = 0

    for (;;) {
      switch (cur._t) {
        case 0: // Pure
          if (sp === 0) return cur.v as T
          cur = stk[--sp]!(cur.v)
          break
        case 1: // Draw
          cur = (cur as Draw<unknown>).k(rng((cur as Draw<unknown>).lo, (cur as Draw<unknown>).hi))
          break
        case 2: // FlatMap
          if (sp === stk.length) {
            const n = new Array<K>(Math.max(8, sp << 1))
            for (let i = 0; i < sp; i++) n[i] = stk[i]!
            stk = n
          }
          stk[sp++] = (cur as FlatMap<unknown>).f
          cur = (cur as FlatMap<unknown>).src
          break
      }
    }
  },

  /** Generate N samples from the plan. */
  sampleN<T>(plan: SamplingPlan<T>, n: number, rng: Rng): T[] {
    const out = new Array<T>(n)
    for (let i = 0; i < n; i++) out[i] = SamplingPlan.interpret(plan, rng)
    return out
  },
} as const
