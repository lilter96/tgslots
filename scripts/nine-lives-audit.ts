import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { runSimulation } from '../packages/slots-simulation-engine/src/runner'
import { SIM_CONFIG } from '../packages/games/nine-lives/src/index'
import { simulationBetConfig } from '../packages/games/nine-lives/src/simulation-state-machine'
const configuration = await readFile(
  new URL('../packages/games/nine-lives/config/config.json', import.meta.url),
  'utf8',
)
const samples = [
  { mode: 'base', spins: 10000000 },
  { mode: 'buy', spins: 1000000 },
]
const results = []
for (const sample of samples) {
  const { metrics } = await runSimulation(
    new URL('../apps/simulations/nine-lives-worker.ts', import.meta.url),
    {
      ...sample,
      workers: 2,
      seed: 777,
      warmup: 1000,
      snapshotInterval: 15,
      betConfig: simulationBetConfig(sample.mode),
      gameConfig: { mode: sample.mode },
    },
    (snapshot) => console.log(sample.mode, snapshot.summary.rounds, snapshot.summary.rtp),
  )
  const summary = metrics.summary,
    margin = (1.96 * summary.variance.stdDev) / Math.sqrt(summary.rounds)
  results.push({
    ...sample,
    summary,
    confidence95: [summary.rtp - margin, summary.rtp + margin],
    scopes: metrics.scopes,
  })
  console.log(sample.mode, 'complete', summary.rtp, results.at(-1)!.confidence95)
  if (Math.abs(summary.rtp - SIM_CONFIG.parsheet.targetRTP) > SIM_CONFIG.parsheet.rtpTolerance)
    throw new Error('Math calibration outside target tolerance')
}
await writeFile(
  new URL('../packages/games/nine-lives/config/math-audit.json', import.meta.url),
  JSON.stringify(
    {
      configurationSha256: createHash('sha256').update(configuration).digest('hex'),
      runtime: `Bun ${Bun.version}`,
      runner: '@tgslots/slots-simulation-engine/runner',
      workers: 2,
      seed: 777,
      workerSeeds: [777000, 784919],
      warmupPerWorker: 1000,
      targetRTP: SIM_CONFIG.parsheet.targetRTP,
      maxWinCapInOriginalStakes: 9999,
      results,
    },
    null,
    2,
  ) + '\n',
)
