import { AncientDragonStateMachine } from './game-state-machine.js'
import { BET_CONFIG } from './constants.js'

export { AncientDragonStateMachine, BET_CONFIG }

/** Standardized simulation metadata for the unified runner */
export const SIM_CONFIG = {
  name: 'ANCIENT DRAGON',
  parsheet: {
    bet: BET_CONFIG.baseCost,
    targetRTP: 0.8805,
    scatterCycle: 142.1,
  },
  betConfig: BET_CONFIG,
  StateMachine: AncientDragonStateMachine,
}
