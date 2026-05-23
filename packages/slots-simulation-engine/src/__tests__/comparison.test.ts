import { describe, expect, it } from 'bun:test'

import { Metrics, ModernDataCollector } from '../core/state-machine.js'
import {
  evaluateComparisons,
  normalizeParsheetConfig,
  type ParsheetConfig,
} from '../cli/comparison.js'

describe('normalizeParsheetConfig', () => {
  it('passes through already-normalized configs', () => {
    const input: ParsheetConfig = {
      metadata: { bet: 100 },
      comparisons: [
        {
          id: 'rtp',
          label: 'Total RTP',
          expected: 0.96,
          source: { kind: 'summary', key: 'rtp' },
          tolerance: { type: 'absolute', value: 0.005 },
          format: 'percent',
        },
      ],
    }
    const result = normalizeParsheetConfig(input)
    expect(result.metadata).toEqual({ bet: 100 })
    expect(result.comparisons).toHaveLength(1)
    expect(result.comparisons[0]!.id).toBe('rtp')
  })

  it('applies default number format to comparisons without explicit format', () => {
    const input: ParsheetConfig = {
      comparisons: [
        {
          id: 'count',
          label: 'Rounds',
          expected: 1000,
          source: { kind: 'summary', key: 'rounds' },
        },
      ],
    }
    const result = normalizeParsheetConfig(input)
    expect(result.comparisons[0]!.format).toBe('number')
  })

  it('converts legacy parsheet with targetRTP only', () => {
    const legacy: ParsheetConfig = {
      bet: 100,
      targetRTP: 0.96,
    }
    const result = normalizeParsheetConfig(legacy)
    expect(result.comparisons).toHaveLength(1)
    expect(result.comparisons[0]!.id).toBe('total-rtp')
    expect(result.comparisons[0]!.expected).toBe(0.96)
    expect(result.comparisons[0]!.tolerance).toEqual({ type: 'absolute', value: 0.005 })
    expect(result.comparisons[0]!.format).toBe('percent')
    expect(result.comparisons[0]!.source).toEqual({ kind: 'summary', key: 'rtp' })
    expect(result.metadata).toEqual({ bet: 100, source: 'legacy-inline' })
  })

  it('converts legacy parsheet with scatterCycle and featurePayout', () => {
    const legacy: ParsheetConfig = {
      bet: 50,
      targetRTP: 0.92,
      scatterCycle: 120,
      featurePayout: 500,
      rtpTolerance: 0.01,
      scatterTolerance: 0.1,
    }
    const result = normalizeParsheetConfig(legacy)

    expect(result.comparisons).toHaveLength(3)

    const triggerCycle = result.comparisons.find((c) => c.id === 'feature-trigger-cycle')
    expect(triggerCycle).toBeDefined()
    expect(triggerCycle!.expected).toBe(120)
    expect(triggerCycle!.tolerance).toEqual({ type: 'relative', value: 0.1 })
    expect(triggerCycle!.source).toEqual({
      kind: 'scope',
      scope: ['features', 'free-spins'],
      metric: 'triggers',
      field: 'cycle',
    })

    const featurePayout = result.comparisons.find((c) => c.id === 'feature-payout')
    expect(featurePayout).toBeDefined()
    expect(featurePayout!.expected).toBe(500)
    expect(featurePayout!.source).toEqual({
      kind: 'scope',
      scope: ['features', 'free-spins'],
      metric: 'bonus-payout',
      field: 'average',
    })
  })

  it('legacy parsheet without scatterCycle omits that comparison', () => {
    const legacy: ParsheetConfig = { bet: 100, targetRTP: 0.96, featurePayout: 200 }
    const result = normalizeParsheetConfig(legacy)
    expect(result.comparisons.find((c) => c.id === 'feature-trigger-cycle')).toBeUndefined()
    expect(result.comparisons.find((c) => c.id === 'feature-payout')).toBeDefined()
  })

  it('legacy parsheet without featurePayout omits that comparison', () => {
    const legacy: ParsheetConfig = { bet: 100, targetRTP: 0.96, scatterCycle: 100 }
    const result = normalizeParsheetConfig(legacy)
    expect(result.comparisons.find((c) => c.id === 'feature-payout')).toBeUndefined()
    expect(result.comparisons.find((c) => c.id === 'feature-trigger-cycle')).toBeDefined()
  })
})

describe('evaluateComparisons', () => {
  function emptyMetrics() {
    return Metrics.finalize(Metrics.emptyRaw())
  }

  it('evaluates summary rtp comparison', () => {
    const collector = new ModernDataCollector()
    collector.beginRound(100)
    collector.collect({ type: 'BASE', win: 95 })
    collector.endRound()

    const metrics = Metrics.finalize(collector.getRawMetrics())
    const results = evaluateComparisons(metrics, {
      comparisons: [
        {
          id: 'total-rtp',
          label: 'Total RTP',
          expected: 0.95,
          source: { kind: 'summary', key: 'rtp' },
          tolerance: { type: 'absolute', value: 0.0001 },
          format: 'percent',
        },
      ],
    })

    expect(results[0]!.actual).toBe(0.95)
    expect(results[0]!.passed).toBe(true)
  })

  it('evaluates all summary keys', () => {
    const collector = new ModernDataCollector()
    collector.beginRound(100)
    collector.collect({ type: 'BASE', win: 200 })
    collector.endRound()

    const metrics = Metrics.finalize(collector.getRawMetrics())
    const keys: Array<{
      kind: 'summary'
      key:
        | 'rounds'
        | 'totalBet'
        | 'totalWin'
        | 'averageBet'
        | 'averageRoundWin'
        | 'totalSpinResults'
        | 'maxRoundWin'
        | 'maxRoundWinMultiplier'
        | 'variance'
        | 'stdDev'
    }> = [
      { kind: 'summary', key: 'rounds' },
      { kind: 'summary', key: 'totalBet' },
      { kind: 'summary', key: 'totalWin' },
      { kind: 'summary', key: 'averageBet' },
      { kind: 'summary', key: 'averageRoundWin' },
      { kind: 'summary', key: 'totalSpinResults' },
      { kind: 'summary', key: 'maxRoundWin' },
      { kind: 'summary', key: 'maxRoundWinMultiplier' },
      { kind: 'summary', key: 'variance' },
      { kind: 'summary', key: 'stdDev' },
    ]

    for (const source of keys) {
      const results = evaluateComparisons(metrics, {
        comparisons: [
          {
            id: source.key,
            label: source.key,
            expected: 0,
            source,
          },
        ],
      })
      expect(results[0]!.actual).not.toBeNull()
    }
  })

  it('fails when actual is outside absolute tolerance', () => {
    const collector = new ModernDataCollector()
    collector.beginRound(100)
    collector.collect({ type: 'BASE', win: 50 })
    collector.endRound()

    const metrics = Metrics.finalize(collector.getRawMetrics())
    const results = evaluateComparisons(metrics, {
      comparisons: [
        {
          id: 'rtp',
          label: 'RTP',
          expected: 0.9,
          source: { kind: 'summary', key: 'rtp' },
          tolerance: { type: 'absolute', value: 0.1 },
          format: 'percent',
        },
      ],
    })

    // RTP = 0.5, expected = 0.9, delta = 0.4, tolerance = 0.1 => fail
    expect(results[0]!.passed).toBe(false)
    expect(results[0]!.delta).toBe(-0.4)
  })

  it('fails when actual is outside relative tolerance', () => {
    const collector = new ModernDataCollector()
    collector.beginRound(100)
    collector.collect({ type: 'BASE', win: 50 })
    collector.endRound()

    const metrics = Metrics.finalize(collector.getRawMetrics())
    const results = evaluateComparisons(metrics, {
      comparisons: [
        {
          id: 'rtp',
          label: 'RTP',
          expected: 0.5,
          source: { kind: 'summary', key: 'rtp' },
          tolerance: { type: 'relative', value: 0.1 },
          format: 'percent',
        },
      ],
    })

    expect(results[0]!.passed).toBe(true)
    expect(results[0]!.relativeDelta).toBe(0)
  })

  it('marks passed null when no tolerance', () => {
    const results = evaluateComparisons(emptyMetrics(), {
      comparisons: [
        {
          id: 'rounds',
          label: 'Rounds',
          expected: 0,
          source: { kind: 'summary', key: 'rounds' },
        },
      ],
    })

    expect(results[0]!.actual).toBe(0)
    expect(results[0]!.passed).toBeNull()
  })

  it('marks passed null when actual is null (missing scope)', () => {
    const results = evaluateComparisons(emptyMetrics(), {
      comparisons: [
        {
          id: 'missing-scope',
          label: 'Missing Scope',
          expected: 5,
          source: {
            kind: 'scope',
            scope: ['nonexistent', 'scope'],
            metric: 'fake',
            field: 'total',
          },
          tolerance: { type: 'absolute', value: 1 },
        },
      ],
    })

    expect(results[0]!.actual).toBeNull()
    expect(results[0]!.delta).toBeNull()
    expect(results[0]!.relativeDelta).toBeNull()
    expect(results[0]!.passed).toBeNull()
  })

  it('resolves count metric fields (total, rate, cycle)', () => {
    const collector = new ModernDataCollector()
    collector.beginRound(100)
    collector.collect({ type: 'BASE', win: 0 })
    collector.endRound()
    collector.scope('features').count('hits', 1)

    const metrics = Metrics.finalize(collector.getRawMetrics())

    const totalCheck = evaluateComparisons(metrics, {
      comparisons: [
        {
          id: 'hits-total',
          label: 'Hits Total',
          expected: 1,
          source: { kind: 'scope', scope: ['features'], metric: 'hits', field: 'total' },
        },
        {
          id: 'hits-rate',
          label: 'Hits Rate',
          expected: 1,
          source: { kind: 'scope', scope: ['features'], metric: 'hits', field: 'rate' },
        },
        {
          id: 'hits-cycle',
          label: 'Hits Cycle',
          expected: 1,
          source: { kind: 'scope', scope: ['features'], metric: 'hits', field: 'cycle' },
        },
      ],
    })

    expect(totalCheck[0]!.actual).toBe(1)
    expect(totalCheck[1]!.actual).toBe(1)
    expect(totalCheck[2]!.actual).toBe(1)
  })

  it('resolves count metric with default field (total)', () => {
    const collector = new ModernDataCollector()
    collector.beginRound(100)
    collector.collect({ type: 'BASE', win: 0 })
    collector.endRound()
    collector.scope('features').count('hits')

    const metrics = Metrics.finalize(collector.getRawMetrics())
    const results = evaluateComparisons(metrics, {
      comparisons: [
        {
          id: 'hits',
          label: 'Hits',
          expected: 1,
          source: { kind: 'scope', scope: ['features'], metric: 'hits' },
        },
      ],
    })

    expect(results[0]!.actual).toBe(1)
  })

  it('resolves value metric fields (total/sum, average, min, max)', () => {
    const collector = new ModernDataCollector()
    collector.beginRound(100)
    collector.collect({ type: 'BASE', win: 0 })
    collector.endRound()
    collector.value('test-val', 42)

    const metrics = Metrics.finalize(collector.getRawMetrics())

    const cases = [
      { field: 'total' as const, expected: 42 },
      { field: 'sum' as const, expected: 42 },
      { field: 'average' as const, expected: 42 },
      { field: 'min' as const, expected: 42 },
      { field: 'max' as const, expected: 42 },
    ]

    for (const c of cases) {
      const results = evaluateComparisons(metrics, {
        comparisons: [
          {
            id: `val-${c.field}`,
            label: c.field,
            expected: c.expected,
            source: { kind: 'scope', scope: [], metric: 'test-val', field: c.field },
          },
        ],
      })
      expect(results[0]!.actual).toBe(c.expected)
    }
  })

  it('resolves payout metric fields (total, average, min, max)', () => {
    const collector = new ModernDataCollector()
    collector.beginRound(100)
    collector.collect({ type: 'BASE', win: 0 })
    collector.endRound()
    collector.payout('spin-payout', 100)

    const metrics = Metrics.finalize(collector.getRawMetrics())

    const cases = [
      { field: 'total' as const, expected: 100 },
      { field: 'average' as const, expected: 100 },
      { field: 'min' as const, expected: 100 },
      { field: 'max' as const, expected: 100 },
    ]

    for (const c of cases) {
      const results = evaluateComparisons(metrics, {
        comparisons: [
          {
            id: `payout-${c.field}`,
            label: c.field,
            expected: c.expected,
            source: { kind: 'scope', scope: [], metric: 'spin-payout', field: c.field },
          },
        ],
      })
      expect(results[0]!.actual).toBe(c.expected)
    }
  })

  it('resolves rtp metric fields (total, ratio)', () => {
    const collector = new ModernDataCollector()
    collector.beginRound(100)
    collector.collect({ type: 'BASE', win: 50 })
    collector.endRound()
    collector.rtp('test-rtp', 50)

    const metrics = Metrics.finalize(collector.getRawMetrics())

    const totalResult = evaluateComparisons(metrics, {
      comparisons: [
        {
          id: 'rtp-total',
          label: 'RTP Total',
          expected: 50,
          source: { kind: 'scope', scope: [], metric: 'test-rtp', field: 'total' },
        },
      ],
    })
    expect(totalResult[0]!.actual).toBe(50)

    const ratioResult = evaluateComparisons(metrics, {
      comparisons: [
        {
          id: 'rtp-ratio',
          label: 'RTP Ratio',
          expected: 0.5,
          source: { kind: 'scope', scope: [], metric: 'test-rtp', field: 'ratio' },
        },
      ],
    })
    expect(ratioResult[0]!.actual).toBe(0.5)
  })

  it('resolves rtp metric with default field (total)', () => {
    const collector = new ModernDataCollector()
    collector.beginRound(100)
    collector.collect({ type: 'BASE', win: 50 })
    collector.endRound()
    collector.rtp('test-rtp', 50)

    const metrics = Metrics.finalize(collector.getRawMetrics())
    const results = evaluateComparisons(metrics, {
      comparisons: [
        {
          id: 'rtp',
          label: 'RTP',
          expected: 50,
          source: { kind: 'scope', scope: [], metric: 'test-rtp' },
        },
      ],
    })
    expect(results[0]!.actual).toBe(50)
  })

  it('resolves distribution metric (total only)', () => {
    const collector = new ModernDataCollector()
    collector.beginRound(100)
    collector.collect({ type: 'BASE', win: 0 })
    collector.endRound()
    collector.distribution('dist', 'bucket-a', 3)
    collector.distribution('dist', 'bucket-b', 2)

    const metrics = Metrics.finalize(collector.getRawMetrics())
    const results = evaluateComparisons(metrics, {
      comparisons: [
        {
          id: 'dist-total',
          label: 'Dist Total',
          expected: 5,
          source: { kind: 'scope', scope: [], metric: 'dist', field: 'total' },
        },
      ],
    })

    expect(results[0]!.actual).toBe(5)
  })

  it('infers category from comparison id', () => {
    const results = evaluateComparisons(emptyMetrics(), {
      comparisons: [
        { id: 'total-rtp', label: 'RTP', expected: 0, source: { kind: 'summary', key: 'rtp' } },
        { id: 'my-cycle', label: 'Cycle', expected: 0, source: { kind: 'summary', key: 'rounds' } },
        { id: 'avg-win', label: 'Avg', expected: 0, source: { kind: 'summary', key: 'rounds' } },
        {
          id: 'some-count',
          label: 'Count',
          expected: 0,
          source: { kind: 'scope', scope: [], metric: 'fake', field: 'total' },
        },
      ],
    })

    expect(results[0]!.category).toBe('rtp')
    expect(results[1]!.category).toBe('cycle')
    expect(results[2]!.category).toBe('average')
    expect(results[3]!.category).toBe('distribution')
  })

  it('infers category as count for scope with non-total field', () => {
    const results = evaluateComparisons(emptyMetrics(), {
      comparisons: [
        {
          id: 'something',
          label: 'Something',
          expected: 0,
          source: { kind: 'scope', scope: [], metric: 'fake', field: 'average' },
        },
      ],
    })
    expect(results[0]!.category).toBe('count')
  })

  it('relativeDelta is null when expected is zero', () => {
    const collector = new ModernDataCollector()
    collector.beginRound(100)
    collector.collect({ type: 'BASE', win: 50 })
    collector.endRound()

    const metrics = Metrics.finalize(collector.getRawMetrics())
    const results = evaluateComparisons(metrics, {
      comparisons: [
        {
          id: 'test',
          label: 'Test',
          expected: 0,
          source: { kind: 'summary', key: 'totalWin' },
        },
      ],
    })

    expect(results[0]!.actual).toBe(50)
    expect(results[0]!.delta).toBe(50)
    expect(results[0]!.relativeDelta).toBeNull()
  })
})
