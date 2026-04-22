import type { Rng } from './types.js'

/** Mersenne Twister 19937 — seedable, reproducible, period 2^19937-1. */
export function mt19937(seed: number): Rng {
  const N = 624,
    M = 397
  const mt = new Uint32Array(N)
  let mti = N + 1
  mt[0] = seed >>> 0
  for (mti = 1; mti < N; mti++) {
    mt[mti] = (1812433253 * ((mt[mti - 1]! ^ (mt[mti - 1]! >>> 30)) >>> 0) + mti) >>> 0
  }

  function next(): number {
    let y: number
    const mag01 = [0x0, 0x9908b0df] as const
    if (mti >= N) {
      let kk: number
      for (kk = 0; kk < N - M; kk++) {
        y = (mt[kk]! & 0x80000000) | (mt[kk + 1]! & 0x7fffffff)
        mt[kk] = mt[kk + M]! ^ (y >>> 1) ^ mag01[y & 0x1]!
      }
      for (; kk < N - 1; kk++) {
        y = (mt[kk]! & 0x80000000) | (mt[kk + 1]! & 0x7fffffff)
        mt[kk] = mt[kk + (M - N)]! ^ (y >>> 1) ^ mag01[y & 0x1]!
      }
      y = (mt[N - 1]! & 0x80000000) | (mt[0]! & 0x7fffffff)
      mt[N - 1] = mt[M - 1]! ^ (y >>> 1) ^ mag01[y & 0x1]!
      mti = 0
    }
    y = mt[mti++]!
    y ^= y >>> 11
    y ^= (y << 7) & 0x9d2c5680
    y ^= (y << 15) & 0xefc60000
    y ^= y >>> 18
    return y >>> 0
  }

  return (lo: number, hi: number): number => {
    const range = hi - lo
    if (range <= 1) return lo
    // Rejection sampling — eliminates modulo bias.
    // 0x100000000 is 2^32. We don't use >>> 0 here because 2^32 >>> 0 is 0.
    const limit = 0x100000000 - (0x100000000 % range)
    let r: number
    do {
      r = next()
    } while (r >= limit)
    return lo + (r % range)
  }
}

/** Math.random-based RNG — not seedable, suitable for non-reproducible use. */
export function jsRng(): Rng {
  return (lo, hi) => lo + Math.floor(Math.random() * (hi - lo))
}
