// ─── Either<L, R> — Discriminated union / tagged sum type ───────────────────

export type Either<L, R> =
  | { readonly tag: 0; readonly value: L } // Left
  | { readonly tag: 1; readonly value: R } // Right

export const Either = {
  left<L, R = never>(value: L): Either<L, R> {
    return { tag: 0, value }
  },
  right<L = never, R = unknown>(value: R): Either<L, R> {
    return { tag: 1, value }
  },
  match<L, R, A>(e: Either<L, R>, onLeft: (l: L) => A, onRight: (r: R) => A): A {
    return e.tag === 0 ? onLeft(e.value) : onRight(e.value)
  },
  mapLeft<L, R, L2>(e: Either<L, R>, f: (l: L) => L2): Either<L2, R> {
    return e.tag === 0 ? { tag: 0, value: f(e.value) } : { tag: 1 as const, value: e.value }
  },
  mapRight<L, R, R2>(e: Either<L, R>, f: (r: R) => R2): Either<L, R2> {
    return e.tag === 1 ? { tag: 1, value: f(e.value) } : { tag: 0 as const, value: e.value }
  },
  isLeft<L, R>(e: Either<L, R>): e is { readonly tag: 0; readonly value: L } {
    return e.tag === 0
  },
  isRight<L, R>(e: Either<L, R>): e is { readonly tag: 1; readonly value: R } {
    return e.tag === 1
  },
} as const
