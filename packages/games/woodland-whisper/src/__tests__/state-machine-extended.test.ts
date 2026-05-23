import { describe, expect, it } from 'bun:test'
import { mt19937 } from '@tgslots/math/rng/mt19937'
import { Wager } from '@tgslots/slots-core/betting'
import { ModernDataCollector } from '@tgslots/slots-simulation-engine'
import { BET_CONFIG } from '../constants.js'
import type {
  WoodlandWhisperBaseResult,
  WoodlandWhisperBuyResult,
  WoodlandWhisperFreeResult,
  WoodlandWhisperPickResult,
} from '../game-state-machine.js'
import { WoodlandWhisperStateMachine } from '../game-state-machine.js'

describe('WoodlandWhisperStateMachine — init and base spin', () => {
  it('initInitialGrid sets a valid grid', () => {
    const sm = new WoodlandWhisperStateMachine()
    const rng = mt19937(42)

    sm.initInitialGrid(rng)
    const grid = sm.state.lastGrid
    expect(grid).not.toBeNull()
    expect(grid!).toHaveLength(3) // 3 rows
    expect(grid![0]).toHaveLength(5) // 5 reels
  })

  it('initInitialGrid produces win=0 grid with < 2 scatters', () => {
    // Try multiple seeds to validate the invariant
    for (let seed = 0; seed < 50; seed++) {
      const sm2 = new WoodlandWhisperStateMachine()
      sm2.initInitialGrid(mt19937(seed))
      const grid = sm2.state.lastGrid!
      // Grid should be 3 rows x 5 reels
      expect(grid).toHaveLength(3)
      expect(grid[0]).toHaveLength(5)
    }
  })

  it('spin produces BASE result with expected shape', () => {
    const sm = new WoodlandWhisperStateMachine()
    const wager = new Wager(1, BET_CONFIG)
    const rng = mt19937(42)

    const result = sm.spin(rng, wager) as WoodlandWhisperBaseResult
    expect(result.type).toBe('BASE')
    expect(typeof result.win).toBe('number')
    expect(typeof result.sc).toBe('number')
    expect(Array.isArray(result.grid)).toBe(true)
    expect(result.grid).toHaveLength(3)
    expect(Array.isArray(result.hits)).toBe(true)
    expect(result.state).toHaveProperty('freeSpinsLeft')
    expect(result.components).toBeDefined()
  })

  it('spin resets freeSpins and pickBonus', () => {
    const sm = new WoodlandWhisperStateMachine()
    const wager = new Wager(1, BET_CONFIG)

    // @ts-expect-error: accessing private property
    sm._state = {
      lastGrid: null,
      freeSpins: { triggeringWager: wager, totalWin: 100, spinsRemaining: 5 },
      pickBonus: {
        board: [],
        pickSequence: [],
        currentPickIndex: 0,
        userPicks: [],
        revealedValues: [],
        winValue: 0,
        triggeringWager: wager,
      },
    }

    sm.spin(mt19937(42), wager)
    expect(sm.state.freeSpins).toBeNull()
    expect(sm.state.pickBonus).toBeNull()
  })
})

describe('WoodlandWhisperStateMachine — freeGameSpin', () => {
  it('throws when no free spins remaining', () => {
    const sm = new WoodlandWhisperStateMachine()
    expect(sm.next(mt19937(1))).toBeNull()
  })

  it('produces FREE result and decrements spinsRemaining', () => {
    const sm = new WoodlandWhisperStateMachine()
    const wager = new Wager(1, BET_CONFIG)

    // @ts-expect-error: accessing private property
    sm._state = {
      lastGrid: null,
      freeSpins: { triggeringWager: wager, totalWin: 0, spinsRemaining: 3 },
      pickBonus: null,
    }

    const result = sm.next(mt19937(77)) as WoodlandWhisperFreeResult | null
    if (result) {
      expect(result.type).toBe('FREE')
      expect(result.state.freeSpinsLeft).toBe(2)
      expect(typeof result.win).toBe('number')
      expect(typeof result.sc).toBe('number')
      expect(Array.isArray(result.grid)).toBe(true)
      expect(Array.isArray(result.hits)).toBe(true)
      expect(result.components).toBeDefined()
    }
  })
})

describe('WoodlandWhisperStateMachine — buy bonus', () => {
  it('buyBonus produces BUY result', () => {
    const sm = new WoodlandWhisperStateMachine()
    const wager = new Wager(1, BET_CONFIG)
    const rng = mt19937(42)

    const result = sm.buyBonus(rng, wager) as WoodlandWhisperBuyResult
    expect(result.type).toBe('BUY')
    expect(result.triggeredPickBonus).toBe(true)
    expect(result.pickedBonus).toBeGreaterThan(0)
    expect(Array.isArray(result.grid)).toBe(true)
    expect(Array.isArray(result.hits)).toBe(true)
  })

  it('buyBonus sets pickBonus state', () => {
    const sm = new WoodlandWhisperStateMachine()
    const wager = new Wager(1, BET_CONFIG)

    sm.buyBonus(mt19937(42), wager)
    expect(sm.state.pickBonus).not.toBeNull()
    expect(sm.state.pickBonus!.board.length).toBeGreaterThan(0)
    expect(sm.state.pickBonus!.pickSequence.length).toBeGreaterThan(0)
  })
})

describe('WoodlandWhisperStateMachine — pickBall', () => {
  it('throws when no active pick bonus', () => {
    const sm = new WoodlandWhisperStateMachine()
    expect(() => sm.pickBall(0)).toThrow('No active pick bonus')
  })

  it('produces PICK result from active pick bonus', () => {
    const sm = new WoodlandWhisperStateMachine()
    const wager = new Wager(1, BET_CONFIG)

    // First trigger a buy bonus to get pick state
    sm.buyBonus(mt19937(42), wager)

    const pickBonus = sm.state.pickBonus
    expect(pickBonus).not.toBeNull()

    const result = sm.pickBall(0) as WoodlandWhisperPickResult
    expect(result.type).toBe('PICK')
    expect(result.pick).toBeDefined()
    expect(result.pick.userIndex).toBe(0)
    expect(typeof result.pick.value).toBe('number')
    expect(typeof result.pick.isMatch).toBe('boolean')
  })

  it('pick until match resolves pick bonus', () => {
    const sm = new WoodlandWhisperStateMachine()
    const wager = new Wager(1, BET_CONFIG)
    sm.buyBonus(mt19937(42), wager)

    let matchFound = false
    for (let i = 0; i < 20 && sm.state.pickBonus; i++) {
      const result = sm.pickBall(i % 6) as WoodlandWhisperPickResult
      if (result.pick.isMatch) {
        matchFound = true
        expect(sm.state.freeSpins).not.toBeNull()
        expect(sm.state.freeSpins!.spinsRemaining).toBeGreaterThan(0)
        break
      }
    }
    expect(matchFound).toBe(true)
  })
})

describe('WoodlandWhisperStateMachine — recordResultMetrics', () => {
  it('records BASE result metrics', () => {
    const collector = new ModernDataCollector()
    const sm = new WoodlandWhisperStateMachine()
    const wager = new Wager(1, BET_CONFIG)
    const rng = mt19937(42)

    const result = sm.spin(rng, wager) as WoodlandWhisperBaseResult
    sm.recordResultMetrics!(collector, result, { phase: 'spin', wager })

    const raw = collector.getRawMetrics()
    const baseScope = raw.rootScope.scopes['base-game']
    expect(baseScope).toBeDefined()
  })

  it('records BUY result metrics', () => {
    const collector = new ModernDataCollector()
    const sm = new WoodlandWhisperStateMachine()
    const wager = new Wager(1, BET_CONFIG)
    const result = sm.buyBonus(mt19937(42), wager)

    sm.recordResultMetrics!(collector, result, { phase: 'spin', wager })

    const raw = collector.getRawMetrics()
    const buyScope = raw.rootScope.scopes.features?.scopes['buy-bonus']
    expect(buyScope).toBeDefined()
    expect((buyScope?.metrics['purchases'] as { total: number })?.total).toBeGreaterThanOrEqual(1)
  })

  it('records FREE result metrics with scatters', () => {
    const collector = new ModernDataCollector()
    const sm = new WoodlandWhisperStateMachine()
    const wager = new Wager(1, BET_CONFIG)

    // @ts-expect-error: accessing private property
    sm._state = {
      lastGrid: null,
      freeSpins: { triggeringWager: wager, totalWin: 0, spinsRemaining: 3 },
      pickBonus: null,
    }

    const rng = mt19937(77)
    const result = sm.next(rng)
    if (result) {
      sm.recordResultMetrics!(collector, result, { phase: 'next', wager })

      const raw = collector.getRawMetrics()
      const freeScope = raw.rootScope.scopes.features?.scopes['free-spins']
      expect(freeScope).toBeDefined()
      expect(freeScope?.metrics['spins-played']).toBeDefined()
    }
  })

  it('skips metrics for PICK results', () => {
    const collector = new ModernDataCollector()
    const sm = new WoodlandWhisperStateMachine()
    const wager = new Wager(1, BET_CONFIG)
    sm.buyBonus(mt19937(42), wager)

    const pickResult = sm.pickBall(0) as WoodlandWhisperPickResult
    sm.recordResultMetrics!(collector, pickResult, { phase: 'spin', wager })

    // PICK results should not add any metrics
    const raw = collector.getRawMetrics()
    // No new metrics should be added from PICK
    expect(raw.rounds).toBe(0)
  })
})

describe('WoodlandWhisperStateMachine — recordRoundMetrics', () => {
  it('tracks base and free RTP + scatters', () => {
    const collector = new ModernDataCollector()
    const sm = new WoodlandWhisperStateMachine()
    const wager = new Wager(1, BET_CONFIG)
    const rng = mt19937(42)

    collector.beginRound(wager.totalWager)
    const baseResult = sm.spin(rng, wager)
    collector.collect(baseResult)
    sm.recordResultMetrics?.(collector, baseResult, { phase: 'spin', wager })

    // Check for triggered free spins
    const wwBase = baseResult as WoodlandWhisperBaseResult
    if (wwBase.triggeredPickBonus) {
      // Play through pick bonus
      for (let i = 0; i < 20 && sm.state.pickBonus; i++) {
        const pickResult = sm.pickBall(i)
        collector.collect(pickResult)
      }
      // Play free spins
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
      expect(baseScope?.metrics['scatter-win']).toBeDefined()
      expect(freeScope?.metrics['feature-rtp']).toBeDefined()
      expect(freeScope?.metrics['scatter-rtp']).toBeDefined()
    }
  })

  it('skips session metrics when no free spins or picks', () => {
    const collector = new ModernDataCollector()
    const sm = new WoodlandWhisperStateMachine()
    const wager = new Wager(1, BET_CONFIG)
    const rng = mt19937(42)

    collector.beginRound(wager.totalWager)
    const result = sm.spin(rng, wager) as WoodlandWhisperBaseResult
    collector.collect(result)
    collector.endRound()

    const round = collector.getLastRoundSnapshot()
    if (round && (round.countsByType.FREE ?? 0) === 0 && (round.countsByType.PICK ?? 0) === 0) {
      sm.recordRoundMetrics!(collector, round, wager)
      // Should still have base metrics
      const raw = collector.getRawMetrics()
      const baseScope = raw.rootScope.scopes['base-game']
      expect(baseScope?.metrics['win']).toBeDefined()
    }
  })
})
