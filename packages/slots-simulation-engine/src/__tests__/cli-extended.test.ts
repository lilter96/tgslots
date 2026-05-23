import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import { Metrics, ModernDataCollector } from '../core/state-machine.js'
import { type ParsheetConfig } from '../cli/comparison.js'
import { printSimHeader, printSimResult, runAndPrint, type SimCliOpts } from '../cli/index.js'
import type { SimulationMetrics } from '../core/state-machine.js'
import type { SimRunnerResult } from '../runner/index.js'
import { BetConfiguration } from '@tgslots/slots-core/betting'

beforeEach(() => {
  process.exitCode = undefined
})

afterEach(() => {
  process.exitCode = undefined
})

function makeMetrics(): SimulationMetrics {
  const collector = new ModernDataCollector()
  collector.beginRound(100)
  collector.collect({ type: 'BASE', win: 50 })
  collector.endRound()
  collector.beginRound(100)
  collector.collect({ type: 'BASE', win: 120, components: { total: 120, scatter: 30, lines: 90 } })
  collector.endRound()

  const featScope = collector.scope(['features', 'free-spins'])
  featScope.count('triggers', 2)
  featScope.count('spins-played', 5)
  featScope.payout('spin-win', 80)
  featScope.rtp('feature-rtp', 80)

  // Create scope metric with non-null cycle for printVerification
  collector.scope('features').distribution('scatter-count', '3', 2)

  return Metrics.finalize(collector.getRawMetrics())
}

describe('printSimHeader extended', () => {
  it('shows multi-thread workers label', () => {
    const lines: string[] = []
    const orig = console.log
    console.log = (...args: string[]) => lines.push(args.map(String).join(' '))
    try {
      printSimHeader(
        { spins: 100_000_000, workers: 8, seed: 1, mode: 'verify' } as SimCliOpts,
        'game',
      )
    } finally {
      console.log = orig
    }
    expect(lines.some((l) => l.includes('workers=8 (parallel)'))).toBe(true)
    expect(lines.some((l) => l.includes('verify'))).toBe(true)
  })

  it('formats billions of spins', () => {
    const lines: string[] = []
    const orig = console.log
    console.log = (...args: string[]) => lines.push(args.map(String).join(' '))
    try {
      printSimHeader(
        { spins: 2_000_000_000, workers: 1, seed: 1, mode: 'benchmark' } as SimCliOpts,
        'game',
      )
    } finally {
      console.log = orig
    }
    expect(lines.some((l) => l.includes('2.0B'))).toBe(true)
  })
})

describe('printSimResult', () => {
  it('outputs JSON when json flag is set', async () => {
    const lines: string[] = []
    const orig = console.log
    console.log = (...args: string[]) => lines.push(args.map(String).join(' '))
    try {
      const metrics = makeMetrics()
      const result: SimRunnerResult = { metrics, wallTime: 2000, workerTimes: [1000, 1000] }
      const parsheet: ParsheetConfig = {
        comparisons: [
          {
            id: 'rtp',
            label: 'RTP',
            expected: metrics.summary.rtp,
            source: { kind: 'summary', key: 'rtp' },
            tolerance: { type: 'absolute', value: 0.001 },
            format: 'percent',
          },
        ],
      }
      await printSimResult(
        result,
        parsheet,
        { json: true, mode: 'verify' } as SimCliOpts,
        'test-game',
      )
    } finally {
      console.log = orig
    }
    // console.log was called with JSON string
    const output = lines.join('\n')
    expect(output).toContain('test-game')
    expect(output).toContain('schemaVersion')
  })

  it('outputs non-JSON pretty format without json flag', async () => {
    const lines: string[] = []
    const orig = console.log
    console.log = (...args: string[]) => lines.push(args.map(String).join(' '))
    try {
      const metrics = makeMetrics()
      const result: SimRunnerResult = { metrics, wallTime: 2000, workerTimes: [1000, 1000] }
      const parsheet: ParsheetConfig = { comparisons: [] }
      await printSimResult(
        result,
        parsheet,
        { json: false, mode: 'benchmark' } as SimCliOpts,
        'test-game',
      )
    } finally {
      console.log = orig
    }
    const output = lines.join('\n')
    expect(output).toContain('SIMULATION REPORT')
    expect(output).toContain('TEST-GAME')
  })

  it('triggers verification printing in verify mode', async () => {
    const lines: string[] = []
    const orig = console.log
    console.log = (...args: string[]) => lines.push(args.map(String).join(' '))
    try {
      const metrics = makeMetrics()
      const result: SimRunnerResult = { metrics, wallTime: 2000, workerTimes: [1000, 1000] }
      // Use exact matches so verification passes and doesn't set exitCode=1
      const parsheet: ParsheetConfig = {
        comparisons: [
          {
            id: 'rtp',
            label: 'RTP',
            expected: metrics.summary.rtp,
            source: { kind: 'summary', key: 'rtp' },
            tolerance: { type: 'absolute', value: 0.001 },
            format: 'percent',
          },
          {
            id: 'rounds',
            label: 'Rounds',
            expected: 2,
            source: { kind: 'summary', key: 'rounds' },
            tolerance: { type: 'absolute', value: 0 },
          },
        ],
      }
      await printSimResult(
        result,
        parsheet,
        { json: false, mode: 'verify' } as SimCliOpts,
        'test-game',
      )
    } finally {
      console.log = orig
    }
    const output = lines.join('\n')
    expect(output).toContain('VERIFICATION RESULTS')
  })
})

describe('printSimResult JSON output paths', () => {
  it('writes to file with jsonOutput flag', async () => {
    const tmpFile = `/tmp/tgslots-test-output-${Date.now()}.json`
    const metrics = makeMetrics()
    const result: SimRunnerResult = { metrics, wallTime: 2000, workerTimes: [1000] }
    const parsheet: ParsheetConfig = {
      comparisons: [
        {
          id: 'rtp',
          label: 'RTP',
          expected: metrics.summary.rtp,
          source: { kind: 'summary', key: 'rtp' },
          tolerance: { type: 'absolute', value: 0.001 },
        },
      ],
    }

    try {
      await printSimResult(
        result,
        parsheet,
        { json: false, jsonOutput: tmpFile, mode: 'benchmark' } as SimCliOpts,
        'test-game',
      )

      const fs = await import('node:fs')
      expect(fs.existsSync(tmpFile)).toBe(true)
      const content = fs.readFileSync(tmpFile, 'utf-8')
      expect(content).toContain('test-game')
    } finally {
      const fs = await import('node:fs')
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
    }
  })

  it('visualizes to HTML file with visualize flag', async () => {
    const tmpFile = `/tmp/tgslots-test-viz-${Date.now()}.html`
    const metrics = makeMetrics()
    const result: SimRunnerResult = { metrics, wallTime: 2000, workerTimes: [1000] }
    const parsheet: ParsheetConfig = {
      comparisons: [
        {
          id: 'rtp',
          label: 'RTP',
          expected: metrics.summary.rtp,
          source: { kind: 'summary', key: 'rtp' },
          tolerance: { type: 'absolute', value: 0.001 },
        },
      ],
    }

    try {
      await printSimResult(
        result,
        parsheet,
        { json: false, visualize: tmpFile, mode: 'benchmark' } as SimCliOpts,
        'test-game',
      )

      const fs = await import('node:fs')
      expect(fs.existsSync(tmpFile)).toBe(true)
      const content = fs.readFileSync(tmpFile, 'utf-8')
      expect(content).toContain('<!doctype html>')
      expect(content).toContain('test-game')
    } finally {
      const fs = await import('node:fs')
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
    }
  })
})

describe('runAndPrint', () => {
  it('returns immediately when mode is sample', async () => {
    // Should not throw or call runSimulation
    await runAndPrint(
      new URL('file:///nonexistent.js'),
      { mode: 'sample' } as SimCliOpts,
      { comparisons: [] },
      'test-game',
    )
    // If it doesn't throw, the sample mode guard works
  })

  it('prints "Spawning" message when workers > 1 and not json', async () => {
    const lines: string[] = []
    const orig = console.log
    console.log = (...args: string[]) => lines.push(args.map(String).join(' '))

    try {
      // spins: 0 triggers immediate return in runSimulation (no workers spawned)
      await runAndPrint(
        new URL('file:///nonexistent.js'),
        {
          mode: 'benchmark',
          spins: 0,
          workers: 4,
          json: false,
        } as SimCliOpts,
        { comparisons: [] },
        'test-game',
        new BetConfiguration(100, 10, 10, 0),
      )
    } finally {
      console.log = orig
    }

    // The "Spawning workers" message is printed before runSimulation
    const output = lines.join('\n')
    expect(output).toContain('Spawning')
    expect(output).toContain('4')
  })
})
