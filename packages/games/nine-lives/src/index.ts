export * from './machine'
export * from './constants'
export * from './types'
export * from './simulation-state-machine'
import { NineLivesSimulationMachine, simulationBetConfig } from './simulation-state-machine'
import { BET_CONFIG, config } from './constants'
import type { ParsheetConfig } from '@tgslots/slots-simulation-engine/cli/comparison'
export const SIM_CONFIG = {
  name: 'Nine Lives',
  StateMachine: NineLivesSimulationMachine,
  betConfig: BET_CONFIG,
  betConfigForMode: simulationBetConfig,
  parsheet: {
    bet: config.baseCost,
    targetRTP: config.targetRTP,
    rtpTolerance: 0.015,
  } satisfies ParsheetConfig,
}
