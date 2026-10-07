import { buildEngineFromArrays } from '@tgslots/slots-core/paylines/slot-engine'
import { config, PAYLINES, SYMBOLS } from './constants'

/** Use the same trie, flat paytable and symbol registry as existing payline games. */
export const engine = buildEngineFromArrays({
  paylineData: new Uint8Array(PAYLINES.flat()),
  reelCount: 5,
  rowCount: 3,
  wildSymbol: 'WILD',
  payTable: [...config.paytable.map((pays) => [0, ...pays]), [], []],
  symbols: Object.fromEntries(SYMBOLS.map((name, id) => [name, id])),
})
