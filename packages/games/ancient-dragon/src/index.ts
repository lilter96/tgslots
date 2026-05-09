import { AncientDragonStateMachine } from './game-state-machine.js'
import { BET_CONFIG } from './constants.js'
import type { ParsheetConfig } from '@tgslots/slots-simulation-engine/cli'
import parsheetData from '../config/parsheet.json' with { type: 'json' }

export { AncientDragonStateMachine, BET_CONFIG }

export type {
  AncientDragonState,
  FreeSpinState,
  AncientDragonResult,
  AncientDragonBaseResult,
  AncientDragonFreeResult,
} from './game-state-machine.js'

/** Standardized simulation metadata for the unified runner */
export const SIM_CONFIG = {
  name: 'ANCIENT DRAGON',
  parsheet: parsheetData as ParsheetConfig,
  betConfig: BET_CONFIG,
  StateMachine: AncientDragonStateMachine,
}
