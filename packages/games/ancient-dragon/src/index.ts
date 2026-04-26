import { AncientDragonStateMachine } from './game-state-machine.js'
import { BET_CONFIG } from './constants.js'

export { AncientDragonStateMachine, BET_CONFIG }

/** Standardized simulation metadata for the unified runner */
export const SIM_CONFIG = {
  name: 'ANCIENT DRAGON',
  parsheet: {
    metadata: {
      bet: BET_CONFIG.baseCost,
      source: 'inline',
    },
    comparisons: [
      {
        id: 'total-rtp',
        label: 'Total RTP',
        expected: 0.8805,
        source: { kind: 'summary', key: 'rtp' },
        tolerance: { type: 'absolute', value: 0.005 },
        format: 'percent',
      },
      {
        id: 'free-spin-trigger-cycle',
        label: 'Free Spin Trigger Cycle',
        expected: 142.1,
        source: {
          kind: 'scope',
          scope: ['features', 'free-spins'],
          metric: 'triggers',
          field: 'cycle',
        },
        tolerance: { type: 'relative', value: 0.05 },
      },
    ],
  },
  betConfig: BET_CONFIG,
  StateMachine: AncientDragonStateMachine,
}
