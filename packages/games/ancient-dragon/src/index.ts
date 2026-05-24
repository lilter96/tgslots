import { AncientDragonStateMachine } from './game-state-machine.js'
import { BET_CONFIG } from './constants.js'
import type { ParsheetConfig } from '@tgslots/slots-simulation-engine/cli'
import parsheetData from '../config/parsheet.json' with { type: 'json' }

import { ancientDragonMetrics } from './metrics.js'

export { AncientDragonStateMachine, BET_CONFIG, ancientDragonMetrics }

export type {
  AncientDragonState,
  FreeSpinState,
  AncientDragonResult,
  AncientDragonBaseResult,
  AncientDragonFreeResult,
} from './game-state-machine.js'

/** Consumed by the CLI via dynamic `import(packageName).SIM_CONFIG`. Do not remove. */
export const SIM_CONFIG = {
  name: 'ANCIENT DRAGON',
  parsheet: parsheetData as ParsheetConfig,
  betConfig: BET_CONFIG,
  StateMachine: AncientDragonStateMachine,
}
