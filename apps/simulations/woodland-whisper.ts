// Woodland Whisper — Monte Carlo simulation entry point
//
// Uses @tgslots/slots-simulation-engine for the runner and CLI utilities.

import { mt19937 } from '@tgslots/math'
import { parseSimArgs, printSimHeader, runAndPrint } from '@tgslots/slots-simulation-engine/cli'
import { BET_CONFIG, WoodlandWhisperStateMachine } from '@tgslots/woodland-whisper'

const PARSHEET = {
  bet: BET_CONFIG.baseCost,
  targetRTP: 0.8804,
  scatterCycle: 140.52,
  featurePayout: 643.2,
}

const WORKER_URL = new URL('./woodland-whisper-worker.ts', import.meta.url)

const opts = parseSimArgs({ spins: 10_000_000, workers: 1 })

printSimHeader(opts, 'WOODLAND WHISPER')

// ── Helper to safely extract scatter count ──
function scattersOf(spin: { win: number; scatters?: number; sc?: number }): number {
  return spin.scatters ?? spin.sc ?? 0
}

if (opts.mode === 'sample') {
  const rng = mt19937(opts.seed)
  if (!opts.json) console.log('\n  Sample spins:')
  const sm = new WoodlandWhisperStateMachine()
  for (let i = 0; i < 10; i++) {
    const r = sm.spin(rng)
    console.log(
      `    spin ${String(i + 1).padStart(2)}: win=${String(r.win).padStart(5)}  scatter=${scattersOf(r)}`,
    )
    let fsCount = 0
    let fs: any
    while ((fs = sm.next(rng))) {
      fsCount++
      console.log(
        `      FS ${String(fsCount).padStart(2)}: win=${String(fs.win).padStart(5)}  scatter=${scattersOf(fs)}`,
      )
    }
  }
} else {
  await runAndPrint(WORKER_URL, opts, PARSHEET, 'WOODLAND WHISPER')
}
