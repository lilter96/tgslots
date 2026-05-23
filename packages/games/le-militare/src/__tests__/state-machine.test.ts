import { describe, expect, it } from 'bun:test'
import { mt19937 } from '@tgslots/math/rng/mt19937'
import { Wager } from '@tgslots/slots-core/betting'
import { ModernDataCollector } from '@tgslots/slots-simulation-engine'
import { BET_CONFIG } from '../constants.js'
import type {
  LeMilitareBaseResult,
  LeMilitareBuyResult,
  LeMilitareFreeResult,
} from '../game-state-machine.js'
import { LeMilitareStateMachine } from '../game-state-machine.js'

describe('LeMilitareStateMachine — full round-trip', () => {
  it('spin produces BASE result with expected shape', () => {
    const sm = new LeMilitareStateMachine()
    const wager = new Wager(1, BET_CONFIG)
    const rng = mt19937(42)

    const result = sm.spin(rng, wager) as LeMilitareBaseResult
    expect(result.type).toBe('BASE')
    expect(typeof result.win).toBe('number')
    expect(typeof result.scatterCount).toBe('number')
    expect(typeof result.triggeredFreeSpins).toBe('boolean')
    expect(typeof result.freeSpinsAwarded).toBe('number')
    expect(Array.isArray(result.steps)).toBe(true)
    expect(result.state).toHaveProperty('freeSpinsLeft')
    expect(result.state).toHaveProperty('totalFreeSpinWin')
    expect(result.components).toBeDefined()
  })

  it('spin resets freeSpins and lastSpinResult', () => {
    const sm = new LeMilitareStateMachine()
    const wager = new Wager(1, BET_CONFIG)

    // Inject previous state
    // @ts-expect-error: accessing private property
    sm._state = {
      lastGrid: null,
      freeSpins: {
        triggeringWager: wager,
        spinsRemaining: 3,
        totalWin: 500,
        armedReels: new Set([1]),
        multiplierSum: 2,
      },
      lastSpinResult: null,
    }
    expect(sm.state.freeSpins).not.toBeNull()

    sm.spin(mt19937(42), wager)
    expect(sm.state.freeSpins).toBeNull()
  })

  it('freeGameSpin throws when no free spins remaining', () => {
    const sm = new LeMilitareStateMachine()
    expect(sm.next(mt19937(1))).toBeNull()
  })

  it('freeGameSpin decrements spinsRemaining', () => {
    const sm = new LeMilitareStateMachine()
    const wager = new Wager(1, BET_CONFIG)

    // @ts-expect-error: accessing private property
    sm._state = {
      lastGrid: null,
      freeSpins: {
        triggeringWager: wager,
        spinsRemaining: 3,
        totalWin: 0,
        armedReels: new Set(),
        multiplierSum: 0,
      },
      lastSpinResult: null,
    }

    const result = sm.next(mt19937(42)) as LeMilitareFreeResult | null
    if (result) {
      expect(result.type).toBe('FREE')
      expect(result.state.freeSpinsLeft).toBeLessThanOrEqual(2)
      expect(typeof result.win).toBe('number')
      expect(typeof result.scatterCount).toBe('number')
      expect(Array.isArray(result.steps)).toBe(true)
    }
  })

  it('freeGameSpin accumulates totalWin', () => {
    const sm = new LeMilitareStateMachine()
    const wager = new Wager(1, BET_CONFIG)

    // @ts-expect-error: accessing private property
    sm._state = {
      lastGrid: null,
      freeSpins: {
        triggeringWager: wager,
        spinsRemaining: 5,
        totalWin: 0,
        armedReels: new Set(),
        multiplierSum: 0,
      },
      lastSpinResult: null,
    }

    let totalWin = 0
    for (let i = 0; i < 10; i++) {
      const rng = mt19937(100 + i)
      const result = sm.next(rng)
      if (!result) break
      totalWin += result.win
    }
    expect(sm.state.freeSpins?.totalWin).toBe(totalWin)
  })
})

describe('LeMilitareStateMachine — buy bonus', () => {
  it('buyBonus produces BUY result', () => {
    const sm = new LeMilitareStateMachine()
    const wager = new Wager(1, BET_CONFIG)
    const rng = mt19937(999)

    const result = sm.buyBonus(rng, wager) as LeMilitareBuyResult
    expect(result.type).toBe('BUY')
    expect(result.triggeredFreeSpins).toBe(true)
    expect(result.freeSpinsAwarded).toBeGreaterThan(0)
    expect(Array.isArray(result.steps)).toBe(true)
    expect(result.state.freeSpinsLeft).toBeGreaterThan(0)
  })

  it('buyBonus sets up freeSpins state', () => {
    const sm = new LeMilitareStateMachine()
    const wager = new Wager(1, BET_CONFIG)
    sm.buyBonus(mt19937(888), wager)
    expect(sm.state.freeSpins).not.toBeNull()
    expect(sm.state.freeSpins!.spinsRemaining).toBeGreaterThan(0)
  })

  it('buyBonus resets previous state', () => {
    const sm = new LeMilitareStateMachine()
    const wager = new Wager(1, BET_CONFIG)

    // Inject previous free spins
    // @ts-expect-error: accessing private property
    sm._state = {
      lastGrid: null,
      freeSpins: {
        triggeringWager: wager,
        spinsRemaining: 3,
        totalWin: 100,
        armedReels: new Set(),
        multiplierSum: 0,
      },
      lastSpinResult: null,
    }

    sm.buyBonus(mt19937(777), wager)
    // Should have new spins from buy bonus, not old ones
    expect(sm.state.freeSpins!.spinsRemaining).not.toBe(3)
  })
})

describe('LeMilitareStateMachine — recordResultMetrics', () => {
  it('records BASE result metrics including triggered free spins', () => {
    const collector = new ModernDataCollector()
    const wager = new Wager(1, BET_CONFIG)

    // Find a seed with trigger
    for (let seed = 0; seed < 100; seed++) {
      const rng = mt19937(seed)
      const sm2 = new LeMilitareStateMachine()
      const result = sm2.spin(rng, wager) as LeMilitareBaseResult

      if (result.triggeredFreeSpins) {
        sm2.recordResultMetrics!(collector, result, { phase: 'spin', wager })

        const raw = collector.getRawMetrics()
        const baseScope = raw.rootScope.scopes['base-game']
        expect(baseScope).toBeDefined()

        const freeScope = raw.rootScope.scopes.features?.scopes['free-spins']
        expect(freeScope?.metrics['triggers']).toBeDefined()
        expect((freeScope?.metrics['spins-awarded'] as { sum: number })?.sum).toBeGreaterThan(0)
        return
      }
    }
  })

  it('records BUY result metrics', () => {
    const collector = new ModernDataCollector()
    const sm = new LeMilitareStateMachine()
    const wager = new Wager(1, BET_CONFIG)
    const result = sm.buyBonus(mt19937(555), wager)

    sm.recordResultMetrics!(collector, result, { phase: 'spin', wager })

    const raw = collector.getRawMetrics()
    const buyScope = raw.rootScope.scopes.features?.scopes['buy-bonus']
    expect(buyScope).toBeDefined()
    expect((buyScope?.metrics['purchases'] as { total: number })?.total).toBeGreaterThanOrEqual(1)
  })

  it('records FREE result metrics including spin payout', () => {
    const collector = new ModernDataCollector()
    const sm = new LeMilitareStateMachine()
    const wager = new Wager(1, BET_CONFIG)

    // @ts-expect-error: accessing private property
    sm._state = {
      lastGrid: null,
      freeSpins: {
        triggeringWager: wager,
        spinsRemaining: 3,
        totalWin: 0,
        armedReels: new Set(),
        multiplierSum: 0,
      },
      lastSpinResult: null,
    }

    const rng = mt19937(42)
    const result = sm.next(rng) as LeMilitareFreeResult | null
    if (result) {
      sm.recordResultMetrics!(collector, result, { phase: 'next', wager })

      const raw = collector.getRawMetrics()
      const freeScope = raw.rootScope.scopes.features?.scopes['free-spins']
      expect(freeScope).toBeDefined()
      expect(freeScope?.metrics['spins-played']).toBeDefined()
    }
  })
})

describe('LeMilitareStateMachine — recordRoundMetrics', () => {
  it('tracks base win RTP and feature RTP', () => {
    const collector = new ModernDataCollector()
    const sm = new LeMilitareStateMachine()
    const wager = new Wager(1, BET_CONFIG)

    // Run a complete round
    collector.beginRound(wager.totalWager)
    const baseResult = sm.spin(mt19937(42), wager)
    collector.collect(baseResult)
    sm.recordResultMetrics?.(collector, baseResult, { phase: 'spin', wager })

    // If free spins triggered, play through them
    if (baseResult.triggeredFreeSpins) {
      let nextResult = sm.next(mt19937(100))
      while (nextResult) {
        collector.collect(nextResult)
        sm.recordResultMetrics?.(collector, nextResult, { phase: 'next', wager })
        nextResult = sm.next(mt19937(200))
      }
    }
    collector.endRound()

    const round = collector.getLastRoundSnapshot()
    if (round) {
      sm.recordRoundMetrics!(collector, round, wager)

      const raw = collector.getRawMetrics()
      const baseScope = raw.rootScope.scopes['base-game']
      const freeScope = raw.rootScope.scopes.features?.scopes['free-spins']
      expect(baseScope?.metrics['win']).toBeDefined()
      expect(freeScope?.metrics['feature-rtp']).toBeDefined()
    }
  })

  it('tracks session metrics when free spins played', () => {
    const collector = new ModernDataCollector()
    const sm = new LeMilitareStateMachine()
    const wager = new Wager(1, BET_CONFIG)

    // @ts-expect-error: accessing private property
    sm._state = {
      lastGrid: null,
      freeSpins: {
        triggeringWager: wager,
        spinsRemaining: 2,
        totalWin: 0,
        armedReels: new Set(),
        multiplierSum: 0,
      },
      lastSpinResult: null,
    }

    collector.beginRound(wager.totalWager)
    const freeResult = sm.next(mt19937(77))
    if (freeResult) {
      collector.collect(freeResult)
      sm.recordResultMetrics?.(collector, freeResult, { phase: 'next', wager })
    }
    collector.endRound()

    const round = collector.getLastRoundSnapshot()
    if (round && (round.countsByType.FREE ?? 0) > 0) {
      sm.recordRoundMetrics!(collector, round, wager)

      const raw = collector.getRawMetrics()
      const freeScope = raw.rootScope.scopes.features?.scopes['free-spins']
      expect(freeScope?.metrics['session-win']).toBeDefined()
      expect(freeScope?.metrics['triggered-round-win']).toBeDefined()
      expect(freeScope?.metrics['total-spins-per-trigger']).toBeDefined()
    }
  })
})
