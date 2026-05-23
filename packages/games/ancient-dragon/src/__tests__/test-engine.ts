import {
  createSlotsTestEngine,
  type SlotsTestScenarioHandler,
} from '@tgslots/slots-simulation-engine/testing/slots-test-engine'
import { BET_CONFIG } from '../constants.js'
import type { FreeSpinState } from '../game-state-machine.js'
import { AncientDragonStateMachine } from '../game-state-machine.js'
import { ancientDragonMetrics } from '../metrics.js'

const withFreeSpinsScenario: SlotsTestScenarioHandler<
  AncientDragonStateMachine,
  [overrides?: Partial<FreeSpinState>],
  FreeSpinState | null
> = (session, overrides = {}) => {
  session.resetMachine({
    freeSpins: {
      triggeringWager: overrides.triggeringWager ?? session.wager,
      totalWin: overrides.totalWin ?? 0,
      spinsRemaining: overrides.spinsRemaining ?? 5,
    },
  })

  return session.sm.state.freeSpins
}

export const ancientDragonTestEngine = createSlotsTestEngine(
  AncientDragonStateMachine,
  BET_CONFIG,
  ancientDragonMetrics,
)
  .registerScenario('withFreeSpins', withFreeSpinsScenario)
  .registerProbe('freeSpinState', (session) => session.sm.state.freeSpins)
  .build()
