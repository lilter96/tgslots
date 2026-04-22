// Woodland Whisper — Monte Carlo simulation entry point
//
// Uses @tgslots/slots-simulation-engine for the runner and CLI utilities.
// The worker thread lives in the game package and is referenced by URL.

import { mt19937 } from '@tgslots/math'
import { runSimulation } from '@tgslots/slots-simulation-engine/runner'
import { parseSimArgs, printSimHeader, printSimResult } from '@tgslots/slots-simulation-engine/cli'
import { BET, WoodlandWhisperStateMachine } from '@tgslots/woodland-whisper'

const PARSHEET = {
  bet: BET,
  targetRTP: 0.8804,
  scatterCycle: 140.52,
  featurePayout: 643.2,
}

// Worker lives alongside this entry point
const WORKER_URL = new URL('./woodland-whisper-worker.ts', import.meta.url)

const opts = parseSimArgs({ spins: 10_000_000, workers: 1 })

printSimHeader(opts, 'WOODLAND WHISPER')

if (opts.mode === 'sample') {
  const rng = mt19937(opts.seed)
  if (!opts.json) console.log('\n  Sample spins:')
  const sm = new WoodlandWhisperStateMachine()
  for (let i = 0; i < 10; i++) {
    const r = sm.spin(rng)
    console.log(
      `    spin ${String(i + 1).padStart(2)}: win=${String(r.win).padStart(5)}  scatter=${r.sc}`,
    )
    let fsCount = 0
    let fs: { win: number; sc: number } | null
    while ((fs = sm.next(rng))) {
      fsCount++
      console.log(
        `      FS ${String(fsCount).padStart(2)}: win=${String(fs.win).padStart(5)}  scatter=${fs.sc}`,
      )
    }
  }
} else {
  if (!opts.json && opts.workers > 1) console.log(`\n  Spawning ${opts.workers} workers…`)
  const result = await runSimulation(WORKER_URL, opts)
  printSimResult(result, PARSHEET, opts, 'WOODLAND WHISPER')
  if (!opts.json) console.log()
}
