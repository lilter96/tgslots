/**
 * LinearSampler — O(n) weighted selection for small collections.
 *
 * Simple linear scan over cumulative weights. Most efficient for n < 32 due to
 * CPU cache locality and lack of pointer chasing overhead.
 */
export class LinearSampler<T> {
  readonly items: ReadonlyArray<readonly [T, number]>
  readonly totalWeight: number

  constructor(items: ReadonlyArray<readonly [T, number]>) {
    this.items = items
    let tw = 0
    for (let i = 0; i < items.length; i++) tw += items[i]![1]
    this.totalWeight = tw
  }

  get size(): number {
    return this.items.length
  }

  /** O(n) lookup via linear scan. */
  lookup(target: number): T {
    let acc = 0
    for (let i = 0; i < this.items.length; i++) {
      acc += this.items[i]![1]
      if (target < acc) return this.items[i]![0]
    }
    return this.items[this.items.length - 1]![0]
  }
}
