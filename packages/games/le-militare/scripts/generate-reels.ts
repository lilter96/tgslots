/**
 * Deterministic reel-strip + paytable generator for Le Militare.
 *
 * config.json is a *materialized artifact*: this script is the source of truth
 * for the math knobs (strip composition, paytable curve, multiplier pool, free
 * spin awards, max win). Re-run after editing SPEC to regenerate config.json:
 *
 *   bun packages/games/le-militare/scripts/generate-reels.ts
 *
 * Strips use even (anti-clump) symbol distribution so cluster formation is
 * driven by tunable per-symbol frequency rather than accidental vertical runs.
 * Launcher reels (0,2,4) carry S300; target reels (1,3,5) carry PLANE.
 */
import * as fs from 'node:fs'
import * as path from 'node:path'

type SymCounts = Record<string, number>

interface PhaseSpec {
  launcher: SymCounts
  target: SymCounts
}

interface Spec {
  base: PhaseSpec
  free: PhaseSpec
  // Per-symbol vertical run length: copies are grouped into blocks of this size
  // so the symbol can stack vertically and connect into clusters. Run length 1
  // = fully spread (rarely clusters). Commons get longer runs, high pays stay 1.
  runLen: Record<string, number>
  // Per-symbol integer payout curve. `start`/`step` are design knobs; every
  // emitted payout is rounded to a whole number (payouts are INTEGERS only).
  paytable: Record<string, { start: number; step: number }>
  // Selectable volatility modes. Modes share strips + paytable and differ only in
  // multiplier pool + Air Raid intensity; each is tuned to the same 98.4% RTP.
  // `assault` is the standard/default profile.
  modes: { recon: ModeTuning; assault: ModeTuning; siege: ModeTuning }
  freeSpinsAwarded: Record<string, number>
  // Feature buy menu. Costs are × stake (integers); each tuned so EV/cost ≈ RTP.
  buyOptions: {
    standard: BuyTier
    elite: BuyTier
    super: BuyTier
    chanceSpin: { cost: number; forceWeights: [number, number] }
    airRaidSpin: { cost: number }
  }
  maxWinMultiplier: number
  jitterSeed: number
}

interface BuyTier {
  cost: number
  minScatters: number
  startArmedReels: number
  startMultiplier: number
}

// Per-mode tuning. Integer weights only (probabilities are weight ratios).
interface ModeTuning {
  multiplierPool: { values: number[]; weights: number[] }
  // Air Raid: a squadron flies over, the S300 intercepts some planes, each
  // interception drops a multiplier-WILD on a random cell.
  airRaid: {
    triggerWeights: [number, number] // [fire, skip]
    squadronSizes: number[]
    squadronWeights: number[]
    hitWeights: [number, number] // [hit, miss]
  }
}

// ── Tunable math spec ────────────────────────────────────────────────────────
// Counts are per 200-symbol strip. Densities drive cluster frequency.
const SPEC: Spec = {
  // S300 is gated to free spins only (the Combat Operation is a bonus mechanic;
  // its full-reel wild flood is far too strong for the base game).
  base: {
    // launcher reels (0,2,4): no S300, no PLANE
    launcher: {
      BULLET: 26,
      GRENADE: 22,
      HELMET: 22,
      MEDAL: 22,
      RIFLE: 18,
      TANK: 12,
      SOLDIER: 8,
      GENERAL: 5,
      SCATTER: 3,
    },
    // target reels (1,3,5): has PLANE (paying symbol only in base)
    target: {
      BULLET: 26,
      GRENADE: 22,
      HELMET: 22,
      MEDAL: 22,
      RIFLE: 18,
      TANK: 12,
      SOLDIER: 8,
      GENERAL: 5,
      PLANE: 8,
      SCATTER: 3,
    },
  },
  free: {
    launcher: {
      BULLET: 34,
      GRENADE: 31,
      HELMET: 27,
      MEDAL: 24,
      RIFLE: 21,
      TANK: 15,
      SOLDIER: 10,
      GENERAL: 6,
      S300: 2,
      SCATTER: 3,
    },
    target: {
      BULLET: 34,
      GRENADE: 31,
      HELMET: 27,
      MEDAL: 24,
      RIFLE: 21,
      TANK: 15,
      SOLDIER: 10,
      GENERAL: 6,
      PLANE: 6,
      SCATTER: 3,
    },
  },
  runLen: {
    BULLET: 2,
    GRENADE: 2,
    HELMET: 2,
    MEDAL: 2,
    RIFLE: 1,
    TANK: 1,
    SOLDIER: 1,
    GENERAL: 1,
    PLANE: 1,
    S300: 1,
    SCATTER: 1,
  },
  // paytable[size] = round(start + step * (size - 6)), size 6..30. Integer output.
  paytable: {
    BULLET: { start: 1, step: 0.1 },
    GRENADE: { start: 2, step: 0.13 },
    HELMET: { start: 2, step: 0.2 },
    MEDAL: { start: 3, step: 0.3 },
    RIFLE: { start: 4, step: 0.4 },
    TANK: { start: 6, step: 0.55 },
    SOLDIER: { start: 9, step: 0.9 },
    GENERAL: { start: 12, step: 1.5 },
    PLANE: { start: 2, step: 0.3 },
  },
  modes: {
    // Low volatility: frequent Air Raids, small multipliers, tamer tail.
    recon: {
      multiplierPool: { values: [1, 2, 3, 5, 10, 25], weights: [660, 270, 50, 14, 5, 1] },
      airRaid: {
        triggerWeights: [16, 84],
        squadronSizes: [1, 2, 3],
        squadronWeights: [60, 30, 10],
        hitWeights: [6, 4],
      },
    },
    // Standard (default): the converged 98.4% profile.
    assault: {
      multiplierPool: { values: [1, 2, 3, 5, 10, 25], weights: [620, 252, 82, 27, 16, 5] },
      airRaid: {
        triggerWeights: [7, 93],
        squadronSizes: [1, 2, 3],
        squadronWeights: [50, 35, 15],
        hitWeights: [6, 4],
      },
    },
    // High volatility: rarer but heavier Air Raids, heavy multiplier tail.
    siege: {
      multiplierPool: {
        values: [1, 2, 3, 5, 10, 25, 50, 100],
        weights: [560, 250, 90, 40, 30, 18, 8, 4],
      },
      airRaid: {
        triggerWeights: [6, 94],
        squadronSizes: [1, 2, 3],
        squadronWeights: [40, 35, 25],
        hitWeights: [6, 4],
      },
    },
  },
  freeSpinsAwarded: { '4': 9, '5': 13, '6': 17, '7': 21 },
  buyOptions: {
    standard: { cost: 184, minScatters: 4, startArmedReels: 0, startMultiplier: 0 },
    elite: { cost: 874, minScatters: 6, startArmedReels: 0, startMultiplier: 0 },
    super: { cost: 1795, minScatters: 7, startArmedReels: 0, startMultiplier: 3 },
    chanceSpin: { cost: 4.2, forceWeights: [9, 991] },
    airRaidSpin: { cost: 1.9 },
  },
  maxWinMultiplier: 15000,
  jitterSeed: 0x9e3779b9,
}

const GRID_MAX_CLUSTER = 30
const MIN_CLUSTER = 6

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Block distribution: each symbol's copies are grouped into blocks of its run
 * length, blocks are placed at evenly spaced positions (plus bounded
 * deterministic jitter), then sorted and flattened. Runs give the vertical
 * stacking needed to form clusters; even block spacing keeps cluster frequency
 * tunable instead of accidental.
 */
function buildStrip(counts: SymCounts, rand: () => number): string[] {
  const length = Object.values(counts).reduce((a, b) => a + b, 0)
  const blocks: { pos: number; sym: string; size: number }[] = []
  for (const [sym, count] of Object.entries(counts)) {
    if (count <= 0) continue
    const run = Math.max(1, SPEC.runLen[sym] ?? 1)
    const sizes: number[] = []
    for (let left = count; left > 0; left -= run) sizes.push(Math.min(run, left))
    const spacing = length / sizes.length
    sizes.forEach((size, i) => {
      const jitter = (rand() - 0.5) * spacing * 0.6
      blocks.push({ pos: (i + 0.5) * spacing + jitter, sym, size })
    })
  }
  blocks.sort((a, b) => a.pos - b.pos)
  const strip: string[] = []
  for (const b of blocks) {
    for (let k = 0; k < b.size; k++) strip.push(b.sym)
  }
  return strip
}

function buildPhase(phase: PhaseSpec, rand: () => number): string[][] {
  // reels 0..5; even index = launcher, odd index = target
  const reels: string[][] = []
  for (let r = 0; r < 6; r++) {
    const counts = r % 2 === 0 ? phase.launcher : phase.target
    reels.push(buildStrip(counts, rand))
  }
  return reels
}

function buildPaytable(): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {}
  for (const [sym, { start, step }] of Object.entries(SPEC.paytable)) {
    const map: Record<string, number> = {}
    for (let size = MIN_CLUSTER; size <= GRID_MAX_CLUSTER; size++) {
      map[String(size)] = Math.max(1, Math.round(start + step * (size - MIN_CLUSTER)))
    }
    out[sym] = map
  }
  return out
}

function reelsToObject(reels: string[][]): Record<string, string[]> {
  const obj: Record<string, string[]> = {}
  reels.forEach((reel, i) => {
    obj[`reel${i + 1}`] = reel
  })
  return obj
}

function main(): void {
  const configPath = path.resolve(import.meta.dirname, '../config/config.json')
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))

  const rand = mulberry32(SPEC.jitterSeed)

  config.game_metadata.min_cluster = MIN_CLUSTER
  config.game_metadata.max_win_multiplier = SPEC.maxWinMultiplier
  config.paytable = buildPaytable()
  const emitMode = (m: ModeTuning) => ({
    multiplier_pool: m.multiplierPool,
    air_raid: {
      trigger_weights: m.airRaid.triggerWeights,
      squadron_sizes: m.airRaid.squadronSizes,
      squadron_weights: m.airRaid.squadronWeights,
      hit_weights: m.airRaid.hitWeights,
    },
  })
  config.modes = {
    recon: emitMode(SPEC.modes.recon),
    assault: emitMode(SPEC.modes.assault),
    siege: emitMode(SPEC.modes.siege),
  }
  // Top-level keys mirror the default (assault) mode for any reader that does
  // not select a mode.
  config.multiplier_pool = config.modes.assault.multiplier_pool
  config.air_raid = config.modes.assault.air_raid
  config.scatter_definition.free_spins_awarded = SPEC.freeSpinsAwarded
  const tier = (t: BuyTier) => ({
    cost: t.cost,
    min_scatters: t.minScatters,
    start_armed_reels: t.startArmedReels,
    start_multiplier: t.startMultiplier,
  })
  config.buy_options = {
    standard: tier(SPEC.buyOptions.standard),
    elite: tier(SPEC.buyOptions.elite),
    super: tier(SPEC.buyOptions.super),
    chance_spin: {
      cost: SPEC.buyOptions.chanceSpin.cost,
      force_weights: SPEC.buyOptions.chanceSpin.forceWeights,
    },
    air_raid_spin: { cost: SPEC.buyOptions.airRaidSpin.cost },
  }
  config.buy_bonus_cost_multiplier = SPEC.buyOptions.standard.cost
  config.reel_strips_base = reelsToObject(buildPhase(SPEC.base, rand))
  config.reel_strips_free = reelsToObject(buildPhase(SPEC.free, rand))

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n')

  const summary = (phase: PhaseSpec): string => {
    const l = Object.values(phase.launcher).reduce((a, b) => a + b, 0)
    const t = Object.values(phase.target).reduce((a, b) => a + b, 0)
    return `launcher=${l} target=${t}`
  }
  console.log('Le Militare config regenerated.')
  console.log(`  base strips:  ${summary(SPEC.base)}`)
  console.log(`  free strips:  ${summary(SPEC.free)}`)
  console.log(`  max win:      ${SPEC.maxWinMultiplier}x`)
}

main()
