import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import { parseSimArgs, printSimHeader, type SimCliOpts } from '../cli/index.js'

describe('parseSimArgs', () => {
  let originalArgv: string[]

  beforeEach(() => {
    originalArgv = process.argv
  })

  afterEach(() => {
    process.argv = originalArgv
  })

  it('uses defaults when no args provided', () => {
    process.argv = ['node', 'sim.js']
    const opts = parseSimArgs()
    expect(opts.spins).toBe(10_000_000)
    expect(opts.workers).toBe(1)
    expect(opts.seed).toBe(2024)
    expect(opts.mode).toBe('benchmark')
    expect(opts.json).toBe(false)
    expect(opts.betMultiplier).toBe(1)
  })

  it('allows overriding defaults', () => {
    process.argv = ['node', 'sim.js']
    const opts = parseSimArgs({ spins: 1000, seed: 42, game: 'my-game' })
    expect(opts.spins).toBe(1000)
    expect(opts.seed).toBe(42)
    expect(opts.game).toBe('my-game')
  })

  it('parses --game', () => {
    process.argv = ['node', 'sim.js', '--game', 'ancient-dragon']
    const opts = parseSimArgs()
    expect(opts.game).toBe('ancient-dragon')
  })

  it('parses -g shorthand', () => {
    process.argv = ['node', 'sim.js', '-g', 'woodland-whisper']
    const opts = parseSimArgs()
    expect(opts.game).toBe('woodland-whisper')
  })

  it('parses --spins with K suffix', () => {
    process.argv = ['node', 'sim.js', '--spins', '100K']
    const opts = parseSimArgs()
    expect(opts.spins).toBe(100_000)
  })

  it('parses --spins with M suffix', () => {
    process.argv = ['node', 'sim.js', '--spins', '5M']
    const opts = parseSimArgs()
    expect(opts.spins).toBe(5_000_000)
  })

  it('parses --spins with B suffix', () => {
    process.argv = ['node', 'sim.js', '--spins', '2B']
    const opts = parseSimArgs()
    expect(opts.spins).toBe(2_000_000_000)
  })

  it('parses --spins with underscores', () => {
    process.argv = ['node', 'sim.js', '--spins', '1_000_000']
    const opts = parseSimArgs()
    expect(opts.spins).toBe(1_000_000)
  })

  it('parses -n shorthand', () => {
    process.argv = ['node', 'sim.js', '-n', '500K']
    const opts = parseSimArgs()
    expect(opts.spins).toBe(500_000)
  })

  it('parses --workers', () => {
    process.argv = ['node', 'sim.js', '--workers', '8']
    const opts = parseSimArgs()
    expect(opts.workers).toBe(8)
  })

  it('parses -w shorthand', () => {
    process.argv = ['node', 'sim.js', '-w', '4']
    const opts = parseSimArgs()
    expect(opts.workers).toBe(4)
  })

  it('sets workers to CPU count when 0', () => {
    process.argv = ['node', 'sim.js', '--workers', '0']
    const opts = parseSimArgs()
    expect(opts.workers).toBeGreaterThan(0)
  })

  it('parses --seed', () => {
    process.argv = ['node', 'sim.js', '--seed', '9999']
    const opts = parseSimArgs()
    expect(opts.seed).toBe(9999)
  })

  it('parses --warmup with K suffix', () => {
    process.argv = ['node', 'sim.js', '--warmup', '100K']
    const opts = parseSimArgs()
    expect(opts.warmup).toBe(100_000)
  })

  it('parses --mode', () => {
    process.argv = ['node', 'sim.js', '--mode', 'verify']
    const opts = parseSimArgs()
    expect(opts.mode).toBe('verify')
  })

  it('parses --json flag', () => {
    process.argv = ['node', 'sim.js', '--json']
    const opts = parseSimArgs()
    expect(opts.json).toBe(true)
  })

  it('parses --json-output with value', () => {
    process.argv = ['node', 'sim.js', '--json-output', '/tmp/out.json']
    const opts = parseSimArgs()
    expect(opts.jsonOutput).toBe('/tmp/out.json')
  })

  it('parses --json-output without value (empty string fallback)', () => {
    process.argv = ['node', 'sim.js', '--json-output', '--json']
    const opts = parseSimArgs()
    expect(opts.jsonOutput).toBe('')
    expect(opts.json).toBe(true)
  })

  it('parses --visualize with value', () => {
    process.argv = ['node', 'sim.js', '--visualize', 'report.html']
    const opts = parseSimArgs()
    expect(opts.visualize).toBe('report.html')
  })

  it('parses --visualize without value', () => {
    process.argv = ['node', 'sim.js', '--visualize', '--spins', '100']
    const opts = parseSimArgs()
    expect(opts.visualize).toBe('')
    expect(opts.spins).toBe(100)
  })

  it('parses --snapshot-interval', () => {
    process.argv = ['node', 'sim.js', '--snapshot-interval', '0.5']
    const opts = parseSimArgs()
    expect(opts.snapshotInterval).toBe(0.5)
  })

  it('parses --multiplier and -m', () => {
    process.argv = ['node', 'sim.js', '--multiplier', '5']
    const opts1 = parseSimArgs()
    expect(opts1.betMultiplier).toBe(5)

    process.argv = ['node', 'sim.js', '-m', '3']
    const opts2 = parseSimArgs()
    expect(opts2.betMultiplier).toBe(3)
  })
})

describe('printSimHeader', () => {
  it('outputs game name and config', () => {
    const lines: string[] = []
    const orig = console.log
    console.log = (...args: string[]) => lines.push(args.map(String).join(' '))
    try {
      printSimHeader(
        { spins: 1000, workers: 1, seed: 42, mode: 'benchmark' } as SimCliOpts,
        'test-game',
      )
    } finally {
      console.log = orig
    }
    expect(lines.some((l) => l.includes('test-game'))).toBe(true)
    expect(lines.some((l) => l.includes('benchmark'))).toBe(true)
    expect(lines.some((l) => l.includes('1K'))).toBe(true)
  })

  it('does not output when json mode', () => {
    const lines: string[] = []
    const orig = console.log
    console.log = (...args: string[]) => lines.push(args.map(String).join(' '))
    try {
      printSimHeader(
        { spins: 1000, workers: 1, seed: 42, mode: 'benchmark', json: true } as SimCliOpts,
        'test',
      )
    } finally {
      console.log = orig
    }
    expect(lines).toHaveLength(0)
  })
})
