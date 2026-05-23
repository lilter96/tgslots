import { describe, expect, it } from 'bun:test'

import { Metrics, ModernDataCollector } from '../core/state-machine.js'
import { formatJson } from '../cli/formatter.js'
import { renderComparisons } from '../visualizer/sections/comparisons.js'

describe('formatMetricNumber multiplier path', () => {
  it('formats multiplier metrics in comparisons', () => {
    const collector = new ModernDataCollector()
    collector.beginRound(100)
    collector.collect({ type: 'BASE', win: 200 })
    collector.endRound()
    const metrics = Metrics.finalize(collector.getRawMetrics())

    const report = formatJson(
      metrics,
      {
        comparisons: [
          {
            id: 'max-win-mul',
            label: 'Max Win Multiplier',
            expected: 2.0,
            source: { kind: 'summary', key: 'maxRoundWinMultiplier' },
            format: 'multiplier',
          },
        ],
      },
      'test',
      100,
    )
    const html = renderComparisons(report)
    expect(html).toContain('2.00x')
  })
})

describe('formatActual number path (no format specified)', () => {
  it('renders with number format when format is number or default', () => {
    const collector = new ModernDataCollector()
    collector.beginRound(100)
    collector.collect({ type: 'BASE', win: 50 })
    collector.endRound()
    const metrics = Metrics.finalize(collector.getRawMetrics())

    const report = formatJson(
      metrics,
      {
        comparisons: [
          {
            id: 'rounds',
            label: 'Rounds',
            expected: 1,
            source: { kind: 'summary', key: 'rounds' },
            format: 'number',
          },
          {
            id: 'avg-bet',
            label: 'Avg Bet',
            expected: 100,
            source: { kind: 'summary', key: 'averageBet' },
            format: 'number',
          },
        ],
      },
      'test',
      100,
    )
    const html = renderComparisons(report)
    expect(html).toContain('Rounds')
    expect(html).toContain('Avg Bet')
  })

  it('renders comparison with no tolerance (bandPositions fall-through)', () => {
    const collector = new ModernDataCollector()
    collector.beginRound(100)
    collector.collect({ type: 'BASE', win: 50 })
    collector.endRound()
    const metrics = Metrics.finalize(collector.getRawMetrics())

    const report = formatJson(
      metrics,
      {
        comparisons: [
          {
            id: 'no-tol',
            label: 'No Tolerance',
            expected: 1,
            source: { kind: 'summary', key: 'rounds' },
          },
        ],
      },
      'test',
      100,
    )
    const html = renderComparisons(report)
    expect(html).toContain('No Tolerance')
    expect(html).toContain('INFO') // null passed shows INFO
  })
})

describe('describeSource for summary kind', () => {
  it('renders summary comparison descriptions', () => {
    const collector = new ModernDataCollector()
    collector.beginRound(100)
    collector.collect({ type: 'BASE', win: 50 })
    collector.endRound()
    const metrics = Metrics.finalize(collector.getRawMetrics())

    const report = formatJson(
      metrics,
      {
        comparisons: [
          {
            id: 'rtp',
            label: 'RTP',
            expected: 0.5,
            source: { kind: 'summary', key: 'rtp' },
            tolerance: { type: 'absolute', value: 0.01 },
          },
        ],
      },
      'test',
      100,
    )
    const html = renderComparisons(report)
    expect(html).toContain('summary.rtp')
  })
})
