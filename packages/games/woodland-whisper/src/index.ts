import { WoodlandWhisperStateMachine } from './game-state-machine.js'
import { WOODLAND_WHISPER_SAMPLER } from './logic.js'
import {
  BET_CONFIG,
  SYM_NAMES,
  PAYLINE_DATA,
  Symbols,
  BUY_BONUS_COST_MULTIPLIER,
} from './constants.js'
import type { ParsheetConfig } from '@tgslots/slots-simulation-engine/cli/comparison'
import parsheetData from '../config/parsheet.json' with { type: 'json' }

export {
  WoodlandWhisperStateMachine,
  WOODLAND_WHISPER_SAMPLER,
  BET_CONFIG,
  SYM_NAMES,
  PAYLINE_DATA,
  Symbols,
  BUY_BONUS_COST_MULTIPLIER,
}

export type {
  WoodlandWhisperState,
  WoodlandWhisperBaseResult,
  WoodlandWhisperFreeResult,
  WoodlandWhisperPickResult,
  WoodlandWhisperBuyResult,
  WoodlandWhisperResult,
} from './game-state-machine.js'

export type { PaylineHit } from '@tgslots/slots-core/paylines/types'

/** Standardized simulation metadata for the unified runner */
export const SIM_CONFIG = {
  name: 'WOODLAND WHISPER',
  parsheet: parsheetData as ParsheetConfig,
  betConfig: BET_CONFIG,
  StateMachine: WoodlandWhisperStateMachine,
}
