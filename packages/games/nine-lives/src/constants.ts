import { BetConfiguration } from '@tgslots/slots-core/betting'
import config from '../config/config.json' with { type: 'json' }
export { config }
export const SYMBOLS = ['WILD', 'BONE', 'FISH', 'YARN', 'CANDLE', 'CAT', 'COIN', 'SCATTER'] as const
export const BET_CONFIG = BetConfiguration.fromBaseCost(config.baseCost)
export const COLUMNS = 6
export const ROWS = 5
