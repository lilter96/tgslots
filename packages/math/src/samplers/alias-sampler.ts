import type { Rng } from '../rng'

/**
 * AliasSampler — Walker–Vose Alias Method, O(1) sampling.
 *
 * Build: O(n). Sample: one RNG call + one cache-line read + one branch.
 *
 * Design notes:
 * - Fixed-point precision P = 2^20. Per-bucket probability error ≤ 1/P ≈ 10^-6,
 *   total L1 distance from exact distribution ≤ n/P. Fine for gameplay/social
 *   casino; for certified-grade RTP math, swap to an exact-integer build path.
 * - Size limit: n ≤ 4096 so n·P ≤ 2^32 and the single-draw uint32 trick holds.
 * - prob[i] and alias[i] are interleaved into one Uint32Array, so both values
 *   for a column share a cache line — the hot path touches exactly one line.
 */
export class AliasSampler<T> {
  private static readonly SHIFT = 20
  private static readonly P = 1 << 20 // 2^20
  private static readonly MASK = (1 << 20) - 1 // 0xFFFFF
  private static readonly MAX_N = 1 << 12 // 4096

  readonly size: number
  readonly totalWeight: number
  private readonly values: readonly T[]
  private readonly packed: Uint32Array // [prob_0, alias_0, prob_1, alias_1, ...]
  private readonly range: number // n · P — single RNG draw range

  private constructor(values: readonly T[], packed: Uint32Array, totalWeight: number) {
    this.values = values
    this.packed = packed
    this.size = values.length
    this.totalWeight = totalWeight
    this.range = values.length * AliasSampler.P
  }

  /** Build alias table from weighted items in O(n). */
  static build<T>(items: ReadonlyArray<readonly [T, number]>): AliasSampler<T> {
    const n = items.length
    if (n === 0) throw new Error('AliasSampler: empty collection')
    if (n > AliasSampler.MAX_N) {
      throw new Error(
        `AliasSampler: n=${n} exceeds max ${AliasSampler.MAX_N} (single-draw uint32 range)`,
      )
    }

    const P = AliasSampler.P

    // Validate + sum in one pass. Zero-weight items are allowed (they just never sample).
    let totalWeight = 0
    for (let i = 0; i < n; i++) {
      const w = items[i]![1]
      if (!Number.isFinite(w) || w < 0) {
        throw new Error(`AliasSampler: item ${i} has invalid weight ${w}`)
      }
      totalWeight += w
    }
    if (totalWeight <= 0) throw new Error('AliasSampler: totalWeight must be > 0')

    const values: T[] = new Array(n)
    const scaled = new Float64Array(n)
    const norm = (n * P) / totalWeight // hoist the constant out of per-item multiply

    for (let i = 0; i < n; i++) {
      const [v, w] = items[i]!
      values[i] = v
      scaled[i] = w * norm
    }

    // Partition into small (<P) and large (≥P) scratch stacks.
    const small = new Uint32Array(n)
    const large = new Uint32Array(n)
    let sTop = 0,
      lTop = 0
    for (let i = 0; i < n; i++) {
      if (scaled[i]! < P) small[sTop++] = i
      else large[lTop++] = i
    }

    // Interleaved table: prob[i] at packed[2i], alias[i] at packed[2i+1].
    const packed = new Uint32Array(n * 2)

    // Walker–Vose merge. scaled[l] is decremented by the *unrounded* (P - scaled[s]),
    // which preserves sum(scaled) = n·P exactly in float arithmetic; prob[s] is
    // floored for uint32 storage, giving ≤ 1/P per-bucket bias.
    while (sTop > 0 && lTop > 0) {
      const s = small[--sTop]!
      const l = large[--lTop]!
      packed[s << 1] = scaled[s]! | 0 // prob[s] = floor(scaled[s])
      packed[(s << 1) + 1] = l // alias[s] = l
      scaled[l] = scaled[l]! - (P - scaled[s]!)
      if (scaled[l]! < P) small[sTop++] = l
      else large[lTop++] = l
    }

    // Numerical-drift cleanup: in exact arithmetic both piles finish empty, but
    // float drift can leave residuals in either. Any remaining column gets
    // prob = P — i.e. it returns its own value with probability 1.
    while (lTop > 0) packed[large[--lTop]! << 1] = P
    while (sTop > 0) packed[small[--sTop]! << 1] = P

    return new AliasSampler(values, packed, totalWeight)
  }

  /** O(1) sample — one RNG call, one cache-line read, one branch. */
  sample(rng: Rng): T {
    const { packed, values, range } = this
    const draw = rng(0, range)
    const i2 = (draw >>> AliasSampler.SHIFT) << 1
    const u = draw & AliasSampler.MASK
    return u < packed[i2]! ? values[i2 >>> 1]! : values[packed[i2 + 1]!]!
  }

  /**
   * Returns the precomputed draw range and a standalone sampling closure.
   * Intended for embedding into distributions / probability monads where the
   * composing structure owns the Rng and dispatches samplers by range.
   */
  getSamplerData(): { range: number; sampleFn: (draw: number) => T } {
    const { packed, values } = this
    const SHIFT = AliasSampler.SHIFT
    const MASK = AliasSampler.MASK
    return {
      range: this.range,
      sampleFn: (draw: number) => {
        const i2 = (draw >>> SHIFT) << 1
        const u = draw & MASK
        return u < packed[i2]! ? values[i2 >>> 1]! : values[packed[i2 + 1]!]!
      },
    }
  }
}
