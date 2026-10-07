import { Array1 } from '@tgslots/math'
import { Sampler } from '@tgslots/math/probability'
import { config } from './constants'
import type { BoostKind, PrizeTier } from './types'

const SYMBOL = Sampler.fromWeighted(
  Array1.unsafeFromArray(config.weights.map((weight, id) => [id, weight] as const)),
)
const PRIZE = Sampler.fromWeighted(
  Array1.unsafeFromArray(
    config.prizes.map(
      ([tier, value, weight]) =>
        [{ tier: tier as PrizeTier, value: Number(value) }, Number(weight)] as const,
    ),
  ),
)
const PRIZES = Sampler.sequence(Array.from({ length: 15 }, () => PRIZE))
export const BASE_SAMPLE = Sampler.sequence(Array.from({ length: 15 }, () => SYMBOL)).flatMap(
  (symbols) =>
    PRIZES.map((prizes) => ({
      symbols,
      prizes,
    })),
)
const LAND = Sampler.fromWeighted(
  Array1.of([true, config.respinHitWeight] as const, [false, config.respinMissWeight] as const),
).flatMap((hit) => PRIZE.map((prize) => ({ hit, prize })))
export const HOLD_SAMPLE = Sampler.sequence(Array.from({ length: 15 }, () => LAND))
export const BOOST_SAMPLE = Sampler.fromWeighted(
  Array1.unsafeFromArray(
    config.boostWeights.map(([kind, weight]) => [kind as BoostKind, Number(weight)] as const),
  ),
)
