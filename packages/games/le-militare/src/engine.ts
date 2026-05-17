import { createClusterSlotEngine } from '@tgslots/slots-core'
import type { ClusterSlotEngine } from '@tgslots/slots-core'
import { SCATTER_ID, REEL_COUNT, ROW_COUNT } from './constants.js'
import config from '../config/config.json' with { type: 'json' }

export type { ClusterSlotEngine }

export const engine: ClusterSlotEngine = createClusterSlotEngine({
  reelCount: REEL_COUNT,
  rowCount: ROW_COUNT,
  wildSymbol: 'WILD',
  paytable: config.paytable as Record<string, Record<string, number>>,
  scatterDefinition: {
    symbolId: SCATTER_ID,
    payouts: [],
  },
  disallowMixedWilds: config.disallow_mixed_wild_clusters,
})
