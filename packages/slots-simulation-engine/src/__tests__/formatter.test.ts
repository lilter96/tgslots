import { describe, expect, it } from 'bun:test'

import { Metrics, ModernDataCollector } from '../core/state-machine.js'
import { formatJson, formatPretty, type SimulationJsonReport } from '../cli/formatter.js'

function sampleReport(): SimulationJsonReport {
  const collector = new ModernDataCollector()
  collector.beginRound(100)
  collector.collect({ type: 'BASE', win: 50 })
  collector.collect({ type: 'FREE', win: 30 })
  collector.endRound()
  collector.beginRound(100)
  collector.collect({ type: 'BASE', win: 150 })
  collector.endRound()
  const metrics = Metrics.finalize(collector.getRawMetrics())
  return formatJson(metrics, { bet: 100, targetRTP: 0.96 }, 'test-game', 1500)
}

describe('formatJson', () => {
  it('produces schema version 2', () => {
    const report = sampleReport()
    expect(report.schemaVersion).toBe(2)
  })

  it('sets game name in meta', () => {
    const report = sampleReport()
    expect(report.meta.game).toBe('test-game')
  })

  it('calculates wallMs, throughput, and usPerSpin', () => {
    const report = sampleReport()
    expect(report.meta.wallMs).toBe(1500)
    expect(report.meta.throughputMps).toBeGreaterThan(0)
    expect(report.meta.usPerSpin).toBeGreaterThan(0)
  })

  it('handles zero wallMs gracefully', () => {
    const collector = new ModernDataCollector()
    collector.beginRound(100)
    collector.collect({ type: 'BASE', win: 0 })
    collector.endRound()
    const metrics = Metrics.finalize(collector.getRawMetrics())
    const report = formatJson(metrics, { bet: 100, targetRTP: 1 }, 'game', 0)
    expect(report.meta.throughputMps).toBe(0)
    expect(report.meta.usPerSpin).toBe(0)
  })

  it('computes throughput and latency with wallMs > 0 and rounds > 0', () => {
    const collector = new ModernDataCollector()
    collector.beginRound(100)
    collector.collect({ type: 'BASE', win: 10 })
    collector.endRound()
    const metrics = Metrics.finalize(collector.getRawMetrics())
    const report = formatJson(metrics, { bet: 100, targetRTP: 0.96 }, 'a', 1000)
    expect(report.meta.throughputMps).toBeCloseTo(0.000001, 12)
    expect(report.meta.usPerSpin).toBeCloseTo(1_000_000, 0)
  })

  it('includes reference metadata from normalized parsheet', () => {
    const report = sampleReport()
    expect(report.reference).toEqual({ bet: 100, source: 'legacy-inline' })
  })

  it('includes summary fields', () => {
    const report = sampleReport()
    expect(report.summary.rounds).toBe(2)
    expect(report.summary.totalWin).toBe(230)
    expect(report.summary.rtp).toBe(1.15)
  })

  it('includes comparisons from evaluateComparisons', () => {
    const report = sampleReport()
    expect(report.comparisons.length).toBeGreaterThan(0)
    expect(report.comparisons[0]!.id).toBe('total-rtp')
  })

  it('includes scopes', () => {
    const report = sampleReport()
    expect(report.scopes).toBeDefined()
    expect(report.scopes.path).toEqual([])
  })
})

describe('formatPretty', () => {
  function captureOutput(fn: () => void): string {
    const lines: string[] = []
    const orig = console.log
    console.log = (...args: string[]) => lines.push(args.map(String).join(' '))
    try {
      fn()
    } finally {
      console.log = orig
    }
    return lines.join('\n')
  }

  it('prints simulation report header with game name', () => {
    const output = captureOutput(() => {
      const collector = new ModernDataCollector()
      collector.beginRound(100)
      collector.collect({ type: 'BASE', win: 50 })
      collector.endRound()
      const metrics = Metrics.finalize(collector.getRawMetrics())
      formatPretty(metrics, { bet: 100, targetRTP: 0.96 }, 'test-game', 1500, { workers: 4 })
    })

    expect(output).toContain('SIMULATION REPORT')
    expect(output).toContain('TEST-GAME')
    expect(output).toContain('RTP')
    expect(output).toContain('Workers')
    expect(output).toContain('4')
    expect(output).toContain('SCOPED METRICS')
  })

  it('shows comparisons when present', () => {
    const output = captureOutput(() => {
      const collector = new ModernDataCollector()
      collector.beginRound(100)
      collector.collect({ type: 'BASE', win: 95 })
      collector.endRound()
      const metrics = Metrics.finalize(collector.getRawMetrics())
      formatPretty(metrics, { bet: 100, targetRTP: 0.96 }, 'test-game', 1500, { workers: 1 })
    })

    expect(output).toContain('COMPARISONS')
    expect(output).toContain('Total RTP')
  })

  it('shows round win distribution bars', () => {
    const output = captureOutput(() => {
      const collector = new ModernDataCollector()
      collector.beginRound(100)
      collector.collect({ type: 'BASE', win: 0 })
      collector.endRound()
      const metrics = Metrics.finalize(collector.getRawMetrics())
      formatPretty(metrics, { bet: 100, targetRTP: 0.96 }, 'test-game', 1500, { workers: 1 })
    })

    expect(output).toContain('ROUND WIN DISTRIBUTION')
    expect(output).toContain('0x')
  })
})
