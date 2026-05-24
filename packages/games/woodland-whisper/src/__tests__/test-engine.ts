import {
  createSlotsTestEngine,
  type SlotsTestActionHandler,
  type SlotsTestScenarioHandler,
} from '@tgslots/slots-simulation-engine/testing/slots-test-engine'
import { BET_CONFIG } from '../constants.js'
import type { FreeSpinState, PickBonusState } from '../game-state-machine.js'
import type { WoodlandWhisperBuyResult, WoodlandWhisperPickResult } from '../game-state-machine.js'
import { WoodlandWhisperStateMachine } from '../game-state-machine.js'
import { woodlandWhisperMetrics } from '../metrics.js'

interface PickBonusScenario {
  board: PickBonusState['board']
  pickSequence: PickBonusState['pickSequence']
  winValue: PickBonusState['winValue']
  currentPickIndex?: PickBonusState['currentPickIndex']
  freeSpins?: FreeSpinState | null
  lastGrid?: number[][] | null
  revealedValues?: PickBonusState['revealedValues']
  triggeringWager?: PickBonusState['triggeringWager']
  userPicks?: PickBonusState['userPicks']
}

const initInitialGridAction: SlotsTestActionHandler<WoodlandWhisperStateMachine, [], void> = (
  session,
) => session.sm.initInitialGrid(session.rng)

const buyBonusAction: SlotsTestActionHandler<
  WoodlandWhisperStateMachine,
  [],
  WoodlandWhisperBuyResult
> = (session) =>
  session.executeResultStep('buyBonus', () => session.sm.buyBonus(session.rng, session.wager), {
    metricPhase: 'spin',
  })

const pickBallAction: SlotsTestActionHandler<
  WoodlandWhisperStateMachine,
  [userIndex: number],
  WoodlandWhisperPickResult
> = (session, userIndex) =>
  session.executeResultStep('pickBall', () => session.sm.pickBall(userIndex), {
    metricPhase: 'spin',
  })

const withFreeSpinsScenario: SlotsTestScenarioHandler<
  WoodlandWhisperStateMachine,
  [overrides?: Partial<FreeSpinState>],
  FreeSpinState | null
> = (session, overrides = {}) => {
  session.resetMachine({
    lastGrid: null,
    freeSpins: {
      triggeringWager: overrides.triggeringWager ?? session.wager,
      totalWin: overrides.totalWin ?? 0,
      spinsRemaining: overrides.spinsRemaining ?? 3,
    },
    pickBonus: null,
  })

  return session.sm.state.freeSpins
}

const withPickBonusScenario: SlotsTestScenarioHandler<
  WoodlandWhisperStateMachine,
  [config: PickBonusScenario],
  PickBonusState | null
> = (session, config) => {
  session.resetMachine({
    lastGrid: config.lastGrid ?? null,
    freeSpins: config.freeSpins ?? null,
    pickBonus: {
      board: config.board,
      pickSequence: config.pickSequence,
      currentPickIndex: config.currentPickIndex ?? 0,
      userPicks: config.userPicks ?? [],
      revealedValues: config.revealedValues ?? [],
      winValue: config.winValue,
      triggeringWager: config.triggeringWager ?? session.wager,
    },
  })

  return session.sm.state.pickBonus
}

export const woodlandWhisperTestEngine = createSlotsTestEngine(
  WoodlandWhisperStateMachine,
  BET_CONFIG,
  woodlandWhisperMetrics,
)
  .registerAction('initInitialGrid', initInitialGridAction)
  .registerAction('buyBonus', buyBonusAction)
  .registerAction('pickBall', pickBallAction)
  .registerScenario('withFreeSpins', withFreeSpinsScenario)
  .registerScenario('withPickBonus', withPickBonusScenario)
  .build()
