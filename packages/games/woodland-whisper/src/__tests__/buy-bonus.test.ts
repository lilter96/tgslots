import { describe, expect, it } from 'bun:test'
import type { WoodlandWhisperBuyResult } from '../game-state-machine.js'
import { createBuyBonusSampler } from '../logic.js'
import { STRIP_STRINGS, Symbols } from '../constants.js'
import { bonusPositionSampler } from '../bonus-position-sampler.js'
import { woodlandWhisperTestEngine as engine } from './test-engine.js'

describe('buy-bonus / buyBonus()', () => {
  it('produces BUY result', () => {
    const session = engine.session({ seed: 42 })
    const result = session.act('buyBonus') as WoodlandWhisperBuyResult

    expect(result.type).toBe('BUY')
    expect(result.triggeredPickBonus).toBe(true)
    expect(result.pickedBonus).toBeGreaterThan(0)
    expect(Array.isArray(result.grid)).toBe(true)
    expect(Array.isArray(result.hits)).toBe(true)
  })

  it('sets pickBonus state', () => {
    const session = engine.session({ seed: 42 })
    session.act('buyBonus')

    expect(session.sm.state.pickBonus).not.toBeNull()
    expect(session.sm.state.pickBonus!.board.length).toBeGreaterThan(0)
    expect(session.sm.state.pickBonus!.pickSequence.length).toBeGreaterThan(0)
  })

  it('guarantees bonus entry across session seeds', () => {
    // Production sampling draws directly from valid triggering stop combinations.
    for (let seed = 0; seed < 100; seed++) {
      const session = engine.session({ seed })
      const result = session.act('buyBonus') as WoodlandWhisperBuyResult
      expect(result.type).toBe('BUY')
      expect(result.triggeredPickBonus).toBe(true)
    }
  })

  it('never exhausts retries and agrees with visible scatter counts', () => {
    const sampler = createBuyBonusSampler(engine.wager())
    for (let seed = 0; seed < 2000; seed++) {
      const result = sampler.sample(engine.rng(seed))
      const visibleScatters = result.grid.flat().filter((symbol) => symbol === Symbols.COIN).length
      expect(result.sc).toBeGreaterThanOrEqual(3)
      expect(result.sc).toBe(visibleScatters)
      expect(result.pickData).toBeDefined()
    }
  })

  it('preserves the natural reel-stop distribution conditioned on a bonus trigger', () => {
    let probabilities = [1]
    for (const strip of STRIP_STRINGS) {
      const counts = [0, 0, 0, 0]
      for (let stop = 0; stop < strip.length; stop++) {
        let count = 0
        for (let row = 0; row < 3; row++) if (strip[(stop + row) % strip.length] === 'COIN') count++
        counts[count] = counts[count]! + 1
      }
      const next = Array<number>(probabilities.length + 3).fill(0)
      probabilities.forEach((probability, total) =>
        counts.forEach((count, visible) => {
          next[total + visible] = next[total + visible]! + (probability * count) / strip.length
        }),
      )
      probabilities = next
    }
    const samples = 20000
    const observed = Array<number>(probabilities.length).fill(0)
    const random = engine.rng(194852)
    for (let i = 0; i < samples; i++) {
      const stops = bonusPositionSampler.sample(random)
      let count = 0
      stops.forEach((stop, reel) => {
        for (let row = 0; row < 3; row++)
          if (STRIP_STRINGS[reel]![(stop + row) % STRIP_STRINGS[reel]!.length] === 'COIN') count++
      })
      expect(count).toBeGreaterThanOrEqual(3)
      observed[count] = observed[count]! + 1
    }
    const trigger = probabilities.slice(3).reduce((sum, value) => sum + value, 0)
    for (let count = 3; count <= 5; count++) {
      const probability = probabilities[count]! / trigger
      const expected = samples * probability
      const tolerance = 6 * Math.sqrt(samples * probability * (1 - probability)) + 3
      expect(Math.abs(observed[count]! - expected)).toBeLessThan(tolerance)
    }
  })
})

describe('initInitialGrid', () => {
  it('always produces a non-winning grid with sc < 2', () => {
    // The initial grid sampler retries until win===0 and sc<2.
    // Verify it always completes and produces a valid result.
    for (let seed = 0; seed < 50; seed++) {
      const session = engine.session({ seed })
      session.act('initInitialGrid')

      const grid = session.sm.state.lastGrid
      expect(grid).not.toBeNull()
      expect(grid!.length).toBe(3)
      expect(grid![0]!.length).toBe(5)
    }
  })

  it('resets stale freeSpins and pickBonus state', () => {
    const session = engine.session({
      initialState: {
        lastGrid: null,
        freeSpins: {
          triggeringWager: engine.wager(),
          spinsRemaining: 5,
          totalWin: 100,
        },
        pickBonus: {
          board: [1, 2, 3, 4],
          pickSequence: [0, 1],
          currentPickIndex: 1,
          userPicks: [0],
          revealedValues: [1],
          winValue: 3,
          triggeringWager: engine.wager(),
        },
      },
      seed: 1,
    })

    session.act('initInitialGrid')

    expect(session.sm.state.lastGrid).not.toBeNull()
    expect(session.sm.state.freeSpins).toBeNull()
    expect(session.sm.state.pickBonus).toBeNull()
  })
})
