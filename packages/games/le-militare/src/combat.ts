import { Array1 } from '@tgslots/math/functional/array1'
import { Sampler, Distributions } from '@tgslots/math/probability'
import { collectVanishPositions, EMPTY_SYMBOL, evaluateClusters } from '@tgslots/slots-core'
import type { MutableCascadeGrid } from '@tgslots/slots-core'
import { engine } from './engine.js'
import {
  AIR_RAID,
  MULTIPLIER_POOL_WEIGHTS,
  PLANE_ID,
  REEL_COUNT,
  ROW_COUNT,
  S300_ID,
  SCATTER_ID,
  WILD_ID,
} from './constants.js'
import type { ActivationEvent, CombatCascadeStep, ShootdownEvent } from './types.ts'
import { makeStripChunkSampler } from './grid-samplers.js'
import { snapshotGrid } from './helpers.js'

// ─── Multiplier Sampler ───────────────────────────────────────────────────

export const multiplierSampler: Sampler<number> = Sampler.fromWeighted(
  Array1.unsafeFromArray(MULTIPLIER_POOL_WEIGHTS) as Array1<readonly [number, number]>,
)

// ─── Air Raid Sampler (base-game Combat Operation) ──────────────────────────
// A squadron flies over; the S300 intercepts some planes; each interception
// drops a multiplier-WILD on a random cell. Missed planes fly off. The summed
// multiplier seeds the spin's multiplier (per-spin in base; resets each spin).

export interface AirRaidPlacement {
  reel: number
  row: number
  multiplier: number
}

export interface AirRaidResult {
  placements: readonly AirRaidPlacement[]
  multiplierSum: number
}

const NO_AIR_RAID: AirRaidResult = { placements: [], multiplierSum: 0 }

const airRaidFireSampler = Sampler.fromWeighted(
  Array1.unsafeFromArray([
    [true, AIR_RAID.triggerWeights[0]],
    [false, AIR_RAID.triggerWeights[1]],
  ]) as Array1<readonly [boolean, number]>,
)

const squadronSizeSampler = Sampler.fromWeighted(
  Array1.unsafeFromArray(
    AIR_RAID.squadronSizes.map((size, i) => [size, AIR_RAID.squadronWeights[i]!] as const),
  ) as Array1<readonly [number, number]>,
)

const planeHitSampler = Sampler.fromWeighted(
  Array1.unsafeFromArray([
    [true, AIR_RAID.hitWeights[0]],
    [false, AIR_RAID.hitWeights[1]],
  ]) as Array1<readonly [boolean, number]>,
)

const raidReelSampler = Distributions.uniformInt(0, REEL_COUNT - 1)
const raidRowSampler = Distributions.uniformInt(0, ROW_COUNT - 1)

const planeSampler: Sampler<AirRaidPlacement | null> = planeHitSampler.flatMap((hit) =>
  hit
    ? raidReelSampler.flatMap((reel) =>
        raidRowSampler.flatMap((row) =>
          multiplierSampler.map((multiplier): AirRaidPlacement => ({ reel, row, multiplier })),
        ),
      )
    : Sampler.pure<AirRaidPlacement | null>(null),
)

export const airRaidSampler: Sampler<AirRaidResult> = airRaidFireSampler.flatMap((fire) => {
  if (!fire) return Sampler.pure(NO_AIR_RAID)
  return squadronSizeSampler.flatMap((size) =>
    Sampler.traverse(
      Array.from({ length: size }, (_, i) => i),
      () => planeSampler,
    ).map((planes) => {
      const placements = planes.filter((p): p is AirRaidPlacement => p !== null)
      const multiplierSum = placements.reduce((sum, p) => sum + p.multiplier, 0)
      return { placements, multiplierSum }
    }),
  )
})

// ─── Sticky Wild Helpers ──────────────────────────────────────────────────
// stickyGrid[reel][row] === true means that cell holds a shootdown-converted
// WILD that must survive cluster vanishing for the rest of the spin.

function compactStickyGrid(stickyGrid: boolean[][], grid: MutableCascadeGrid): void {
  for (let reel = 0; reel < REEL_COUNT; reel++) {
    const sticky = stickyGrid[reel]!
    let writeRow = ROW_COUNT - 1
    for (let row = ROW_COUNT - 1; row >= 0; row--) {
      if (grid.getSymbol(reel, row) !== EMPTY_SYMBOL) {
        sticky[writeRow] = sticky[row]!
        if (writeRow !== row) sticky[row] = false
        writeRow--
      }
    }
    for (let row = writeRow; row >= 0; row--) {
      sticky[row] = false
    }
  }
}

function encodeStickyPositions(stickyGrid: boolean[][]): readonly number[] {
  const positions: number[] = []
  for (let reel = 0; reel < REEL_COUNT; reel++) {
    for (let row = 0; row < ROW_COUNT; row++) {
      if (stickyGrid[reel]![row]) {
        positions.push(reel * ROW_COUNT + row)
      }
    }
  }
  return positions
}

// ─── Combat Operation ─────────────────────────────────────────────────────

function runCombatOperationSampler(
  grid: MutableCascadeGrid,
  armedReels: Set<number>,
  stickyGrid: boolean[][],
): Sampler<{
  activations: readonly ActivationEvent[]
  shootdowns: readonly ShootdownEvent[]
  multiplierDelta: number
}> {
  const newArmedReels: number[] = []
  for (let reel = 0; reel < REEL_COUNT; reel++) {
    if (armedReels.has(reel)) continue
    for (let row = 0; row < ROW_COUNT; row++) {
      if (grid.getSymbol(reel, row) === S300_ID) {
        newArmedReels.push(reel)
        break
      }
    }
  }

  const planePositions: readonly { reel: number; row: number }[] = (() => {
    const positions: { reel: number; row: number }[] = []
    for (let reel = 0; reel < REEL_COUNT; reel++) {
      for (let row = 0; row < ROW_COUNT; row++) {
        if (grid.getSymbol(reel, row) === PLANE_ID) {
          positions.push({ reel, row })
        }
      }
    }
    return positions
  })()

  if (newArmedReels.length === 0 && armedReels.size === 0) {
    return Sampler.pure({ activations: [], shootdowns: [], multiplierDelta: 0 })
  }

  const shootdownSampler: Sampler<readonly ShootdownEvent[]> =
    planePositions.length === 0
      ? Sampler.pure([])
      : Sampler.traverse(planePositions as { reel: number; row: number }[], (pos) =>
          multiplierSampler.map((mult): ShootdownEvent => ({ ...pos, multiplier: mult })),
        )

  return shootdownSampler.map((shootdowns) => {
    let multiplierDelta = 0

    for (const sd of shootdowns) {
      grid.setSymbol(sd.reel, sd.row, WILD_ID)
      stickyGrid[sd.reel]![sd.row] = true
      multiplierDelta += sd.multiplier
    }

    const activations: ActivationEvent[] = []
    for (const reel of newArmedReels) {
      armedReels.add(reel)
      activations.push({ reel, convertedCells: ROW_COUNT })
    }

    // FIX 1.2: only newly armed reels are wilded (once, on activation).
    for (const reel of newArmedReels) {
      for (let row = 0; row < ROW_COUNT; row++) {
        grid.setSymbol(reel, row, WILD_ID)
        stickyGrid[reel]![row] = false
      }
    }

    return { activations, shootdowns, multiplierDelta }
  })
}

// ─── Gravity Refill Sampler ───────────────────────────────────────────────

function refillGravitySampler(
  grid: MutableCascadeGrid,
  strips: readonly Uint8Array[],
  emptiesPerReel: readonly number[],
): Sampler<void> {
  const reelsWithEmpties: number[] = []
  for (let reel = 0; reel < REEL_COUNT; reel++) {
    if (emptiesPerReel[reel]! > 0) reelsWithEmpties.push(reel)
  }

  if (reelsWithEmpties.length === 0) {
    return Sampler.pure(undefined)
  }

  return Sampler.traverse(reelsWithEmpties, (reel) =>
    makeStripChunkSampler(strips[reel]!, emptiesPerReel[reel]!),
  ).map((chunks) => {
    const drawsByReel = new Array<readonly number[]>(REEL_COUNT)
    reelsWithEmpties.forEach((reel, i) => {
      drawsByReel[reel] = chunks[i]!
    })
    const posPerReel = new Array<number>(REEL_COUNT).fill(0)
    grid.applyGravity((reel) => {
      const chunk = drawsByReel[reel]!
      const pos = posPerReel[reel] ?? 0
      posPerReel[reel] = pos + 1
      return chunk[pos]!
    })
  })
}

// ─── Combat Cascade Loop ──────────────────────────────────────────────────

export function combatCascadeLoopSampler(
  grid: MutableCascadeGrid,
  strips: readonly Uint8Array[],
  armedReels: Set<number>,
  stickyGrid: boolean[][],
  multSum: number,
  accScatterCount: number,
  accSteps: CombatCascadeStep[],
  remaining: number,
): Sampler<{
  steps: CombatCascadeStep[]
  finalArmedReels: Set<number>
  finalMultSum: number
  finalScatterCount: number
}> {
  if (remaining <= 0) {
    return Sampler.pure({
      steps: accSteps,
      finalArmedReels: armedReels,
      finalMultSum: multSum,
      finalScatterCount: accScatterCount,
    })
  }

  const preCombatSnapshot = snapshotGrid(grid)

  return runCombatOperationSampler(grid, armedReels, stickyGrid).flatMap(
    ({ activations, shootdowns, multiplierDelta }) => {
      const postCombatSnapshot = snapshotGrid(grid)
      const newMultSum = multSum + multiplierDelta

      const evaluation = evaluateClusters(grid, engine)

      if (evaluation.hits.length === 0) {
        accSteps.push({
          preCombatGrid: preCombatSnapshot,
          postCombatGrid: postCombatSnapshot,
          hits: [],
          vanishedPositions: [],
          stickyWildPositions: encodeStickyPositions(stickyGrid),
          stepWin: 0,
          activations,
          shootdowns,
        })
        return Sampler.pure({
          steps: accSteps,
          finalArmedReels: armedReels,
          finalMultSum: newMultSum,
          finalScatterCount: accScatterCount,
        })
      }

      const vanished = collectVanishPositions(evaluation.hits, grid, engine)

      // FIX 1.3: exclude sticky-wild positions from the vanish set so they
      // survive the cluster and remain on the grid.
      const filteredVanished = (vanished as number[]).filter((pos) => {
        const reel = Math.floor(pos / ROW_COUNT)
        const row = pos % ROW_COUNT
        return !stickyGrid[reel]![row]
      })

      grid.clearAt(filteredVanished)

      compactStickyGrid(stickyGrid, grid)

      const emptiesPerReel: number[] = new Array(REEL_COUNT).fill(0)
      for (let reel = 0; reel < REEL_COUNT; reel++) {
        for (let row = 0; row < ROW_COUNT; row++) {
          if (grid.getSymbol(reel, row) === EMPTY_SYMBOL)
            emptiesPerReel[reel] = (emptiesPerReel[reel] ?? 0) + 1
        }
      }

      accSteps.push({
        preCombatGrid: preCombatSnapshot,
        postCombatGrid: postCombatSnapshot,
        hits: evaluation.hits,
        vanishedPositions: filteredVanished,
        stickyWildPositions: encodeStickyPositions(stickyGrid),
        stepWin: evaluation.totalWin,
        activations,
        shootdowns,
      })

      return refillGravitySampler(grid, strips, emptiesPerReel).flatMap(() => {
        // FIX 1.4: count scatters that landed in the newly refilled cells.
        let newScatters = 0
        for (let reel = 0; reel < REEL_COUNT; reel++) {
          for (let row = 0; row < emptiesPerReel[reel]!; row++) {
            if (grid.getSymbol(reel, row) === SCATTER_ID) newScatters++
          }
        }

        return combatCascadeLoopSampler(
          grid,
          strips,
          armedReels,
          stickyGrid,
          newMultSum,
          accScatterCount + newScatters,
          accSteps,
          remaining - 1,
        )
      })
    },
  )
}
