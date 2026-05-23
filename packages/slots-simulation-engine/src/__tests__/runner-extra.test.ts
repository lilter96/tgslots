import { describe, expect, it } from 'bun:test'

import { runSimulation } from '../runner/index.js'

const mockWorkerUrl = new URL('./mock-worker.ts', import.meta.url)

describe('runSimulation with mock worker', () => {
  it('runs with a simple worker and single thread', async () => {
    const result = await runSimulation(mockWorkerUrl, {
      spins: 10,
      workers: 1,
      seed: 42,
      warmup: 0,
    })

    expect(result.metrics.summary.rounds).toBe(10)
    expect(result.wallTime).toBeGreaterThan(0)
    expect(result.workerTimes).toHaveLength(1)
    expect(result.workerTimes[0]).toBe(5)
  })

  it('runs with multiple workers', async () => {
    const result = await runSimulation(mockWorkerUrl, {
      spins: 20,
      workers: 2,
      seed: 42,
    })

    expect(result.metrics.summary.rounds).toBe(20)
    expect(result.workerTimes).toHaveLength(2)
  })

  it('distributes remainder spins across workers', async () => {
    // 10 spins / 3 workers = 3 each with 1 remainder
    const result = await runSimulation(mockWorkerUrl, {
      spins: 10,
      workers: 3,
      seed: 42,
    })

    expect(result.metrics.summary.rounds).toBe(10)
    expect(result.workerTimes).toHaveLength(3)
  })
})
