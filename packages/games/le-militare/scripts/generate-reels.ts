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
  // Global multiplier applied to every paytable entry — the master RTP scaler.
  paytableScale: number
  paytable: Record<string, { start: number; step: number }>
  multiplierPool: { values: number[]; weights: number[] }
  freeSpinsAwarded: Record<string, number>
  maxWinMultiplier: number
  jitterSeed: number
}

// ── Tunable math spec ────────────────────────────────────────────────────────
// Counts are per 200-symbol strip. Densities drive cluster frequency.
const SPEC: Spec = {
  // S300 is gated to free spins only (the Combat Operation is a bonus mechanic;
  // its full-reel wild flood is far too strong for the base game).
  base: {
    // launcher reels (0,2,4): no S300, no PLANE
    launcher: {
      BULLET: 32,
      GRENADE: 28,
      HELMET: 25,
      MEDAL: 23,
      RIFLE: 18,
      TANK: 12,
      SOLDIER: 8,
      GENERAL: 5,
      SCATTER: 4,
    },
    // target reels (1,3,5): has PLANE (paying symbol only in base)
    target: {
      BULLET: 32,
      GRENADE: 28,
      HELMET: 25,
      MEDAL: 23,
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
      S300: 1,
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
  paytableScale: 0.771,
  // paytable[size] = scale * (start + step * (size - 6)), for size 6..30.
  paytable: {
    BULLET: { start: 1, step: 0.15 },
    GRENADE: { start: 2, step: 0.2 },
    HELMET: { start: 3, step: 0.3 },
    MEDAL: { start: 4, step: 0.45 },
    RIFLE: { start: 6, step: 0.6 },
    TANK: { start: 9, step: 0.9 },
    SOLDIER: { start: 14, step: 1.5 },
    GENERAL: { start: 20, step: 2.5 },
    PLANE: { start: 3, step: 0.45 },
  },
  multiplierPool: {
    values: [1, 2, 3, 5, 10, 25],
    weights: [600, 250, 90, 35, 20, 5],
  },
  freeSpinsAwarded: { '4': 10, '5': 15, '6': 20, '7': 25 },
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
      const raw = SPEC.paytableScale * (start + step * (size - MIN_CLUSTER))
      map[String(size)] = Math.round(raw * 100) / 100
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
  config.multiplier_pool = SPEC.multiplierPool
  config.scatter_definition.free_spins_awarded = SPEC.freeSpinsAwarded
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
