import type { Rng } from '@tgslots/math/rng/types'
import type { Wager } from '@tgslots/slots-core/betting'
import { BetConfiguration } from '@tgslots/slots-core/betting'
import { NineLivesMachine } from './machine'
import { BET_CONFIG, config } from './constants'
import type { LivesResult, LivesState } from './types'

export function simulationBetConfig(mode?: string): BetConfiguration {
  if (mode !== undefined && mode !== 'base' && mode !== 'buy')
    throw new Error(`Unsupported Nine Lives mode: ${mode}`)
  return mode === 'buy'
    ? BetConfiguration.fromLineCountAndCostPerLine(config.baseCost, config.buyCost)
    : BET_CONFIG
}
/** Purchased rounds use the original stake level and the actual purchase-cost denominator. */
export class NineLivesSimulationMachine extends NineLivesMachine {
  constructor(
    state?: LivesState,
    private readonly mode = 'base',
  ) {
    super(state)
    simulationBetConfig(mode)
  }
  override spin(rng: Rng, wager: Wager): LivesResult {
    return this.mode === 'buy' ? this.buyBonus(wager) : super.spin(rng, wager)
  }
}
