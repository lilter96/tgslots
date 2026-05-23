import { describe, expect, it } from 'bun:test'
import type {
  WoodlandWhisperBaseResult,
  WoodlandWhisperBuyResult,
  WoodlandWhisperFreeResult,
  WoodlandWhisperPickResult,
} from '../game-state-machine.js'
import { woodlandWhisperTestEngine as engine } from './test-engine.js'

describe('WoodlandWhisperStateMachine — init and base spin', () => {
  it('initInitialGrid sets a valid grid', () => {
    const session = engine.session({ seed: 42 })
    session.act('initInitialGrid')

    const grid = session.sm.state.lastGrid
    expect(grid).not.toBeNull()
    expect(grid!).toHaveLength(3)
    expect(grid![0]).toHaveLength(5)
  })

  it('initInitialGrid produces valid dimensions across multiple seeds', () => {
    for (let seed = 0; seed < 50; seed++) {
      const session = engine.session({ seed })
      session.act('initInitialGrid')

      const grid = session.sm.state.lastGrid!
      expect(grid).toHaveLength(3)
      expect(grid[0]).toHaveLength(5)
    }
  })

  it('spin produces BASE result with expected shape', () => {
    const session = engine.session({ seed: 42 })
    const result = session.act('spin') as WoodlandWhisperBaseResult

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
    const session = engine.session({
      initialState: {
        lastGrid: null,
        freeSpins: { triggeringWager: engine.wager(), totalWin: 100, spinsRemaining: 5 },
        pickBonus: {
          board: [],
          pickSequence: [],
          currentPickIndex: 0,
          userPicks: [],
          revealedValues: [],
          winValue: 0,
          triggeringWager: engine.wager(),
        },
      },
      seed: 42,
    })

    session.act('spin')
    expect(session.sm.state.freeSpins).toBeNull()
    expect(session.sm.state.pickBonus).toBeNull()
  })
})

describe('WoodlandWhisperStateMachine — freeGameSpin', () => {
  it('returns null when no free spins remain', () => {
    const session = engine.session({ seed: 1 })
    expect(session.act('next')).toBeNull()
  })

  it('produces FREE result and decrements spinsRemaining', () => {
    const session = engine.session({ seed: 77 })
    session.scenario('withFreeSpins', { spinsRemaining: 3 })

    const result = session.act('next') as WoodlandWhisperFreeResult | null
    expect(result?.type).toBe('FREE')
    expect(result?.state.freeSpinsLeft).toBe(2)
    expect(typeof result?.win).toBe('number')
    expect(typeof result?.sc).toBe('number')
    expect(Array.isArray(result?.grid)).toBe(true)
    expect(Array.isArray(result?.hits)).toBe(true)
    expect(result?.components).toBeDefined()
  })
})

describe('WoodlandWhisperStateMachine — buy bonus', () => {
  it('buyBonus produces BUY result', () => {
    const session = engine.session({ seed: 42 })
    const result = session.act('buyBonus') as WoodlandWhisperBuyResult

    expect(result.type).toBe('BUY')
    expect(result.triggeredPickBonus).toBe(true)
    expect(result.pickedBonus).toBeGreaterThan(0)
    expect(Array.isArray(result.grid)).toBe(true)
    expect(Array.isArray(result.hits)).toBe(true)
  })

  it('buyBonus sets pickBonus state', () => {
    const session = engine.session({ seed: 42 })
    session.act('buyBonus')

    expect(session.sm.state.pickBonus).not.toBeNull()
    expect(session.sm.state.pickBonus!.board.length).toBeGreaterThan(0)
    expect(session.sm.state.pickBonus!.pickSequence.length).toBeGreaterThan(0)
  })
})

describe('WoodlandWhisperStateMachine — pickBall', () => {
  it('throws when no active pick bonus', () => {
    const session = engine.session()
    expect(() => session.act('pickBall', 0)).toThrow('No active pick bonus')
  })

  it('produces PICK result from an active pick bonus', () => {
    const session = engine.session({ seed: 42 })
    session.act('buyBonus')

    const result = session.act('pickBall', 0) as WoodlandWhisperPickResult
    expect(result.type).toBe('PICK')
    expect(result.pick.userIndex).toBe(0)
    expect(typeof result.pick.value).toBe('number')
    expect(typeof result.pick.isMatch).toBe('boolean')
  })

  it('resolves the pick bonus when a match is reached', () => {
    const session = engine.session({ seed: 42 })
    session.act('buyBonus')

    let matchFound = false
    for (let pick = 0; pick < 20 && session.sm.state.pickBonus; pick++) {
      const result = session.act('pickBall', pick % 6) as WoodlandWhisperPickResult
      if (result.pick.isMatch) {
        matchFound = true
        expect(session.sm.state.freeSpins).not.toBeNull()
        expect(session.sm.state.freeSpins!.spinsRemaining).toBeGreaterThan(0)
        break
      }
    }

    expect(matchFound).toBe(true)
  })
})

describe('WoodlandWhisperStateMachine — metrics', () => {
  it('records BASE result metrics', () => {
    const session = engine.session({ seed: 42 })
    session.act('spin')

    session.assertScopeDefined('base-game')
  })

  it('records BUY result metrics', () => {
    const session = engine.session({ seed: 42 })
    session.act('buyBonus')

    session.assertScopeDefined('features/buy-bonus')
    session.assertMetricDefined('features/buy-bonus', 'purchases')
  })

  it('records FREE result metrics with scatters', () => {
    const session = engine.session({ seed: 77 })
    session.scenario('withFreeSpins', { spinsRemaining: 3 })
    session.act('next')

    session.assertScopeDefined('features/free-spins')
    session.assertMetricDefined('features/free-spins', 'spins-played')
  })

  it('does not record FREE spin counters for a PICK-only step', () => {
    const session = engine.session({ seed: 42 })
    session.act('buyBonus')
    session.act('pickBall', 0)

    expect(session.getMetric('features/free-spins', 'spins-played')).toBeUndefined()
  })

  it('tracks base and free RTP plus session metrics across a full round', () => {
    const session = engine.session({ seed: 42 })

    session.withinRound(() => {
      const baseResult = session.act('spin') as WoodlandWhisperBaseResult

      if (!baseResult.triggeredPickBonus) {
        return
      }

      for (let pick = 0; pick < 20 && session.sm.state.pickBonus; pick++) {
        session.act('pickBall', pick)
      }

      while (session.sm.state.freeSpins?.spinsRemaining) {
        const result = session.act('next')
        if (!result) break
      }
    })

    session.assertMetricDefined('base-game', 'win')
    session.assertMetricDefined('base-game', 'scatter-win')
    session.assertMetricDefined('features/free-spins', 'feature-rtp')
    session.assertMetricDefined('features/free-spins', 'scatter-rtp')
  })

  it('keeps base metrics when no feature round data is present', () => {
    const seed = engine.findSeed((session) => {
      const result = session.act('spin') as WoodlandWhisperBaseResult
      return !result.triggeredPickBonus
    })

    expect(seed).not.toBeNull()

    const session = engine.session({ seed: seed ?? 0 })
    session.act('spin')

    const round = session.lastRound?.snapshot
    if (round) {
      expect(round.countsByType.FREE ?? 0).toBe(0)
      expect(round.countsByType.PICK ?? 0).toBe(0)
    }

    session.assertMetricDefined('base-game', 'win')
  })
})
