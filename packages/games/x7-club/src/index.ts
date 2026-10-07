export { X7ClubMachine, initialState } from './machine'
export { BET_CONFIG, config, PAYLINES, SYMBOLS } from './constants'
export type * from './types'

import type { ParsheetConfig } from '@tgslots/slots-simulation-engine/cli/comparison'
import { BET_CONFIG } from './constants'
import { X7ClubSimulationMachine, simulationBetConfig } from './simulation-state-machine'
export { X7ClubSimulationMachine, simulationBetConfig }
export const SIM_CONFIG = {
  name: 'X7 CLUB',
  betConfig: BET_CONFIG,
  betConfigForMode: simulationBetConfig,
  StateMachine: X7ClubSimulationMachine,
  parsheet: { bet: 20, targetRTP: 0.96, rtpTolerance: 0.015 } satisfies ParsheetConfig,
}
