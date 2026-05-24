import { BetConfiguration } from '@tgslots/slots-core/betting/config'
import config from '../config/config.json' with { type: 'json' }

export const BET_CONFIG = BetConfiguration.fromBaseCost(1)

// ─── Symbol IDs ────────────────────────────────────────────────────────────
// WILD is always registered first (id 0) by createSymbolRegistry.
// Paying symbols are registered next in Object.keys(paytable) order.
// S300 and SCATTER are non-paying; their IDs are hardcoded after the paytable symbols.

export const WILD_ID = 0 as const
export const BULLET_ID = 1 as const
export const GRENADE_ID = 2 as const
export const HELMET_ID = 3 as const
export const MEDAL_ID = 4 as const
export const RIFLE_ID = 5 as const
export const TANK_ID = 6 as const
export const SOLDIER_ID = 7 as const
export const GENERAL_ID = 8 as const
export const PLANE_ID = 9 as const
export const S300_ID = 10 as const
export const SCATTER_ID = 11 as const

export const SYM_NAMES = [
  'WILD',
  'BULLET',
  'GRENADE',
  'HELMET',
  'MEDAL',
  'RIFLE',
  'TANK',
  'SOLDIER',
  'GENERAL',
  'PLANE',
  'S300',
  'SCATTER',
] as const

export type SymbolName = (typeof SYM_NAMES)[number]

export const Symbols: Record<SymbolName, number> = {
  WILD: WILD_ID,
  BULLET: BULLET_ID,
  GRENADE: GRENADE_ID,
  HELMET: HELMET_ID,
  MEDAL: MEDAL_ID,
  RIFLE: RIFLE_ID,
  TANK: TANK_ID,
  SOLDIER: SOLDIER_ID,
  GENERAL: GENERAL_ID,
  PLANE: PLANE_ID,
  S300: S300_ID,
  SCATTER: SCATTER_ID,
}

// ─── Game Config ──────────────────────────────────────────────────────────

export const REEL_COUNT = 6 as const
export const ROW_COUNT = 5 as const
export const GRID_AREA = REEL_COUNT * ROW_COUNT

export const MIN_SCATTERS = 4 as const

export const FREE_SPIN_AWARDS: Record<number, number> = Object.fromEntries(
  Object.entries(config.scatter_definition.free_spins_awarded).map(([count, spins]) => [
    Number(count),
    spins as number,
  ]),
)

export const MAX_CASCADE_STEPS = 100 as const

export const BUY_BONUS_COST_MULTIPLIER: number = config.buy_bonus_cost_multiplier

/** Round payout ceiling, expressed as a multiple of the total stake. */
export const MAX_WIN_MULTIPLIER: number = config.game_metadata.max_win_multiplier

// ─── Multiplier Pool ───────────────────────────────────────────────────────

export const MULTIPLIER_POOL = config.multiplier_pool.values as readonly number[]
export const MULTIPLIER_POOL_WEIGHTS: readonly (readonly [number, number])[] = MULTIPLIER_POOL.map(
  (val, i) => [val, config.multiplier_pool.weights[i]!] as const,
)

// ─── Air Raid (base-game Combat Operation) ──────────────────────────────────
// Probabilities are integer weight ratios (never floats).
export const AIR_RAID = {
  triggerWeights: [
    config.air_raid.trigger_weights[0]!,
    config.air_raid.trigger_weights[1]!,
  ] as const,
  squadronSizes: config.air_raid.squadron_sizes as readonly number[],
  squadronWeights: config.air_raid.squadron_weights as readonly number[],
  hitWeights: [config.air_raid.hit_weights[0]!, config.air_raid.hit_weights[1]!] as const,
} as const

// ─── Reel Strips ─────────────────────────────────────────────────────────

function encodeStrip(names: string[]): Uint8Array {
  const n = names.length
  const arr = new Uint8Array(n + 2)
  for (let i = 0; i < n; i++) {
    arr[i] = Symbols[names[i] as SymbolName]!
  }
  arr[n] = arr[0]!
  arr[n + 1] = arr[1]!
  return arr
}

const base = config.reel_strips_base
const free = config.reel_strips_free

export const INT_STRIPS_BASE: readonly Uint8Array[] = [
  encodeStrip(base.reel1),
  encodeStrip(base.reel2),
  encodeStrip(base.reel3),
  encodeStrip(base.reel4),
  encodeStrip(base.reel5),
  encodeStrip(base.reel6),
]

export const INT_STRIPS_FREE: readonly Uint8Array[] = [
  encodeStrip(free.reel1),
  encodeStrip(free.reel2),
  encodeStrip(free.reel3),
  encodeStrip(free.reel4),
  encodeStrip(free.reel5),
  encodeStrip(free.reel6),
]
