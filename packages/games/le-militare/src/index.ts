import { LeMilitareStateMachine } from './game-state-machine.js'
import { BET_CONFIG } from './constants.js'
import type { ParsheetConfig } from '@tgslots/slots-simulation-engine/cli/comparison'
import parsheetData from '../config/parsheet.json' with { type: 'json' }

export { LeMilitareStateMachine, BET_CONFIG }
export {
  Symbols,
  BUY_BONUS_COST_MULTIPLIER,
  BUY_OPTIONS,
  MODE_IDS,
  DEFAULT_MODE,
} from './constants.js'
export type { ModeId, BuyOptionId } from './constants.js'

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
  AirRaidPlacement,
  AirRaidPresentation,
} from './types.js'

export const SIM_CONFIG = {
  name: 'LE MILITARE',
  parsheet: parsheetData as ParsheetConfig,
  betConfig: BET_CONFIG,
  StateMachine: LeMilitareStateMachine,
}
