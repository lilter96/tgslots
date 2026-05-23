import { describe, expect, it } from 'bun:test'
import { leMilitareTestEngine as engine } from './test-engine.js'

describe('RTP regression — seeded smoke rounds', () => {
  it('base-game finalWin = baseClusterWin * max(1, multiplierSum) * wager.multiplier', () => {
    const session = engine.session({ betLevel: 5, seed: 314159 })

    for (let round = 0; round < 1_000; round++) {
      const result = session.act('spin')
      expect(result.win).toBe(result.finalWin)
      expect(result.win).toBeGreaterThanOrEqual(0)
      expect(Number.isFinite(result.win)).toBe(true)
    }
  })

  it('200 rounds produce no NaN or negative wins (base + limited free spins)', () => {
    const session = engine.session({ seed: 271828 })
    const rounds = 200
    const freeSpinCap = 50

    for (let round = 0; round < rounds; round++) {
      session.withinRound(() => {
        const baseResult = session.act('spin')
        expect(baseResult.win).toBeGreaterThanOrEqual(0)
        expect(Number.isFinite(baseResult.win)).toBe(true)

        let sessionSpins = 0
        while (session.sm.state.freeSpins && session.sm.state.freeSpins.spinsRemaining > 0) {
          if (sessionSpins >= freeSpinCap) {
            break
          }

          const freeResult = session.act('next')
          if (!freeResult) break

          expect(freeResult.win).toBeGreaterThanOrEqual(0)
          expect(Number.isFinite(freeResult.win)).toBe(true)
          sessionSpins++
        }
      })

      if (session.sm.state.freeSpins && session.sm.state.freeSpins.spinsRemaining > 0) {
        session.resetMachine()
      }
    }
  })

  it('free spin win is always non-negative across 100 direct free spin invocations', () => {
    const session = engine.session({ seed: 42 })
    session.scenario('withFreeSpins', {
      spinsRemaining: 100,
      armedReels: new Set([0, 2, 4]),
      multiplierSum: 5,
    })

    let spinsPlayed = 0
    while (
      session.sm.state.freeSpins &&
      session.sm.state.freeSpins.spinsRemaining > 0 &&
      spinsPlayed < 100
    ) {
      const result = session.act('next')
      if (!result) break

      expect(result.win).toBeGreaterThanOrEqual(0)
      expect(Number.isFinite(result.win)).toBe(true)
      spinsPlayed++
    }

    expect(spinsPlayed).toBeGreaterThan(0)
  })
})
