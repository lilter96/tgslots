import { expect } from 'bun:test'
import { mt19937 } from '@tgslots/math/rng/mt19937'
import type { Rng } from '@tgslots/math/rng/types'
import type { BetConfiguration } from '@tgslots/slots-core/betting'
import { Wager } from '@tgslots/slots-core/betting'
import type { SpinResult, StateMachine, RawMetricScope } from '../core/state-machine.js'
import { ModernDataCollector } from '../core/state-machine.js'

export interface SlotsTestRunOptions<TState extends object = object> {
  seed?: number
  betLevel?: number
  initialState?: TState
}

export interface SlotsTestRunResult<TSM extends StateMachine<SpinResult, object>> {
  sm: TSM
  rng: Rng
  wager: Wager
  result: SpinResult
  collector: ModernDataCollector
}

export interface SlotsTestCycleResult<TSM extends StateMachine<SpinResult, object>> {
  sm: TSM
  rng: Rng
  wager: Wager
  collector: ModernDataCollector
  results: SpinResult[]
  snapshot: ReturnType<ModernDataCollector['getLastRoundSnapshot']>
}

export interface FindSeedOptions {
  maxSeeds?: number
  betLevel?: number
}

export class SlotsTestEngine<TSM extends StateMachine<SpinResult, object>> {
  constructor(
    private readonly MachineClass: new (initialState?: TSM['state']) => TSM,
    private readonly betConfig: BetConfiguration,
  ) {}

  createMachine(initialState?: TSM['state']): TSM {
    return new this.MachineClass(initialState)
  }

  wager(betLevel = 1): Wager {
    return new Wager(betLevel, this.betConfig)
  }

  rng(seed = 0): Rng {
    return mt19937(seed)
  }

  runSpin(options: SlotsTestRunOptions<TSM['state']> = {}): SlotsTestRunResult<TSM> {
    const { seed = 0, betLevel = 1, initialState } = options
    const sm = this.createMachine(initialState)
    const wager = this.wager(betLevel)
    const rng = this.rng(seed)
    const collector = new ModernDataCollector()

    collector.beginRound(wager.totalWager)
    const result = sm.spin(rng, wager)
    collector.collect(result)
    sm.recordResultMetrics?.(collector, result, { phase: 'spin', wager })
    collector.endRound()

    const round = collector.getLastRoundSnapshot()
    if (round) {
      sm.recordRoundMetrics?.(collector, round, wager)
    }

    return { sm, rng, wager, result, collector }
  }

  runCycle(options: SlotsTestRunOptions<TSM['state']> = {}): SlotsTestCycleResult<TSM> {
    const { seed = 0, betLevel = 1, initialState } = options
    const sm = this.createMachine(initialState)
    const wager = this.wager(betLevel)
    const rng = this.rng(seed)
    const collector = new ModernDataCollector()
    const results: SpinResult[] = []

    collector.beginRound(wager.totalWager)

    const initial = sm.spin(rng, wager)
    results.push(initial)
    collector.collect(initial)
    sm.recordResultMetrics?.(collector, initial, { phase: 'spin', wager })

    let nextResult: SpinResult | null
    while ((nextResult = sm.next(rng)) !== null) {
      results.push(nextResult)
      collector.collect(nextResult)
      sm.recordResultMetrics?.(collector, nextResult, { phase: 'next', wager })
    }

    collector.endRound()

    const round = collector.getLastRoundSnapshot()
    if (round) {
      sm.recordRoundMetrics?.(collector, round, wager)
    }

    return { sm, rng, wager, collector, results, snapshot: collector.getLastRoundSnapshot() }
  }

  findSeed(
    predicate: (result: SpinResult, sm: TSM) => boolean,
    options: FindSeedOptions = {},
  ): number | null {
    const { maxSeeds = 200, betLevel = 1 } = options
    for (let seed = 0; seed < maxSeeds; seed++) {
      const sm = this.createMachine()
      const wager = this.wager(betLevel)
      const rng = this.rng(seed)
      const result = sm.spin(rng, wager)
      if (predicate(result, sm)) return seed
    }
    return null
  }

  getScope(collector: ModernDataCollector, path: string): RawMetricScope | undefined {
    const raw = collector.getRawMetrics()
    const segments = path.split('/').filter(Boolean)
    let current: RawMetricScope | undefined = raw.rootScope
    for (const segment of segments) {
      current = current?.scopes[segment]
      if (!current) return undefined
    }
    return current
  }

  assertScopeDefined(collector: ModernDataCollector, path: string): void {
    const scope = this.getScope(collector, path)
    expect(scope, `Metric scope "${path}" should be defined`).toBeDefined()
  }

  assertMetricDefined(collector: ModernDataCollector, scopePath: string, metricName: string): void {
    const scope = this.getScope(collector, scopePath)
    expect(scope, `Metric scope "${scopePath}" should be defined`).toBeDefined()
    expect(
      scope?.metrics[metricName],
      `Metric "${metricName}" should be defined in scope "${scopePath}"`,
    ).toBeDefined()
  }
}
