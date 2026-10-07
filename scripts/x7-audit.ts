import { createHash } from 'node:crypto'
import { runSimulation } from '../packages/slots-simulation-engine/src/runner'
import { simulationBetConfig } from '../packages/games/x7-club/src/simulation-state-machine'

const configUrl = new URL('../packages/games/x7-club/config/config.json', import.meta.url)
const configuration = await Bun.file(configUrl).text()
const samples = [
  { mode: 'base', spins: 5_000_000 },
  { mode: 'buy', spins: 1_000_000 },
]
const results = []
for (const sample of samples) {
  const { metrics } = await runSimulation(
    new URL('../apps/simulations/x7-club-worker.ts', import.meta.url),
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
  const summary = metrics.summary
  const margin = (1.96 * summary.variance.stdDev) / Math.sqrt(summary.rounds)
  results.push({
    ...sample,
    summary,
    confidence95: [summary.rtp - margin, summary.rtp + margin],
    scopes: metrics.scopes,
  })
  console.log(sample.mode, 'complete', summary.rtp, results.at(-1)!.confidence95)
}
await Bun.write(
  new URL('../packages/games/x7-club/config/math-audit.json', import.meta.url),
  JSON.stringify(
    {
      configurationSha256: createHash('sha256').update(configuration).digest('hex'),
      runner: '@tgslots/slots-simulation-engine/runner',
      workers: 2,
      seed: 777,
      workerSeeds: [777000, 784919],
      warmupPerWorker: 1000,
      targetRTP: 0.96,
      maxWinCapInOriginalStakes: 7777,
      results,
    },
    null,
    2,
  ) + '\n',
)
