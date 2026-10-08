import type { ClusterSlotEngine } from '../cluster/cluster-engine.js'
import { snapshotGrid } from '../spin-grid/spin-grid.js'
import type { EvalGrid } from '../spin-grid/spin-grid.js'
import { evaluateClusters } from '../cluster/evaluator.js'
import { MutableCascadeGrid } from './cascade-grid.js'
import { collectVanishPositions } from './vanishing.js'
import type { CascadeOptions, CascadeResult, CascadeStep, RefillSource } from './types.js'

const DEFAULT_MAX_STEPS = 100

/**
 * Synchronous cascade orchestrator. Holds no `Rng`; callers supply a
 * `RefillSource` whose `drawNext(reel)` returns the next symbol to fall
 * into a vacated cell on that reel.
 */
export class CascadeEngine {
  private readonly maxSteps: number
  private readonly captureGrids: boolean

  constructor(
    private readonly slot: ClusterSlotEngine,
    options?: CascadeOptions,
  ) {
    this.maxSteps = options?.maxSteps ?? DEFAULT_MAX_STEPS
    this.captureGrids = options?.captureGrids ?? false
  }

  run(initialGrid: EvalGrid, refill: RefillSource): CascadeResult {
    const grid = MutableCascadeGrid.fromProjection(initialGrid)
    const steps: CascadeStep[] = []
    let totalWin = 0

    for (let i = 0; i < this.maxSteps; i++) {
      const before = this.captureGrids ? snapshotGrid(grid) : undefined
      const evaluation = evaluateClusters(grid, this.slot)
      if (evaluation.hits.length === 0) {
        if (steps.length === 0) {
          steps.push({ evaluation, vanished: [], stepWin: 0 })
        }
        break
      }

      const vanished = collectVanishPositions(evaluation.hits, grid, this.slot)
      grid.clearAt(vanished)
      grid.applyGravity((reel) => refill.drawNext(reel))

      steps.push({
        evaluation,
        vanished,
        stepWin: evaluation.totalWin,
        ...(this.captureGrids ? { before, after: snapshotGrid(grid) } : {}),
      })
      totalWin += evaluation.totalWin
    }

    return { steps, totalWin, finalGrid: grid }
  }
}
