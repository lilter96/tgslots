import {
  createSlotsTestEngine,
  type SlotsTestActionHandler,
  type SlotsTestScenarioHandler,
} from '@tgslots/slots-simulation-engine/testing/slots-test-engine'
import { BET_CONFIG } from '../constants.js'
import type { LeMilitareBuyResult, LeMilitareFreeSpinsState } from '../game-state-machine.js'
import { LeMilitareStateMachine } from '../game-state-machine.js'
import { leMilitareMetrics } from '../metrics.js'

const buyBonusAction: SlotsTestActionHandler<LeMilitareStateMachine, [], LeMilitareBuyResult> = (
  session,
) =>
  session.executeResultStep('buyBonus', () => session.sm.buyBonus(session.rng, session.wager), {
    metricPhase: 'spin',
  })

const withFreeSpinsScenario: SlotsTestScenarioHandler<
  LeMilitareStateMachine,
  [overrides?: Partial<LeMilitareFreeSpinsState>],
  LeMilitareFreeSpinsState | null
> = (session, overrides = {}) => {
  session.resetMachine({
    lastGrid: null,
    freeSpins: {
      triggeringWager: overrides.triggeringWager ?? session.wager,
      spinsRemaining: overrides.spinsRemaining ?? 5,
      totalWin: overrides.totalWin ?? 0,
      armedReels: overrides.armedReels ?? new Set<number>(),
      multiplierSum: overrides.multiplierSum ?? 0,
    },
    lastSpinResult: null,
    roundWin: 0,
  })

  return session.sm.state.freeSpins
}

export const leMilitareTestEngine = createSlotsTestEngine(
  LeMilitareStateMachine,
  BET_CONFIG,
  leMilitareMetrics,
)
  .registerAction('buyBonus', buyBonusAction)
  .registerScenario('withFreeSpins', withFreeSpinsScenario)
  .registerProbe('sessionMultiplier', (session) => session.sm.state.freeSpins?.multiplierSum ?? 0)
  .build()
