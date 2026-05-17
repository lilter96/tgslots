import { createSymbolRegistry, type SymbolId, type SymbolRegistry } from '../symbol-registry.js'
import { buildClusterPaytable } from '../paytable/cluster-paytable.js'
import type { FlatPaytable } from '../paytable/flat-paytable.js'
import type { BasicSlotGameConfig, GameWithPayTableConfig } from '../game-config.js'
import type { ScatterDefinition } from '../paylines/types.js'

export interface GameWithClustersConfig extends BasicSlotGameConfig, GameWithPayTableConfig {
  readonly wildSymbol?: string
  readonly scatterDefinition?: ScatterDefinition
  /**
   * When true, a WILD cell that is claimed by a winning cluster cannot be traversed
   * by any subsequent symbol's BFS sweep. This prevents one WILD from boosting
   * clusters of two different symbol types simultaneously.
   */
  readonly disallowMixedWilds?: boolean
}

export interface ClusterSlotEngine {
  readonly symbols: SymbolRegistry
  /** `paytable.payouts[symbolId][clusterSize]`, sized to gridArea + 1. */
  readonly paytable: FlatPaytable
  readonly reelCount: number
  readonly rowCount: number
  readonly gridArea: number
  readonly scatterId: SymbolId | null
  readonly disallowMixedWilds: boolean
}

/** Builds a cluster-pays engine. All hot-path structures are pre-allocated. */
export function createClusterSlotEngine(config: GameWithClustersConfig): ClusterSlotEngine {
  const wildSymbol = config.wildSymbol ?? 'WILD'
  const symbols = createSymbolRegistry(Object.keys(config.paytable), wildSymbol)
  const gridArea = config.reelCount * config.rowCount
  const paytable = buildClusterPaytable(config.paytable, symbols, gridArea)

  return {
    symbols,
    paytable,
    reelCount: config.reelCount,
    rowCount: config.rowCount,
    gridArea,
    scatterId: config.scatterDefinition ? config.scatterDefinition.symbolId : null,
    disallowMixedWilds: config.disallowMixedWilds ?? false,
  }
}
