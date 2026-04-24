import { WoodlandWhisperStateMachine } from './game-state-machine.js'
import { WOODLAND_WHISPER_SAMPLER } from './logic.js'
import { BET_CONFIG } from './constants.js'

export { WoodlandWhisperStateMachine, WOODLAND_WHISPER_SAMPLER, BET_CONFIG }

/** Standardized simulation metadata for the unified runner */
export const SIM_CONFIG = {
  name: 'WOODLAND WHISPER',
  parsheet: {
    bet: BET_CONFIG.baseCost,
    targetRTP: 0.8804,
    scatterCycle: 140.52,
    featurePayout: 643.2,
  },
  StateMachine: WoodlandWhisperStateMachine,
}
