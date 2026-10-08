import { parentPort, workerData } from 'node:worker_threads'
import { mt19937 } from '@tgslots/math'
import { BetConfiguration, Wager } from '@tgslots/slots-core/betting'
import { ModernDataCollector } from '@tgslots/slots-simulation-engine'
import { performWarmup, runWorkerLoop } from '@tgslots/slots-simulation-engine/runner'
import type { WorkerPayload } from '@tgslots/slots-simulation-engine/runner'
import { NineLivesSimulationMachine } from '@tgslots/nine-lives'

const payload = workerData as WorkerPayload
const rng = mt19937(payload.seed)
const bet = payload.betConfig
const wager = new Wager(
  payload.betMultiplier,
  new BetConfiguration(bet.baseCost, bet.lineCount, bet.costPerLine, bet.sideBetBase),
)
const machine = new NineLivesSimulationMachine(undefined, payload.gameConfig?.mode ?? 'base')
performWarmup(machine, rng, payload.warmup, wager)
runWorkerLoop(machine, rng, new ModernDataCollector(), payload, (message) =>
  parentPort!.postMessage(message),
)
