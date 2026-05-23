import { LeMilitareStateMachine } from './game-state-machine.js'
import { BET_CONFIG } from './constants.js'
import type { ParsheetConfig } from '@tgslots/slots-simulation-engine/cli'
import parsheetData from '../config/parsheet.json' with { type: 'json' }

import { leMilitareMetrics } from './metrics.js'

export { LeMilitareStateMachine, BET_CONFIG, leMilitareMetrics }
export { Symbols, BUY_BONUS_COST_MULTIPLIER } from './constants.js'

export type {
  LeMilitareState,
  LeMilitareFreeSpinsState,
  LeMilitareResult,
  LeMilitareBaseResult,
  LeMilitareFreeResult,
  LeMilitareBuyResult,
} from './game-state-machine.js'

export type {
  LeMilitareSpinResult,
  CombatCascadeStep,
  ShootdownEvent,
  ActivationEvent,
} from './types.js'

/** Consumed by the CLI via dynamic `import(packageName).SIM_CONFIG`. Do not remove. */
export const SIM_CONFIG = {
  name: 'LE MILITARE',
  parsheet: parsheetData as ParsheetConfig,
  betConfig: BET_CONFIG,
  StateMachine: LeMilitareStateMachine,
}
