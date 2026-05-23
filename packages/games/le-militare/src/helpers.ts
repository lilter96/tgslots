import type { MutableCascadeGrid } from '@tgslots/slots-core'
import { FREE_SPIN_AWARDS, MIN_SCATTERS, SCATTER_ID } from './constants.js'

export function snapshotGrid(grid: MutableCascadeGrid): number[][] {
  const out: number[][] = []
  for (let row = 0; row < grid.rowCount; row++) {
    const rowArr: number[] = []
    for (let reel = 0; reel < grid.reelCount; reel++) {
      rowArr.push(grid.getSymbol(reel, row))
    }
    out.push(rowArr)
  }
  return out
}

export function countScatters(grid: MutableCascadeGrid): number {
  let count = 0
  for (let reel = 0; reel < grid.reelCount; reel++) {
    for (let row = 0; row < grid.rowCount; row++) {
      if (grid.getSymbol(reel, row) === SCATTER_ID) count++
    }
  }
  return count
}

export function freeSpinsAwarded(scatterCount: number): number {
  let spins = 0
  for (let n = scatterCount; n >= MIN_SCATTERS; n--) {
    const award = FREE_SPIN_AWARDS[n]
    if (award !== undefined) {
      spins = award
      break
    }
  }
  return spins
}
