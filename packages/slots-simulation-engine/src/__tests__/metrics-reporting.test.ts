import { describe, expect, it } from 'bun:test'
import type { Rng } from '@tgslots/math/rng/types'
import { BetConfiguration, Wager } from '@tgslots/slots-core/betting'
import {
  Metrics,
  ModernDataCollector,
  runCycle,
  type DataCollector,
  type RoundMetricsSnapshot,
  type SpinResult,
  type StateMachine,
  type WinComponents,
} from '../core/state-machine.js'
import { evaluateComparisons } from '../cli/comparison.js'

interface StubResult extends SpinResult {
  scatters: number
  isTrigger: boolean
  isRetrigger?: boolean
  components?: WinComponents
}

class StubStateMachine implements StateMachine<StubResult, { emitted: boolean }> {
  readonly state = { emitted: false }

  spin(): StubResult {
    this.state.emitted = false
    return {
      type: 'BASE',
      win: 20,
      isTrigger: true,
      scatters: 3,
      components: { total: 20 }
    }
  }

  next(): StubResult | null {
    if (this.state.emitted) return null
    this.state.emitted = true
    return {
      type: 'FREE',
      win: 30,
      isTrigger: false,
      isRetrigger: false,
      scatters: 1,
      components: { total: 30 }
    }
  }

  recordResultMetrics(
    collector: DataCollector,
    result: StubResult,
    _context: { phase: 'spin' | 'next'; wager: Wager },
  ): void {
    const featureScope = collector.scope(['features', 'free-spins'])
    if (result.type === 'BASE' && result.isTrigger) {
      featureScope.count('triggers')
      featureScope.value('awarded-spins', 10)
      return
    }

    if (result.type === 'FREE') {
      featureScope.count('spins')
      featureScope.payout('spin-win', result.win)
    }
  }

  recordRoundMetrics(
    collector: DataCollector,
    round: RoundMetricsSnapshot,
    _wager: Wager,
  ): void {
    collector.scope(['features', 'free-spins']).payout('bonus-payout', round.winsByType.FREE?.total ?? 0, round.bet)
  }
}

describe('simulation metrics reporting', () => {
  const rng: Rng = (min) => min
  const wager = new Wager(1, new BetConfiguration(100, 10, 10, 0))

  it('finalizes generic scoped metrics from collector hooks', () => {
    const collector = new ModernDataCollector()
    runCycle(new StubStateMachine(), rng, collector, wager)

    const metrics = Metrics.finalize(collector.getRawMetrics())
    const freeSpins = metrics.scopes.scopes.features?.scopes['free-spins']

    expect(metrics.summary.rounds).toBe(1)
    expect(metrics.summary.totalWin).toBe(50)
    expect(metrics.summary.rtp).toBe(0.5)
    expect(metrics.summary.roundWinDistribution.buckets['<1x']?.count).toBe(1)
    expect(metrics.summary.resultTypeDistribution.buckets.base?.count).toBe(1)
    expect(metrics.summary.resultTypeDistribution.buckets.free?.count).toBe(1)

    expect(freeSpins?.metrics.triggers).toEqual({
      kind: 'count',
      total: 1,
      rate: 1,
      cycle: 1,
    })
    expect(freeSpins?.metrics['bonus-payout']).toEqual({
      kind: 'payout',
      count: 1,
      total: 30,
      average: 30,
      min: 30,
      max: 30,
      denominatorTotal: 100,
      ratio: 0.3,
    })
  })

  it('merges raw scoped metrics across workers', () => {
    const left = new ModernDataCollector()
    const right = new ModernDataCollector()

    runCycle(new StubStateMachine(), rng, left, wager)
    runCycle(new StubStateMachine(), rng, right, wager)

    const merged = Metrics.finalize(Metrics.merge(left.getRawMetrics(), right.getRawMetrics()))
    const freeSpins = merged.scopes.scopes.features?.scopes['free-spins']

    expect(merged.summary.rounds).toBe(2)
    expect(merged.summary.totalWin).toBe(100)
    expect(freeSpins?.metrics.triggers).toEqual({
      kind: 'count',
      total: 2,
      rate: 1,
      cycle: 1,
    })
  })

  it('evaluates normalized comparisons against summary and scoped metrics', () => {
    const collector = new ModernDataCollector()
    runCycle(new StubStateMachine(), rng, collector, wager)

    const metrics = Metrics.finalize(collector.getRawMetrics())
    const comparisons = evaluateComparisons(metrics, {
      metadata: { bet: 100 },
      comparisons: [
        {
          id: 'rtp',
          label: 'Total RTP',
          expected: 0.5,
          source: { kind: 'summary', key: 'rtp' },
          tolerance: { type: 'absolute', value: 0.0001 },
          format: 'percent',
        },
        {
          id: 'trigger-cycle',
          label: 'Free Spin Trigger Cycle',
          expected: 1,
          source: {
            kind: 'scope',
            scope: ['features', 'free-spins'],
            metric: 'triggers',
            field: 'cycle',
          },
          tolerance: { type: 'relative', value: 0 },
        },
        {
          id: 'feature-payout',
          label: 'Feature Payout',
          expected: 30,
          source: {
            kind: 'scope',
            scope: ['features', 'free-spins'],
            metric: 'bonus-payout',
            field: 'average',
          },
        },
      ],
    })

    expect(comparisons).toHaveLength(3)
    expect(comparisons[0]).toMatchObject({ actual: 0.5, passed: true })
    expect(comparisons[1]).toMatchObject({ actual: 1, passed: true })
    expect(comparisons[2]).toMatchObject({ actual: 30, passed: null })
  })
})
