import type { PaylineDefinition, ScatterDefinition } from './paylines/types.js'
import type { PaytableConfig } from './paytable/paytable-config.js'

export interface BasicSlotGameConfig {
  readonly reelCount: number
  readonly rowCount: number
}

export interface GameWithPayTableConfig {
  readonly paytable: PaytableConfig
}

export interface GameWithPaylinesConfig extends BasicSlotGameConfig, GameWithPayTableConfig {
  readonly paylines: readonly PaylineDefinition[]
  readonly scatterDefinition?: ScatterDefinition
  readonly wildSymbol?: string
}
