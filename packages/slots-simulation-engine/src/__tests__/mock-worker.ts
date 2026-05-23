import { parentPort, workerData } from 'node:worker_threads'

const { numSpins, workerId } = workerData

parentPort?.postMessage({
  metrics: {
    rounds: numSpins,
    totalBet: 0,
    totalWin: 0,
    totalSpinResults: numSpins,
    maxRoundWin: 0,
    maxRoundWinMultiplier: 0,
    sumRoundWinMultiplier: 0,
    sumSquaresRoundWinMultiplier: 0,
    rootScope: { metrics: {}, scopes: {} },
  },
  workerId,
  final: true,
  spinsProcessed: numSpins,
  elapsed: 5,
})
