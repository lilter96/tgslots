// ─── Array1<T> — Compile-time non-empty array guarantee ─────────────────────

export type Array1<T> = readonly [T, ...T[]]

export const Array1 = {
  of<T>(head: T, ...tail: T[]): Array1<T> {
    return [head, ...tail] as Array1<T>
  },
  fromArray<T>(arr: readonly T[]): Array1<T> | null {
    return arr.length > 0 ? (arr as unknown as Array1<T>) : null
  },
  /** Throws if array is empty. Use only when you have a proof of non-emptiness. */
  unsafeFromArray<T>(arr: readonly T[]): Array1<T> {
    if (arr.length === 0) throw new Error('Array1: empty array')
    return arr as unknown as Array1<T>
  },
  head<T>(a: Array1<T>): T {
    return a[0]
  },
  map<T, U>(a: Array1<T>, f: (v: T, i: number) => U): Array1<U> {
    return a.map(f) as unknown as Array1<U>
  },
} as const
