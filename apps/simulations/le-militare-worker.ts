import { parentPort, workerData } from 'node:worker_threads'
import { mt19937 } from '@tgslots/math'
import { LeMilitareStateMachine, DEFAULT_MODE, MODE_IDS } from '@tgslots/le-militare'
import type { ModeId } from '@tgslots/le-militare'
import { ModernDataCollector } from '@tgslots/slots-simulation-engine'
import {
  performWarmup,
  runWorkerLoop,
  type WorkerPayload,
} from '@tgslots/slots-simulation-engine/runner'
import { BetConfiguration, Wager } from '@tgslots/slots-core/betting'

const {
  seed,
  numSpins,
  workerId,
  warmup,
  snapshotBatchSize,
  betMultiplier,
  betConfig,
  gameConfig,
} = workerData as WorkerPayload

const rng = mt19937(seed)

const bConfig = new BetConfiguration(
  betConfig.baseCost,
  betConfig.lineCount,
  betConfig.costPerLine,
  betConfig.sideBetBase,
)
const wager = new Wager(betMultiplier, bConfig)

const modeFromConfig = gameConfig?.mode as ModeId | undefined
const mode: ModeId =
  modeFromConfig && MODE_IDS.includes(modeFromConfig) ? modeFromConfig : DEFAULT_MODE

const sm = new LeMilitareStateMachine(undefined, mode)
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
