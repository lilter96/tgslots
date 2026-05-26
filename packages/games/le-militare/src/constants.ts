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
// Default (assault) values — used by tests/UI; per-mode pools live in MODE_CONFIGS.
export const MULTIPLIER_POOL = config.modes.assault.multiplier_pool.values as readonly number[]

// ─── Selectable volatility modes ────────────────────────────────────────────
// Modes share strips + paytable and differ only in multiplier pool + Air Raid
// intensity. Probabilities are integer weight ratios (never floats).

export type ModeId = 'recon' | 'assault' | 'siege'
export const MODE_IDS = ['recon', 'assault', 'siege'] as const
export const DEFAULT_MODE: ModeId = 'assault'

export interface ModeConfig {
  multiplierWeights: readonly (readonly [number, number])[]
  airRaid: {
    triggerWeights: readonly [number, number]
    squadronSizes: readonly number[]
    squadronWeights: readonly number[]
    hitWeights: readonly [number, number]
  }
}

interface RawMode {
  multiplier_pool: { values: number[]; weights: number[] }
  air_raid: {
    trigger_weights: number[]
    squadron_sizes: number[]
    squadron_weights: number[]
    hit_weights: number[]
  }
}

function buildModeConfig(m: RawMode): ModeConfig {
  return {
    multiplierWeights: m.multiplier_pool.values.map(
      (v, i) => [v, m.multiplier_pool.weights[i]!] as const,
    ),
    airRaid: {
      triggerWeights: [m.air_raid.trigger_weights[0]!, m.air_raid.trigger_weights[1]!],
      squadronSizes: m.air_raid.squadron_sizes,
      squadronWeights: m.air_raid.squadron_weights,
      hitWeights: [m.air_raid.hit_weights[0]!, m.air_raid.hit_weights[1]!],
    },
  }
}

export const MODE_CONFIGS: Record<ModeId, ModeConfig> = {
  recon: buildModeConfig(config.modes.recon),
  assault: buildModeConfig(config.modes.assault),
  siege: buildModeConfig(config.modes.siege),
}

// Validate at module load that all expected modes exist in config.
for (const id of MODE_IDS) {
  if (!config.modes[id]) {
    throw new Error(
      `Le Militare config.json is missing mode "${id}". Expected modes: ${MODE_IDS.join(', ')}.`,
    )
  }
}

// ─── Feature Buy menu ───────────────────────────────────────────────────────

export interface BuyTierConfig {
  cost: number
  minScatters: number
  startArmedReels: number
  startMultiplier: number
}

const toTier = (t: {
  cost: number
  min_scatters: number
  start_armed_reels: number
  start_multiplier: number
}): BuyTierConfig => ({
  cost: t.cost,
  minScatters: t.min_scatters,
  startArmedReels: t.start_armed_reels,
  startMultiplier: t.start_multiplier,
})

export const BUY_OPTIONS = {
  standard: toTier(config.buy_options.standard),
  elite: toTier(config.buy_options.elite),
  super: toTier(config.buy_options.super),
  chanceSpin: { cost: config.buy_options.chance_spin.cost },
  airRaidSpin: { cost: config.buy_options.air_raid_spin.cost },
} as const

export type BuyOptionId = 'standard' | 'elite' | 'super'

export const CHANCE_SPIN_FORCE_WEIGHTS = [
  config.buy_options.chance_spin.force_weights[0]!,
  config.buy_options.chance_spin.force_weights[1]!,
] as const

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
