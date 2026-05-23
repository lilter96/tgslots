import { describe, expect, it } from 'bun:test'
import type { Rng } from '@tgslots/math/rng/types'
import { BetConfiguration, Wager } from '@tgslots/slots-core/betting'

import { ModernDataCollector, type SpinResult, type StateMachine } from '../core/state-machine.js'
import { performWarmup, runWorkerLoop } from '../runner/index.js'

class SimpleStateMachine implements StateMachine<SpinResult, { count: number }> {
  readonly state = { count: 0 }

  spin(_rng: Rng, _wager: Wager): SpinResult {
    this.state.count++
    return { type: 'BASE', win: 10 }
  }

  next(): SpinResult | null {
    return null
  }
}

class MultiStepStateMachine implements StateMachine<SpinResult, { steps: number }> {
  readonly state = { steps: 0 }

  spin(_rng: Rng, _wager: Wager): SpinResult {
    this.state.steps = 0
    return { type: 'BASE', win: 5 }
  }

  next(): SpinResult | null {
    this.state.steps++
    if (this.state.steps >= 3) return null
    return { type: 'FREE', win: 3 }
  }
}

describe('performWarmup', () => {
  const rng: Rng = (min) => min
  const wager = new Wager(1, new BetConfiguration(100, 10, 10, 0))

  it('runs the state machine the specified number of times', () => {
    const sm = new SimpleStateMachine()
    performWarmup(sm, rng, 10, wager)
    expect(sm.state.count).toBe(10)
  })

  it('handles zero warmup spins', () => {
    const sm = new SimpleStateMachine()
    performWarmup(sm, rng, 0, wager)
    expect(sm.state.count).toBe(0)
  })

  it('calls next() until null for each spin', () => {
    const sm = new MultiStepStateMachine()
    performWarmup(sm, rng, 2, wager)
    // Each spin calls spin() once, then next() 3 times until null
    expect(sm.state.steps).toBe(3)
  })
})

describe('runWorkerLoop', () => {
  const rng: Rng = (min) => min
  const betConfig = {
    baseCost: 100,
    lineCount: 10,
    costPerLine: 10,
    sideBetBase: 0,
  }

  it('processes the configured number of spins', () => {
    const sm = new SimpleStateMachine()
    const collector = new ModernDataCollector()
    const messages: Array<ReturnType<typeof collector.getRawMetrics>> = []

    runWorkerLoop(
      sm,
      rng,
      collector,
      {
        numSpins: 10,
        snapshotBatchSize: 5,
        workerId: 0,
        betMultiplier: 1,
        betConfig,
      },
      (msg) => {
        messages.push(msg.metrics)
      },
    )

    const metrics = collector.getRawMetrics()
    expect(metrics.rounds).toBe(10)
    expect(messages.length).toBeGreaterThanOrEqual(2) // at least two batches
  })

  it('sends final message with elapsed time', () => {
    const sm = new SimpleStateMachine()
    const collector = new ModernDataCollector()
    let finalMsg: { final: boolean; elapsed?: number } = { final: false }

    runWorkerLoop(
      sm,
      rng,
      collector,
      {
        numSpins: 3,
        snapshotBatchSize: 3,
        workerId: 1,
        betMultiplier: 1,
        betConfig,
      },
      (msg) => {
        if (msg.final) finalMsg = { final: msg.final, elapsed: msg.elapsed }
      },
    )

    expect(finalMsg.final).toBe(true)
    expect(typeof finalMsg.elapsed).toBe('number')
  })

  it('sends workerId in messages', () => {
    const sm = new SimpleStateMachine()
    const collector = new ModernDataCollector()

    runWorkerLoop(
      sm,
      rng,
      collector,
      {
        numSpins: 1,
        snapshotBatchSize: 1,
        workerId: 42,
        betMultiplier: 1,
        betConfig,
      },
      (msg) => {
        expect(msg.workerId).toBe(42)
        expect(typeof msg.spinsProcessed).toBe('number')
      },
    )
  })
})
