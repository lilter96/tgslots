import { Array1 } from '@tgslots/math/functional/array1'
import { Sampler, SamplingPlan, Distributions } from '@tgslots/math/probability'
import type { Rng } from '@tgslots/math/rng/types'
import { collectVanishPositions, EMPTY_SYMBOL, evaluateClusters } from '@tgslots/slots-core'
import type { MutableCascadeGrid } from '@tgslots/slots-core'
import { engine } from './engine.js'
import {
  MODE_CONFIGS,
  PLANE_ID,
  REEL_COUNT,
  ROW_COUNT,
  S300_ID,
  SCATTER_ID,
  WILD_ID,
} from './constants.js'
import type { ModeConfig, ModeId } from './constants.js'
import type {
  ActivationEvent,
  AirRaidPlacement,
  CombatCascadeStep,
  ShootdownEvent,
} from './types.ts'
import { makeStripChunkSampler } from './grid-samplers.js'
import { snapshotGrid } from './helpers.js'

// ─── Mode-aware samplers ────────────────────────────────────────────────────
// Each volatility mode has its own multiplier pool + Air Raid intensity. The
// Air Raid is the base-game Combat Operation: a squadron flies over, the S300
// intercepts some planes, each interception drops a multiplier-WILD on a random
// cell, misses fly off. The summed multiplier seeds the spin's multiplier.

export interface AirRaidResult {
  squadronSize: number
  placements: readonly AirRaidPlacement[]
  multiplierSum: number
}

export interface ModeSamplers {
  multiplierSampler: Sampler<number>
  airRaidSampler: Sampler<AirRaidResult>
  forcedAirRaidSampler: Sampler<AirRaidResult>
}

const NO_AIR_RAID: AirRaidResult = { squadronSize: 0, placements: [], multiplierSum: 0 }
const raidReelSampler = Distributions.uniformInt(0, REEL_COUNT - 1)
const raidRowSampler = Distributions.uniformInt(0, ROW_COUNT - 1)

function buildModeSamplers(cfg: ModeConfig): ModeSamplers {
  const multiplierSampler = Sampler.fromWeighted(
    Array1.unsafeFromArray(cfg.multiplierWeights) as Array1<readonly [number, number]>,
  )
  const fireSampler = Sampler.fromWeighted(
    Array1.unsafeFromArray([
      [true, cfg.airRaid.triggerWeights[0]],
      [false, cfg.airRaid.triggerWeights[1]],
    ]) as Array1<readonly [boolean, number]>,
  )
  const squadronSampler = Sampler.fromWeighted(
    Array1.unsafeFromArray(
      cfg.airRaid.squadronSizes.map((size, i) => [size, cfg.airRaid.squadronWeights[i]!] as const),
    ) as Array1<readonly [number, number]>,
  )
  const hitSampler = Sampler.fromWeighted(
    Array1.unsafeFromArray([
      [true, cfg.airRaid.hitWeights[0]],
      [false, cfg.airRaid.hitWeights[1]],
    ]) as Array1<readonly [boolean, number]>,
  )
  const planeSampler: Sampler<AirRaidPlacement | null> = hitSampler.flatMap((hit) =>
    hit
      ? raidReelSampler.flatMap((reel) =>
          raidRowSampler.flatMap((row) =>
            multiplierSampler.map((multiplier): AirRaidPlacement => ({ reel, row, multiplier })),
          ),
        )
      : Sampler.pure<AirRaidPlacement | null>(null),
  )
  const raidBody: Sampler<AirRaidResult> = squadronSampler.flatMap((size) =>
    Sampler.traverse(
      Array.from({ length: size }, (_, i) => i),
      () => planeSampler,
    ).map((planes) => {
      const placements = planes.filter((p): p is AirRaidPlacement => p !== null)
      const multiplierSum = placements.reduce((sum, p) => sum + p.multiplier, 0)
      return { squadronSize: size, placements, multiplierSum }
    }),
  )
  const airRaidSampler = fireSampler.flatMap((fire) =>
    fire ? raidBody : Sampler.pure(NO_AIR_RAID),
  )
  return { multiplierSampler, airRaidSampler, forcedAirRaidSampler: raidBody }
}

export const MODE_SAMPLERS: Record<ModeId, ModeSamplers> = {
  recon: buildModeSamplers(MODE_CONFIGS.recon),
  assault: buildModeSamplers(MODE_CONFIGS.assault),
  siege: buildModeSamplers(MODE_CONFIGS.siege),
}

// ─── Sticky Wild Helpers ──────────────────────────────────────────────────
// Sticky shootdown WILDs survive this spin. In free spins, every cell of an
// armed column survives all cascades and the column persists to bonus completion.

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
  multiplierSampler: Sampler<number>,
  persistentArmedReels: boolean,
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
      stickyGrid[sd.reel]![sd.row] = !persistentArmedReels
      multiplierDelta += sd.multiplier
    }

    const activations: ActivationEvent[] = []
    for (const reel of newArmedReels) {
      armedReels.add(reel)
      activations.push({ reel, convertedCells: ROW_COUNT })
    }

    // Free-spin armed columns stay WILD through gravity and every later spin.
    for (const reel of newArmedReels) {
      for (let row = 0; row < ROW_COUNT; row++) {
        grid.setSymbol(reel, row, WILD_ID)
        stickyGrid[reel]![row] = persistentArmedReels
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
// Iterative cascade loop inside a single Sampler — no recursive flatMap chains
// that would grow the call stack proportionally to the number of cascade steps.

interface CascadeLoopResult {
  steps: CombatCascadeStep[]
  finalArmedReels: Set<number>
  finalMultSum: number
  finalScatterCount: number
}

export function combatCascadeLoopSampler(
  grid: MutableCascadeGrid,
  strips: readonly Uint8Array[],
  armedReels: Set<number>,
  stickyGrid: boolean[][],
  multSum: number,
  accScatterCount: number,
  accSteps: CombatCascadeStep[],
  remaining: number,
  multiplierSampler: Sampler<number>,
  persistentArmedReels = false,
): Sampler<CascadeLoopResult> {
  return new Sampler(SamplingPlan.pure({} as CascadeLoopResult), (rng: Rng) => {
    let currentMultSum = multSum
    let currentScatterCount = accScatterCount

    // One giant occupies five connected cells but contributes one payable symbol.
    // Reuse the mask through all cascades; newly activated columns update it once.
    const positionWeights = persistentArmedReels
      ? new Uint8Array(REEL_COUNT * ROW_COUNT).fill(1)
      : undefined
    if (positionWeights) {
      for (const reel of armedReels) {
        positionWeights.fill(0, reel * ROW_COUNT + 1, (reel + 1) * ROW_COUNT)
      }
    }

    for (let stepRemaining = remaining; stepRemaining > 0; stepRemaining--) {
      const preCombatSnapshot = snapshotGrid(grid)

      const { activations, shootdowns, multiplierDelta } = runCombatOperationSampler(
        grid,
        armedReels,
        stickyGrid,
        multiplierSampler,
        persistentArmedReels,
      ).sample(rng)

      const postCombatSnapshot = snapshotGrid(grid)
      const newMultSum = currentMultSum + multiplierDelta

      if (positionWeights) {
        for (const { reel } of activations) {
          positionWeights.fill(0, reel * ROW_COUNT + 1, (reel + 1) * ROW_COUNT)
        }
      }
      const evaluation = evaluateClusters(grid, engine, positionWeights)

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
        return {
          steps: accSteps,
          finalArmedReels: armedReels,
          finalMultSum: newMultSum,
          finalScatterCount: currentScatterCount,
        }
      }

      const vanished = collectVanishPositions(evaluation.hits, grid, engine)

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

      refillGravitySampler(grid, strips, emptiesPerReel).sample(rng)

      let newScatters = 0
      for (let reel = 0; reel < REEL_COUNT; reel++) {
        for (let row = 0; row < emptiesPerReel[reel]!; row++) {
          if (grid.getSymbol(reel, row) === SCATTER_ID) newScatters++
        }
      }

      currentScatterCount += newScatters
      currentMultSum = newMultSum
    }

    return {
      steps: accSteps,
      finalArmedReels: armedReels,
      finalMultSum: currentMultSum,
      finalScatterCount: currentScatterCount,
    }
  })
}
