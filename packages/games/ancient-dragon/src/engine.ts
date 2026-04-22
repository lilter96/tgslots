import {
  buildEngineFromArrays,
  type SlotWithPaylinesEngine,
} from '@tgslots/slots-core/paylines/slot-engine'
import { PAY_TABLE, PAYLINE_DATA, Symbols } from './constants.js'

export const engine: SlotWithPaylinesEngine = buildEngineFromArrays({
  paylineData: PAYLINE_DATA,
  reelCount: 5,
  rowCount: 3,
  wildSymbol: 'GOLDDRAGON',
  payTable: PAY_TABLE,
  symbols: Symbols,
})
