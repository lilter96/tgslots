// ════════════════════════════════════════════════════════════════════════════════
// main.ts — Unified simulation entry point with dynamic game dispatching
// ════════════════════════════════════════════════════════════════════════════════

import * as fs from 'node:fs'
import * as path from 'node:path'
import { mt19937 } from '@tgslots/math'
import { BetConfiguration, Wager } from '@tgslots/slots-core/betting'
import {
  parseSimArgs,
  printSimHeader,
  runAndPrint,
  type ParsheetConfig,
} from '@tgslots/slots-simulation-engine/cli'
import type { StateMachine, SpinResult } from '@tgslots/slots-simulation-engine'

// ─── Constants ───────────────────────────────────────────────────────────────

const GAMES_ROOT = path.resolve(process.cwd(), '../../packages/games')

// ─── Types ───────────────────────────────────────────────────────────────────

interface GameInfo {
  id: string
  folder: string
  packageName: string
  workerFile: string
}

interface GameModule {
  SIM_CONFIG: {
    name: string
    parsheet: ParsheetConfig
    betConfig: BetConfiguration
    StateMachine: new () => StateMachine<SpinResult>
  }
}

// ─── Discovery ───────────────────────────────────────────────────────────────

async function discoverGames(): Promise<GameInfo[]> {
  const folders = fs.readdirSync(GAMES_ROOT)
  const games: GameInfo[] = []

  for (const folder of folders) {
    const pkgPath = path.join(GAMES_ROOT, folder, 'package.json')
    if (!fs.existsSync(pkgPath)) continue

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
    const workerFile = path.join(process.cwd(), `${folder}-worker.ts`)

    if (fs.existsSync(workerFile)) {
      games.push({
        id: folder,
        folder,
        packageName: pkg.name,
        workerFile: `${folder}-worker.ts`,
      })
    }
  }

  return games
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const games = await discoverGames()
  const opts = parseSimArgs()

  if (!opts.game) {
    console.log('\n  Available simulations:')
    console.log('  ' + '─'.repeat(25))
    for (const g of games) {
      console.log(`  - ${g.id.padEnd(20)} (${g.packageName})`)
    }
    console.log('\n  Usage: bun run main.ts --game <id> [options]')
    return
  }

  const game = games.find((g) => g.id === opts.game || g.packageName === opts.game)
  if (!game) {
    console.error(`\n  [Error] Game "${opts.game}" not found or worker missing.`)
    process.exit(1)
  }

  // 1. Dynamic import of the game package
  const pkg = (await import(game.packageName)) as GameModule
  const { SIM_CONFIG } = pkg

  if (!SIM_CONFIG) {
    console.error(`\n  [Error] Package "${game.packageName}" does not export SIM_CONFIG.`)
    process.exit(1)
  }

  printSimHeader(opts, SIM_CONFIG.name)

  if (opts.mode === 'sample') {
    // ── Sample mode ─────────────────────────────────────────────────────────
    const rng = mt19937(opts.seed)
    if (!opts.json) console.log('\n  Sample spins:')
    const sm = new SIM_CONFIG.StateMachine()
    const wager = new Wager(opts.betMultiplier, SIM_CONFIG.betConfig)

    // Helper to safely extract scatter count
    const scattersOf = (spin: SpinResult) => spin.scatters ?? 0

    for (let i = 0; i < 10; i++) {
      const r = sm.spin(rng, wager)
      console.log(
        `    spin ${String(i + 1).padStart(2)}: win=${String(r.win).padStart(5)}  scatter=${scattersOf(r)}`,
      )
      let fsResult: SpinResult | null
      let fsCount = 0
      while ((fsResult = sm.next(rng))) {
        fsCount++
        console.log(
          `      FS ${String(fsCount).padStart(2)}: win=${String(fsResult.win).padStart(5)}  scatter=${scattersOf(fsResult)}`,
        )
      }
    }
  } else {
    // ── Benchmark / Verify mode ─────────────────────────────────────────────
    const workerURL = new URL(`./${game.workerFile}`, import.meta.url)
    await runAndPrint(workerURL, opts, SIM_CONFIG.parsheet, SIM_CONFIG.name, SIM_CONFIG.betConfig)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
