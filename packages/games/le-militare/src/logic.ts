import { Array1 } from '@tgslots/math/functional/array1'
import { Sampler, SamplingPlan } from '@tgslots/math/probability'
import type { Rng } from '@tgslots/math/rng/types'
import {
  MutableCascadeGrid,
  evaluateClusters,
  collectVanishPositions,
  EMPTY_SYMBOL,
} from '@tgslots/slots-core'
import type { ClusterHit } from '@tgslots/slots-core'
import { Wager } from '@tgslots/slots-core/betting'
import { engine } from './engine.js'
import {
  WILD_ID,
  PLANE_ID,
  S300_ID,
  SCATTER_ID,
  REEL_COUNT,
  ROW_COUNT,
  MULTIPLIER_POOL_WEIGHTS,
  MIN_SCATTERS,
  FREE_SPIN_AWARDS,
  MAX_CASCADE_STEPS,
  INT_STRIPS_BASE,
  INT_STRIPS_FREE,
} from './constants.js'

// ─── Result Types ─────────────────────────────────────────────────────────

export interface ShootdownEvent {
  readonly reel: number
  readonly row: number
  readonly multiplier: number
}

export interface ActivationEvent {
  readonly reel: number
  readonly convertedCells: number
}

export interface CombatCascadeStep {
  readonly preCombatGrid: number[][]
  readonly postCombatGrid: number[][]
  readonly hits: readonly ClusterHit[]
  readonly vanishedPositions: readonly number[]
  readonly stepWin: number
  readonly activations: readonly ActivationEvent[]
  readonly shootdowns: readonly ShootdownEvent[]
}

export interface LeMilitareSpinResult {
  readonly initialGrid: number[][]
  readonly steps: CombatCascadeStep[]
  readonly scatterCount: number
  readonly baseClusterWin: number
  readonly multiplierSum: number
  readonly finalWin: number
  readonly triggeredFreeSpins: boolean
  readonly freeSpinsAwarded: number
  readonly endArmedReels: readonly number[]
  readonly endMultiplierSum: number
}

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

// ─── Strip Samplers ───────────────────────────────────────────────────────

function makeStripSamplers(strips: readonly Uint8Array[]): readonly Sampler<number>[] {
  return strips.map((strip) => {
    const n = strip.length - 2 // strip is padded with 2 wrap-around entries
    return new Sampler<number>(SamplingPlan.draw(0, n), (rng: Rng) => {
      const pos = rng(0, n)
      return strip[pos]!
    })
  })
}

const BASE_STRIP_SAMPLERS = makeStripSamplers(INT_STRIPS_BASE)
const FREE_STRIP_SAMPLERS = makeStripSamplers(INT_STRIPS_FREE)

// ─── Initial Grid Sampler ─────────────────────────────────────────────────

function buildGridSampler(stripSamplers: readonly Sampler<number>[]): Sampler<MutableCascadeGrid> {
  return Sampler.traverse(
    Array.from({ length: REEL_COUNT }, (_, r) => r),
    (reel) =>
      Sampler.traverse(
        Array.from({ length: ROW_COUNT }, () => null),
        () => stripSamplers[reel]!,
      ),
  ).map((reelSymbols) => {
    const grid = new MutableCascadeGrid(REEL_COUNT, ROW_COUNT)
    for (let reel = 0; reel < REEL_COUNT; reel++) {
      for (let row = 0; row < ROW_COUNT; row++) {
        grid.setSymbol(reel, row, reelSymbols[reel]![row]!)
      }
    }
    return grid
  })
}

// ─── Combat Operation ─────────────────────────────────────────────────────

function runCombatOperationSampler(
  grid: MutableCascadeGrid,
  armedReels: Set<number>,
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

  if (newArmedReels.length === 0) {
    return Sampler.pure({ activations: [], shootdowns: [], multiplierDelta: 0 })
  }

  // Collect all PLANE positions (will be shot down)
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

  // For each PLANE, draw a random multiplier from the weighted pool
  const shootdownSampler: Sampler<readonly ShootdownEvent[]> =
    planePositions.length === 0
      ? Sampler.pure([])
      : Sampler.traverse(planePositions as { reel: number; row: number }[], (pos) =>
          multiplierSampler.map((mult): ShootdownEvent => ({ ...pos, multiplier: mult })),
        )

  return shootdownSampler.map((shootdowns) => {
    let multiplierDelta = 0

    // Apply shootdowns: replace each PLANE with WILD
    for (const sd of shootdowns) {
      grid.setSymbol(sd.reel, sd.row, WILD_ID)
      multiplierDelta += sd.multiplier
    }

    // Convert each newly-armed reel to Giant Wild (all cells → WILD)
    const activations: ActivationEvent[] = []
    for (const reel of newArmedReels) {
      for (let row = 0; row < ROW_COUNT; row++) {
        grid.setSymbol(reel, row, WILD_ID)
      }
      armedReels.add(reel)
      activations.push({ reel, convertedCells: ROW_COUNT })
    }

    return { activations, shootdowns, multiplierDelta }
  })
}

// ─── Gravity Refill Sampler ───────────────────────────────────────────────

function refillGravitySampler(
  grid: MutableCascadeGrid,
  stripSamplers: readonly Sampler<number>[],
): Sampler<void> {
  const drawSamplers: Sampler<number>[] = []
  for (let reel = 0; reel < REEL_COUNT; reel++) {
    let empties = 0
    for (let row = 0; row < ROW_COUNT; row++) {
      if (grid.getSymbol(reel, row) === EMPTY_SYMBOL) empties++
    }
    for (let i = 0; i < empties; i++) drawSamplers.push(stripSamplers[reel]!)
  }

  if (drawSamplers.length === 0) {
    return Sampler.pure(undefined)
  }

  return Sampler.sequence(drawSamplers).map((draws) => {
    let idx = 0
    grid.applyGravity(() => draws[idx++]!)
  })
}

// ─── Combat Cascade Loop ──────────────────────────────────────────────────

function combatCascadeLoopSampler(
  grid: MutableCascadeGrid,
  stripSamplers: readonly Sampler<number>[],
  armedReels: Set<number>,
  multSum: number,
  accSteps: CombatCascadeStep[],
  remaining: number,
): Sampler<{ steps: CombatCascadeStep[]; finalArmedReels: Set<number>; finalMultSum: number }> {
  if (remaining <= 0) {
    return Sampler.pure({ steps: accSteps, finalArmedReels: armedReels, finalMultSum: multSum })
  }

  const preCombatSnapshot = snapshotGrid(grid)

  return runCombatOperationSampler(grid, armedReels).flatMap(
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
          stepWin: 0,
          activations,
          shootdowns,
        })
        return Sampler.pure({
          steps: accSteps,
          finalArmedReels: armedReels,
          finalMultSum: newMultSum,
        })
      }

      const vanished = collectVanishPositions(evaluation.hits, grid, engine)
      grid.clearAt(vanished)

      accSteps.push({
        preCombatGrid: preCombatSnapshot,
        postCombatGrid: postCombatSnapshot,
        hits: evaluation.hits,
        vanishedPositions: vanished,
        stepWin: evaluation.totalWin,
        activations,
        shootdowns,
      })

      return refillGravitySampler(grid, stripSamplers).flatMap(() =>
        combatCascadeLoopSampler(
          grid,
          stripSamplers,
          armedReels,
          newMultSum,
          accSteps,
          remaining - 1,
        ),
      )
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
  const stripSamplers = isFreeSpin ? FREE_STRIP_SAMPLERS : BASE_STRIP_SAMPLERS
  const gridSampler = buildGridSampler(stripSamplers)

  return gridSampler.flatMap((grid) => {
    // Count scatters on the INITIAL grid before Combat Operation alters anything
    const scatterCount = countScatters(grid)
    const initialSnapshot = snapshotGrid(grid)

    // Carry armed reels and multiplier sum from previous free spins in this session
    const armedReels = new Set<number>(carryArmedReels)
    const steps: CombatCascadeStep[] = []

    return combatCascadeLoopSampler(
      grid,
      stripSamplers,
      armedReels,
      carryMultiplierSum,
      steps,
      MAX_CASCADE_STEPS,
    ).map(({ finalArmedReels, finalMultSum }) => {
      const baseClusterWin = steps.reduce((sum, s) => sum + s.stepWin, 0)
      const multiplierSum = finalMultSum - carryMultiplierSum
      const effectiveMultiplier = Math.max(1, finalMultSum)
      const finalWin = baseClusterWin * effectiveMultiplier * wager.multiplier

      const triggered = scatterCount >= MIN_SCATTERS
      const spinsAwarded = triggered ? freeSpinsAwarded(scatterCount) : 0

      return {
        initialGrid: initialSnapshot,
        steps,
        scatterCount,
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

function createBuyBonusSampler(wager: Wager): Sampler<LeMilitareSpinResult> {
  return LE_MILITARE_SAMPLER(wager, {
    isFreeSpin: false,
    carryArmedReels: new Set(),
    carryMultiplierSum: 0,
  }).flatMap((result) => {
    if (result.scatterCount >= MIN_SCATTERS) return Sampler.pure(result)
    return createBuyBonusSampler(wager)
  })
}

export const BUY_BONUS_SAMPLER = (wager: Wager): Sampler<LeMilitareSpinResult> =>
  createBuyBonusSampler(wager)
