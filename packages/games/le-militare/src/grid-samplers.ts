import { Sampler, SamplingPlan } from '@tgslots/math/probability'
import type { Rng } from '@tgslots/math/rng/types'
import { MutableCascadeGrid } from '@tgslots/slots-core'
import { REEL_COUNT, ROW_COUNT } from './constants.js'

export function makeStripChunkSampler(
  strip: Uint8Array,
  length: number,
): Sampler<readonly number[]> {
  if (length === 0) return Sampler.pure([])
  const n = strip.length - 2
  return new Sampler<number>(SamplingPlan.draw(0, n), (rng: Rng) => rng(0, n)).map((pos) => {
    const chunk: number[] = new Array(length)
    for (let i = 0; i < length; i++) {
      chunk[i] = strip[(pos + i) % n]!
    }
    return chunk
  })
}

export function buildGridSampler(strips: readonly Uint8Array[]): Sampler<MutableCascadeGrid> {
  return Sampler.traverse(
    Array.from({ length: REEL_COUNT }, (_, r) => r),
    (reel) => makeStripChunkSampler(strips[reel]!, ROW_COUNT),
  ).map((reelChunks) => {
    const grid = new MutableCascadeGrid(REEL_COUNT, ROW_COUNT)
    for (let reel = 0; reel < REEL_COUNT; reel++) {
      const chunk = reelChunks[reel]!
      for (let row = 0; row < ROW_COUNT; row++) {
        grid.setSymbol(reel, row, chunk[row]!)
      }
    }
    return grid
  })
}
