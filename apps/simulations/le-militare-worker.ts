import { parentPort, workerData } from 'node:worker_threads'
import { mt19937 } from '@tgslots/math'
import { LeMilitareStateMachine } from '@tgslots/le-militare'
import { ModernDataCollector } from '@tgslots/slots-simulation-engine'
import {
  performWarmup,
  runWorkerLoop,
  type WorkerPayload,
} from '@tgslots/slots-simulation-engine/runner'
import { BetConfiguration, Wager } from '@tgslots/slots-core/betting'

const { seed, numSpins, workerId, warmup, snapshotBatchSize, betMultiplier, betConfig } =
  workerData as WorkerPayload

const rng = mt19937(seed)

const bConfig = new BetConfiguration(
  betConfig.baseCost,
  betConfig.lineCount,
  betConfig.costPerLine,
  betConfig.sideBetBase,
)
const wager = new Wager(betMultiplier, bConfig)

const sm = new LeMilitareStateMachine()
performWarmup(sm, rng, warmup, wager)

runWorkerLoop(
  sm,
  rng,
  new ModernDataCollector(),
  {
    numSpins,
    snapshotBatchSize,
    workerId,
    betMultiplier,
    betConfig,
  },
  (msg) => parentPort!.postMessage(msg),
)
