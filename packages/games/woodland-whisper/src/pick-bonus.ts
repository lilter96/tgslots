import { Array1 } from '@tgslots/math/functional/array1'
import { Sampler, SamplingPlan } from '@tgslots/math/probability'
import { PICK_BONUS_TABLE } from './constants.js'

const ballSampler = Sampler.fromWeighted(Array1.unsafeFromArray(PICK_BONUS_TABLE))

const createPickUntilRepeatSampler = (seen: readonly number[] = []): Sampler<number> =>
  ballSampler.flatMap((ball) => {
    if (seen.includes(ball)) {
      return Sampler.pure(ball)
    }
    return createPickUntilRepeatSampler([...seen, ball])
  })

export const pickBonusSampler = createPickUntilRepeatSampler()

function createPickSequenceValuesSampler(
  winValue: number,
  seen: readonly number[] = [],
): Sampler<number[]> {
  return ballSampler.flatMap((val) => {
    if (seen.includes(val)) {
      if (val === winValue) {
        return Sampler.pure([...seen, val])
      }
      return createPickSequenceValuesSampler(winValue, seen)
    }
    return createPickSequenceValuesSampler(winValue, [...seen, val])
  })
}

function shuffleSwapsSampler(length: number): Sampler<number[]> {
  const indices: number[] = []
  for (let i = length - 1; i > 0; i--) {
    indices.push(i)
  }
  return Sampler.traverse(
    indices,
    (i) => new Sampler(SamplingPlan.draw(0, i + 1), (rng) => rng(0, i + 1)),
  )
}

export function generatePickBonus(winValue: number): Sampler<{
  board: number[]
  pickSequence: number[]
}> {
  return createPickSequenceValuesSampler(winValue).flatMap((pickSequenceValues) => {
    const distinctValues = PICK_BONUS_TABLE.map(([val]) => val)
    const initialBoard: number[] = []
    for (const val of distinctValues) {
      initialBoard.push(val, val)
    }

    return shuffleSwapsSampler(initialBoard.length).flatMap((boardSwaps) => {
      const board = [...initialBoard]
      boardSwaps.forEach((j, offset) => {
        const i = initialBoard.length - 1 - offset
        const temp = board[i]!
        board[i] = board[j]!
        board[j] = temp
      })

      const valToIndices = new Map<number, number[]>()
      board.forEach((val, idx) => {
        if (!valToIndices.has(val)) valToIndices.set(val, [])
        valToIndices.get(val)!.push(idx)
      })

      const indexShuffles = Sampler.traverse(
        Array.from(valToIndices.keys()),
        () => new Sampler(SamplingPlan.draw(0, 2), (rng) => rng(0, 2)),
      )

      return indexShuffles.map((swaps) => {
        const keys = Array.from(valToIndices.keys())
        const finalValToIndices = new Map<number, number[]>()
        keys.forEach((key, i) => {
          const indices = [...valToIndices.get(key)!]
          if (swaps[i] === 1) {
            const temp = indices[0]!
            indices[0] = indices[1]!
            indices[1] = temp
          }
          finalValToIndices.set(key, indices)
        })

        const pickSequence: number[] = []
        const usedCount = new Map<number, number>()
        for (const val of pickSequenceValues) {
          const count = usedCount.get(val) ?? 0
          const indices = finalValToIndices.get(val)
          if (!indices) throw new Error(`Value ${val} not found in board`)
          pickSequence.push(indices[count]!)
          usedCount.set(val, count + 1)
        }

        return { board, pickSequence }
      })
    })
  })
}
