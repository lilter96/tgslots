import { Array1 } from '@tgslots/math'
import { Sampler } from '@tgslots/math/probability'
import {
  MutableCascadeGrid,
  createCascadeSampler,
  createClusterSlotEngine,
} from '@tgslots/slots-core'
import { config, COLUMNS, ROWS } from './constants'
const weighted = (weights: number[]) =>
  Sampler.fromWeighted(
    Array1.unsafeFromArray(
      weights.flatMap((weight, id) => (weight > 0 ? [[id, weight] as const] : [])),
    ),
  )
export const BASE_SYMBOL = weighted(config.weights)
export const BONUS_SYMBOL = weighted(config.bonusWeights)
export const REFILL_SYMBOL = weighted(config.refillWeights)
export const PRIZE = Sampler.fromWeighted(
  Array1.unsafeFromArray(config.prizes.map(([value, weight]) => [value!, weight!] as const)),
)
export const PRIZES = Sampler.sequence(Array.from({ length: 30 }, () => PRIZE))
export const BASE_GRID = Sampler.sequence(Array.from({ length: 30 }, () => BASE_SYMBOL))
export const BONUS_GRID = Sampler.sequence(Array.from({ length: 30 }, () => BONUS_SYMBOL))
export const engine = createClusterSlotEngine({
  reelCount: COLUMNS,
  rowCount: ROWS,
  wildSymbol: 'WILD',
  paytable: config.paytable,
  scatterDefinition: { symbolId: 7, payouts: [] },
  disallowMixedWilds: true,
})
export function project(symbols: readonly number[]): MutableCascadeGrid {
  const grid = new MutableCascadeGrid(COLUMNS, ROWS)
  symbols.forEach((id, position) =>
    grid.setSymbol(Math.floor(position / ROWS), position % ROWS, id),
  )
  return grid
}
export function sampleCascades(symbols: readonly number[]) {
  return createCascadeSampler(
    engine,
    Sampler.pure(project(symbols)),
    Array.from({ length: COLUMNS }, () => REFILL_SYMBOL),
    { maxSteps: config.maxCascades, captureGrids: true },
  )
}
