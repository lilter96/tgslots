import { Array1 } from '@tgslots/math/functional/array1'
import { Sampler, SamplingPlan } from '@tgslots/math/probability'
import type { Rng } from '@tgslots/math/rng/types'
import {
  collectVanishPositions,
  EMPTY_SYMBOL,
  evaluateClusters,
  MutableCascadeGrid,
} from '@tgslots/slots-core'
import { Wager } from '@tgslots/slots-core/betting'
import { engine } from './engine.js'
import {
  FREE_SPIN_AWARDS,
  INT_STRIPS_BASE,
  INT_STRIPS_FREE,
  MAX_CASCADE_STEPS,
  MIN_SCATTERS,
  MULTIPLIER_POOL_WEIGHTS,
  PLANE_ID,
  REEL_COUNT,
  ROW_COUNT,
  S300_ID,
  SCATTER_ID,
  WILD_ID,
} from './constants.js'
import type {
  ActivationEvent,
  CombatCascadeStep,
  LeMilitareSpinResult,
  ShootdownEvent,
} from './types.ts'

// ─── Helpers ──────────────────────────────────────────────────────────────

function snapshotGrid(grid: MutableCascadeGrid): number[][] {
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

function countScatters(grid: MutableCascadeGrid): number {
  let count = 0
  for (let reel = 0; reel < grid.reelCount; reel++) {
    for (let row = 0; row < grid.rowCount; row++) {
      if (grid.getSymbol(reel, row) === SCATTER_ID) count++
    }
  }
  return count
}

function freeSpinsAwarded(scatterCount: number): number {
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

// ─── Multiplier Sampler ───────────────────────────────────────────────────

export const multiplierSampler: Sampler<number> = Sampler.fromWeighted(
  Array1.unsafeFromArray(MULTIPLIER_POOL_WEIGHTS) as Array1<readonly [number, number]>,
)

// ─── Contiguous Strip Chunk Sampler ───────────────────────────────────────
// Pulls a contiguous slice of `length` symbols from a random start position
// on the strip, wrapping via modulo. This preserves JSON-strip co-placement
// rules (e.g. S300 and PLANE never adjacent) in both initial grids and refills.

export function makeStripChunkSampler(
  strip: Uint8Array,
  length: number,
): Sampler<readonly number[]> {
  if (length === 0) return Sampler.pure([])
  const n = strip.length - 2 // actual strip length (strip has 2 wrap-around padding entries)
  // Draw a start position via a typed Sampler<number>, then map to the chunk.
  // This avoids the plan-type mismatch that arises from constructing Sampler<T[]>
  // directly with a SamplingPlan<number> (strict noUncheckedIndexedAccess).
  return new Sampler<number>(SamplingPlan.draw(0, n), (rng: Rng) => rng(0, n)).map((pos) => {
    const chunk: number[] = new Array(length)
    for (let i = 0; i < length; i++) {
      chunk[i] = strip[(pos + i) % n]!
    }
    return chunk
  })
}

// ─── Initial Grid Sampler ─────────────────────────────────────────────────

function buildGridSampler(strips: readonly Uint8Array[]): Sampler<MutableCascadeGrid> {
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

// ─── Sticky Wild Helpers ──────────────────────────────────────────────────
// stickyGrid[reel][row] === true means that cell holds a shootdown-converted
// WILD that must survive cluster vanishing for the rest of the spin.

function compactStickyGrid(stickyGrid: boolean[][], grid: MutableCascadeGrid): void {
  // Mirror the same compaction logic as MutableCascadeGrid.applyGravity so
  // sticky flags track which cell the wild ends up in after gravity.
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
  // Find reels with S300 that are not yet armed
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

  // Collect all PLANE positions (will be shot down by any armed reel)
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

  // Skip the entire combat operation only when there are no armed reels at all
  // (no carry-over and no new activations) and no new activations to process.
  // If armed reels already exist they MUST be re-wilded even when no planes are
  // present, so we proceed to the re-wild pass below.
  if (newArmedReels.length === 0 && armedReels.size === 0) {
    return Sampler.pure({ activations: [], shootdowns: [], multiplierDelta: 0 })
  }

  // For each PLANE, draw a random multiplier from the weighted pool
  const shootdownSampler: Sampler<readonly ShootdownEvent[]> =
    planePositions.length === 0
      ? Sampler.pure([])
      : Sampler.traverse(planePositions as { reel: number; row: number }[], (pos) =>
          multiplierSampler.map((mult): ShootdownEvent => ({ ...pos, multiplier: mult })),
        )

  return shootdownSampler.map((shootdowns) => {
    let multiplierDelta = 0

    // Apply shootdowns: replace each PLANE with WILD and mark as sticky (FIX 1.3)
    for (const sd of shootdowns) {
      grid.setSymbol(sd.reel, sd.row, WILD_ID)
      stickyGrid[sd.reel]![sd.row] = true
      multiplierDelta += sd.multiplier
    }

    // Activate newly armed reels
    const activations: ActivationEvent[] = []
    for (const reel of newArmedReels) {
      armedReels.add(reel)
      activations.push({ reel, convertedCells: ROW_COUNT })
    }

    // FIX 1.2: only newly armed reels are wilded (once, on activation).
    // Previously all armed reels were re-wilded every cascade step, which
    // guaranteed a permanent WILD column and forced cascades to 100 steps.
    // Now armed reels persist for tracking (S300 ignored, PLANE shootdowns
    // still fire) but their cells vanish and refill normally.
    // In free spins, carry-armed reels are wilded once at spin start via
    // createSpinSampler's paint step.
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

function combatCascadeLoopSampler(
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

      // Compact sticky-grid flags to match where surviving symbols will land
      // after gravity — must run after clearAt but before applyGravity.
      compactStickyGrid(stickyGrid, grid)

      // Compute empties per reel now (post-clearAt, pre-gravity) for both
      // the refill sampler and for post-refill scatter counting.
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
        // After applyGravity, new fills occupy rows 0..(emptiesPerReel[reel]-1)
        // for each reel (gravity compacts surviving symbols to the bottom).
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

// ─── Main Spin Sampler ────────────────────────────────────────────────────

function createSpinSampler(
  wager: Wager,
  isFreeSpin: boolean,
  carryArmedReels: ReadonlySet<number>,
  carryMultiplierSum: number,
): Sampler<LeMilitareSpinResult> {
  const strips = isFreeSpin ? INT_STRIPS_FREE : INT_STRIPS_BASE
  const gridSampler = buildGridSampler(strips)

  return gridSampler.flatMap((grid) => {
    // FIX 1.2: paint carry-armed reels to WILD on the initial grid before
    // cluster evaluation. Without this, carry-over reels land with strip
    // symbols on the first step of the free spin.
    for (const reel of carryArmedReels) {
      for (let row = 0; row < ROW_COUNT; row++) {
        grid.setSymbol(reel, row, WILD_ID)
      }
    }

    // Count scatters on the initial grid before any combat operation alters it.
    const initialScatterCount = countScatters(grid)
    const initialSnapshot = snapshotGrid(grid)

    const armedReels = new Set<number>(carryArmedReels)
    const stickyGrid: boolean[][] = Array.from({ length: REEL_COUNT }, () =>
      new Array(ROW_COUNT).fill(false),
    )
    const steps: CombatCascadeStep[] = []

    return combatCascadeLoopSampler(
      grid,
      strips,
      armedReels,
      stickyGrid,
      carryMultiplierSum,
      initialScatterCount,
      steps,
      MAX_CASCADE_STEPS,
    ).map(({ finalArmedReels, finalMultSum, finalScatterCount }) => {
      const baseClusterWin = steps.reduce((sum, s) => sum + s.stepWin, 0)
      const multiplierSum = finalMultSum - carryMultiplierSum
      const effectiveMultiplier = Math.max(1, finalMultSum)
      const finalWin = baseClusterWin * effectiveMultiplier * wager.multiplier

      // FIX 1.4: use the accumulated scatter count (includes cascade refill scatters)
      const triggered = finalScatterCount >= MIN_SCATTERS
      const spinsAwarded = triggered ? freeSpinsAwarded(finalScatterCount) : 0

      return {
        initialGrid: initialSnapshot,
        steps,
        scatterCount: finalScatterCount,
        baseClusterWin,
        multiplierSum,
        finalWin,
        triggeredFreeSpins: triggered,
        freeSpinsAwarded: spinsAwarded,
        endArmedReels: Array.from(finalArmedReels),
        endMultiplierSum: finalMultSum,
      }
    })
  })
}

export const LE_MILITARE_SAMPLER = (
  wager: Wager,
  ctx: {
    isFreeSpin: boolean
    carryArmedReels: ReadonlySet<number>
    carryMultiplierSum: number
  },
): Sampler<LeMilitareSpinResult> =>
  createSpinSampler(wager, ctx.isFreeSpin, ctx.carryArmedReels, ctx.carryMultiplierSum)

// ─── Buy Bonus Sampler ────────────────────────────────────────────────────

const BUY_BONUS_MAX_ATTEMPTS = 2000

function createBuyBonusSampler(wager: Wager, attempt = 0): Sampler<LeMilitareSpinResult> {
  if (attempt >= BUY_BONUS_MAX_ATTEMPTS) {
    throw new Error('Buy bonus failed to trigger scatter within max attempts')
  }
  return LE_MILITARE_SAMPLER(wager, {
    isFreeSpin: false,
    carryArmedReels: new Set(),
    carryMultiplierSum: 0,
  }).flatMap((result) => {
    if (result.scatterCount >= MIN_SCATTERS) return Sampler.pure(result)
    return createBuyBonusSampler(wager, attempt + 1)
  })
}

export const BUY_BONUS_SAMPLER = (wager: Wager): Sampler<LeMilitareSpinResult> =>
  createBuyBonusSampler(wager)
