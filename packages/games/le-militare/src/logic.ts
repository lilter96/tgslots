import { Sampler } from '@tgslots/math/probability'
import { Array1 } from '@tgslots/math/functional/array1'
import { Wager } from '@tgslots/slots-core/betting'
import type { MutableCascadeGrid } from '@tgslots/slots-core'
import {
  CHANCE_SPIN_FORCE_WEIGHTS,
  INT_STRIPS_BASE,
  INT_STRIPS_FREE,
  MAX_CASCADE_STEPS,
  MIN_SCATTERS,
  REEL_COUNT,
  ROW_COUNT,
  SCATTER_ID,
  WILD_ID,
} from './constants.js'
import type { ModeId } from './constants.js'
import type { CombatCascadeStep, LeMilitareSpinResult } from './types.ts'
import { buildGridSampler } from './grid-samplers.js'
import { countScatters, freeSpinsAwarded, snapshotGrid } from './helpers.js'
import { combatCascadeLoopSampler, MODE_SAMPLERS } from './combat.js'
import type { AirRaidResult } from './combat.js'

export { makeStripChunkSampler } from './grid-samplers.js'

const NO_AIR_RAID: AirRaidResult = { squadronSize: 0, placements: [], multiplierSum: 0 }

interface SpinOptions {
  /** 'normal' = random raid (base default), 'forced' = always raid, 'off' = none. */
  airRaid?: 'normal' | 'forced' | 'off'
  /** Force this many SCATTERs onto the grid (buy entries / chance spin). */
  injectScatters?: number
}

// Deterministic scatter placement that guarantees a trigger count for buys.
function injectScatters(grid: MutableCascadeGrid, count: number): void {
  if (count > REEL_COUNT * ROW_COUNT) {
    throw new Error(`injectScatters: count=${count} exceeds grid area ${REEL_COUNT * ROW_COUNT}`)
  }
  for (let i = 0; i < count; i++) {
    const reel = i % REEL_COUNT
    const row = Math.floor(i / REEL_COUNT)
    if (row < ROW_COUNT) grid.setSymbol(reel, row, SCATTER_ID)
  }
}

function createSpinSampler(
  mode: ModeId,
  wager: Wager,
  isFreeSpin: boolean,
  carryArmedReels: ReadonlySet<number>,
  carryMultiplierSum: number,
  opts: SpinOptions = {},
): Sampler<LeMilitareSpinResult> {
  const samplers = MODE_SAMPLERS[mode]
  const strips = isFreeSpin ? INT_STRIPS_FREE : INT_STRIPS_BASE
  const gridSampler = buildGridSampler(strips)
  // The Air Raid is a base-game Combat Operation; free spins keep the
  // persistent armed-reel / accumulating-multiplier version.
  const raidMode = opts.airRaid ?? 'normal'
  const raidSampler =
    isFreeSpin || raidMode === 'off'
      ? Sampler.pure(NO_AIR_RAID)
      : raidMode === 'forced'
        ? samplers.forcedAirRaidSampler
        : samplers.airRaidSampler

  return gridSampler.flatMap((grid) =>
    raidSampler.flatMap((raid) => {
      for (const reel of carryArmedReels) {
        for (let row = 0; row < ROW_COUNT; row++) {
          grid.setSymbol(reel, row, WILD_ID)
        }
      }

      // Snapshot the grid before stamping the Air Raid wilds so the client can
      // fly planes over the original symbols and reveal each wild on crash.
      const preRaidGrid = raid.squadronSize > 0 ? snapshotGrid(grid) : null
      for (const p of raid.placements) {
        grid.setSymbol(p.reel, p.row, WILD_ID)
      }

      if (opts.injectScatters) injectScatters(grid, opts.injectScatters)

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
        carryMultiplierSum + raid.multiplierSum,
        initialScatterCount,
        steps,
        MAX_CASCADE_STEPS,
        samplers.multiplierSampler,
      ).map(({ finalArmedReels, finalMultSum, finalScatterCount }) => {
        const baseClusterWin = steps.reduce((sum, s) => sum + s.stepWin, 0)
        const multiplierSum = finalMultSum - carryMultiplierSum
        const effectiveMultiplier = Math.max(1, finalMultSum)
        const finalWin = baseClusterWin * effectiveMultiplier * wager.multiplier

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
          airRaid: preRaidGrid
            ? { squadronSize: raid.squadronSize, placements: raid.placements, preRaidGrid }
            : null,
        }
      })
    }),
  )
}

export const LE_MILITARE_SAMPLER = (
  mode: ModeId,
  wager: Wager,
  ctx: {
    isFreeSpin: boolean
    carryArmedReels: ReadonlySet<number>
    carryMultiplierSum: number
  },
): Sampler<LeMilitareSpinResult> =>
  createSpinSampler(mode, wager, ctx.isFreeSpin, ctx.carryArmedReels, ctx.carryMultiplierSum)

// Bonus buy: a triggering spin with a guaranteed scatter count (no air raid on
// the entry spin). `minScatters` drives the awarded free-spin count.
export const BUY_BONUS_SAMPLER = (
  mode: ModeId,
  wager: Wager,
  minScatters: number = MIN_SCATTERS,
): Sampler<LeMilitareSpinResult> =>
  createSpinSampler(mode, wager, false, new Set(), 0, {
    airRaid: 'off',
    injectScatters: minScatters,
  })

// Guaranteed Air Raid: one base spin whose Air Raid always fires.
export const AIR_RAID_SPIN_SAMPLER = (mode: ModeId, wager: Wager): Sampler<LeMilitareSpinResult> =>
  createSpinSampler(mode, wager, false, new Set(), 0, { airRaid: 'forced' })

// ×5 Chance spin: a normal base spin, but with an extra forced-trigger roll so
// the Free Spins trigger probability is ~5× the default. The force weights are
// calibrated against the base trigger rate.
const chanceForceSampler = Sampler.fromWeighted(
  Array1.unsafeFromArray([
    [true, CHANCE_SPIN_FORCE_WEIGHTS[0]],
    [false, CHANCE_SPIN_FORCE_WEIGHTS[1]],
  ]) as Array1<readonly [boolean, number]>,
)

export const CHANCE_SPIN_SAMPLER = (mode: ModeId, wager: Wager): Sampler<LeMilitareSpinResult> =>
  chanceForceSampler.flatMap((force) =>
    createSpinSampler(mode, wager, false, new Set(), 0, {
      airRaid: 'normal',
      injectScatters: force ? MIN_SCATTERS : 0,
    }),
  )
