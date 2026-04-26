import { WoodlandWhisperStateMachine } from './game-state-machine.js'
import { WOODLAND_WHISPER_SAMPLER } from './logic.js'
import { BET_CONFIG } from './constants.js'

export { WoodlandWhisperStateMachine, WOODLAND_WHISPER_SAMPLER, BET_CONFIG }

/** Standardized simulation metadata for the unified runner */
export const SIM_CONFIG = {
  name: 'WOODLAND WHISPER',
  parsheet: {
    metadata: {
      bet: BET_CONFIG.baseCost,
      source: 'inline',
    },
    comparisons: [
      {
        id: 'total-rtp',
        label: 'Total RTP',
        expected: 0.8804,
        source: { kind: 'summary', key: 'rtp' },
        tolerance: { type: 'absolute', value: 0.005 },
        format: 'percent',
      },
      {
        id: 'pick-bonus-trigger-cycle',
        label: 'Pick Bonus Trigger Cycle',
        expected: 140.52,
        source: {
          kind: 'scope',
          scope: ['features', 'free-spins', 'pick-bonus'],
          metric: 'triggers',
          field: 'cycle',
        },
        tolerance: { type: 'relative', value: 0.05 },
      },
      {
        id: 'pick-bonus-payout',
        label: 'Pick Bonus Payout',
        expected: 643.2,
        source: {
          kind: 'scope',
          scope: ['features', 'free-spins', 'pick-bonus'],
          metric: 'bonus-payout',
          field: 'average',
        },
      },
    ],
  },
  betConfig: BET_CONFIG,
  StateMachine: WoodlandWhisperStateMachine,
}
