import { Sampler } from '@tgslots/math/probability'
import { Wager } from '@tgslots/slots-core/betting'
import {
  INT_STRIPS_BASE,
  INT_STRIPS_FREE,
  MAX_CASCADE_STEPS,
  MIN_SCATTERS,
  REEL_COUNT,
  ROW_COUNT,
  WILD_ID,
} from './constants.js'
import type { CombatCascadeStep, LeMilitareSpinResult } from './types.ts'
import { buildGridSampler } from './grid-samplers.js'
import { countScatters, freeSpinsAwarded, snapshotGrid } from './helpers.js'
import { combatCascadeLoopSampler } from './combat.js'

export { makeStripChunkSampler } from './grid-samplers.js'
export { multiplierSampler } from './combat.js'

function createSpinSampler(
  wager: Wager,
  isFreeSpin: boolean,
  carryArmedReels: ReadonlySet<number>,
  carryMultiplierSum: number,
): Sampler<LeMilitareSpinResult> {
  const strips = isFreeSpin ? INT_STRIPS_FREE : INT_STRIPS_BASE
  const gridSampler = buildGridSampler(strips)

  return gridSampler.flatMap((grid) => {
    for (const reel of carryArmedReels) {
      for (let row = 0; row < ROW_COUNT; row++) {
        grid.setSymbol(reel, row, WILD_ID)
      }
    }

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
