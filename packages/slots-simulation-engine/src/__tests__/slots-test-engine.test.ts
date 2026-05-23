import { describe, expect, it } from 'bun:test'
import type { Rng } from '@tgslots/math/rng/types'
import { BetConfiguration, Wager } from '@tgslots/slots-core/betting'
import type {
  DataCollector,
  RoundMetricsSnapshot,
  SpinResult,
  StateMachine,
} from '../core/state-machine.js'
import {
  createSlotsTestEngine,
  type SlotsTestActionHandler,
  type SlotsTestProbeHandler,
  type SlotsTestScenarioHandler,
} from '../testing/slots-test-engine.js'

interface StubState {
  freeSpins: number
}

interface StubBaseResult extends SpinResult {
  type: 'BASE'
  triggeredFreeSpins: boolean
}

interface StubFreeResult extends SpinResult {
  type: 'FREE'
}

interface StubBuyResult extends SpinResult {
  type: 'BUY'
  awardedSpins: number
}

type StubResult = StubBaseResult | StubFreeResult | StubBuyResult

class ExtendedStubMachine implements StateMachine<StubResult, StubState> {
  readonly state: StubState

  constructor(initialState?: StubState) {
    this.state = initialState ?? { freeSpins: 0 }
  }

  spin(): StubBaseResult {
    this.state.freeSpins = 1
    return {
      type: 'BASE',
      win: 10,
      components: { total: 10 },
      triggeredFreeSpins: true,
    }
  }

  next(): StubFreeResult | null {
    if (this.state.freeSpins <= 0) return null
    this.state.freeSpins--
    return {
      type: 'FREE',
      win: 5,
      components: { total: 5 },
    }
  }

  buyBonus(_rng: Rng, _wager: Wager): StubBuyResult {
    this.state.freeSpins = 2
    return {
      type: 'BUY',
      win: 0,
      awardedSpins: 2,
      components: { total: 0 },
    }
  }

  recordResultMetrics(
    collector: DataCollector,
    result: StubResult,
    _context: { phase: 'spin' | 'next'; wager: Wager },
  ): void {
    const freeSpins = collector.scope(['features', 'free-spins'])

    if (result.type === 'BASE' && result.triggeredFreeSpins) {
      freeSpins.count('triggers')
      return
    }

    if (result.type === 'BUY') {
      collector.scope(['features', 'buy-bonus']).count('purchases')
      freeSpins.value('spins-awarded', result.awardedSpins)
      return
    }

    if (result.type === 'FREE') {
      freeSpins.count('spins-played')
      freeSpins.payout('spin-win', result.win)
    }
  }

  recordRoundMetrics(collector: DataCollector, round: RoundMetricsSnapshot): void {
    collector.scope('base-game').rtp('win', round.winsByType.BASE?.total ?? 0)
    collector
      .scope(['features', 'free-spins'])
      .rtp('feature-rtp', round.winsByType.FREE?.total ?? 0)
  }
}

const BET_CONFIG = new BetConfiguration(100, 10, 10, 0)

const buyBonusAction: SlotsTestActionHandler<ExtendedStubMachine, [], StubBuyResult> = (session) =>
  session.executeResultStep('buyBonus', () => session.sm.buyBonus(session.rng, session.wager), {
    metricPhase: 'spin',
  })

const withFreeSpinsScenario: SlotsTestScenarioHandler<
  ExtendedStubMachine,
  [freeSpins?: number],
  number
> = (session, freeSpins = 2) => {
  session.resetMachine({ freeSpins })
  return session.sm.state.freeSpins
}

const remainingFreeSpinsProbe: SlotsTestProbeHandler<ExtendedStubMachine, [], number> = (session) =>
  session.sm.state.freeSpins

describe('SlotsTestEngine fluent API', () => {
  const engine = createSlotsTestEngine(ExtendedStubMachine, BET_CONFIG)
    .registerAction('buyBonus', buyBonusAction)
    .registerScenario('withFreeSpins', withFreeSpinsScenario)
    .registerProbe('remainingFreeSpins', remainingFreeSpinsProbe)
    .build()

  it('registers scenarios and probes through the fluent builder', () => {
    const session = engine.session()
    session.scenario('withFreeSpins', 3)

    expect(session.probe('remainingFreeSpins')).toBe(3)

    const result = session.act('next')
    expect(result?.type).toBe('FREE')
  })

  it('registers custom actions without widening the shared state-machine contract', () => {
    const session = engine.session()

    session.withinRound(() => {
      session.act('buyBonus')
      session.act('next')
      session.act('next')
    })

    expect(session.results.map((result) => result.type)).toEqual(['BUY', 'FREE', 'FREE'])
    expect(session.lastRound?.results).toHaveLength(3)
    session.assertMetricDefined('features/buy-bonus', 'purchases')
    session.assertMetricDefined('features/free-spins', 'spins-played')
  })

  it('captures full-cycle execution through the production runCycle helper', () => {
    const session = engine.session()
    const round = session.act('cycle')

    expect(round.results.map((result) => result.type)).toEqual(['BASE', 'FREE'])
    expect(session.trace.map((entry) => entry.metricPhase)).toEqual(['spin', 'next'])
    session.assertMetricDefined('base-game', 'win')
    session.assertMetricDefined('features/free-spins', 'feature-rtp')
  })

  it('does not record rounds or metrics for a non-collected step', () => {
    const session = engine.session()
    const before = session.getRawMetrics()

    const result = session.executeResultStep(
      'peek',
      () => session.sm.buyBonus(session.rng, session.wager),
      { collect: false },
    )

    expect(result.type).toBe('BUY')

    const after = session.getRawMetrics()
    expect(after.rounds).toBe(before.rounds)
    expect(after.totalBet).toBe(before.totalBet)
    expect(after.totalSpinResults).toBe(before.totalSpinResults)
    expect(session.rounds).toHaveLength(0)
    expect(session.results).toHaveLength(0)
    expect(session.trace).toHaveLength(0)
  })

  it('exposes raw metrics and returns a defensive copy of results', () => {
    const session = engine.session()
    session.act('cycle')

    expect(session.getRawMetrics().rounds).toBeGreaterThanOrEqual(1)

    const lengthBefore = session.results.length
    const view = session.results as StubResult[]
    view.push({ type: 'FREE', win: 0, components: { total: 0 } })
    expect(session.results).toHaveLength(lengthBefore)
  })

  it('refuses to reset the machine while a round is open', () => {
    const session = engine.session()
    session.startRound()
    expect(() => session.resetMachine({ freeSpins: 0 })).toThrow('while a round is open')
  })

  it('rejects mistyped action and scenario arguments at compile time', () => {
    const session = engine.session()

    // @ts-expect-error spin takes no arguments
    session.act('spin', 1)
    // @ts-expect-error withFreeSpins expects a number, not a string
    session.scenario('withFreeSpins', 'nope')

    session.scenario('withFreeSpins', 3)
    expect(session.probe('remainingFreeSpins')).toBe(3)
  })
})
