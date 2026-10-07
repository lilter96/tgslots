import { Array1 } from '@tgslots/math/functional/array1'
import { Sampler } from '@tgslots/math/probability'
import { STRIP_STRINGS } from './constants.js'

// Partition actual cyclic reel stops by their visible scatter count.
// Every combination of stops retains its original weight, conditioned on >=3 COINs.
const groups = STRIP_STRINGS.map((strip) => {
  const byCount: number[][] = [[], [], [], []]
  for (let stop = 0; stop < strip.length; stop++) {
    let count = 0
    for (let row = 0; row < 3; row++) {
      if (strip[(stop + row) % strip.length] === 'COIN') count++
    }
    byCount[count]!.push(stop)
  }
  return byCount
})

const branches: Array<readonly [Sampler<number[]>, number]> = []
function enumerate(
  reel: number,
  scatters: number,
  stops: readonly number[][],
  weight: number,
): void {
  if (reel === groups.length) {
    if (scatters >= 3) {
      branches.push([
        Sampler.traverse(stops, (positions) => Sampler.uniform(Array1.unsafeFromArray(positions))),
        weight,
      ])
    }
    return
  }
  groups[reel]!.forEach((positions, count) => {
    if (positions.length) {
      enumerate(reel + 1, scatters + count, [...stops, positions], weight * positions.length)
    }
  })
}
enumerate(0, 0, [], 1)
if (!branches.length) throw new Error('Woodland Whisper has no bonus-triggering reel stops')

export const bonusPositionSampler = Sampler.fromWeighted(Array1.unsafeFromArray(branches)).flatMap(
  (positions) => positions,
)
