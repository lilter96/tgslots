import { describe, expect, it } from 'bun:test'
import type { WoodlandWhisperBaseResult, WoodlandWhisperPickResult } from '../game-state-machine.js'
import { generatePickBonus } from '../logic.js'
import { woodlandWhisperTestEngine as engine } from './test-engine.js'

describe('WoodlandWhisper Logic', () => {
  it('generatePickBonus should create a valid 20-item board and pick sequence', () => {
    const session = engine.session({ seed: 42 })
    const winValue = 10
    const { board, pickSequence } = generatePickBonus(winValue).sample(session.rng)

    expect(board.length).toBe(20)
    expect(pickSequence.length).toBeGreaterThanOrEqual(2)

    const counts = new Map<number, number>()
    for (const value of board) {
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }

    for (const count of counts.values()) {
      expect(count).toBe(2)
    }

    const seen = new Set<number>()
    let matchedValue = -1

    for (let i = 0; i < pickSequence.length; i++) {
      const index = pickSequence[i]
      if (index === undefined) throw new Error('pickSequence index undefined')

      const value = board[index]
      if (value === undefined) throw new Error('board value undefined')

      if (seen.has(value)) {
        matchedValue = value
        expect(i).toBe(pickSequence.length - 1)
        break
      }

      seen.add(value)
    }

    expect(matchedValue).toBe(winValue)
  })
})

describe('WoodlandWhisperStateMachine', () => {
  it('transitions from BASE to PICK to FREE via registered actions', () => {
    const session = engine.session({ seed: 12345 })

    session.withinRound(() => {
      const baseResult = session.act('spin') as WoodlandWhisperBaseResult
      expect(baseResult.type).toBe('BASE')
      expect(baseResult.grid.length).toBe(3)
      expect(baseResult.grid[0]?.length).toBe(5)

      if (!baseResult.triggeredPickBonus) {
        return
      }

      expect(session.sm.state.pickBonus).not.toBeNull()

      let lastPick: WoodlandWhisperPickResult | undefined
      while (session.sm.state.pickBonus) {
        lastPick = session.act('pickBall', 0) as WoodlandWhisperPickResult
      }

      expect(lastPick?.pick.isMatch).toBe(true)
      expect(session.sm.state.freeSpins).not.toBeNull()
      expect(session.sm.state.freeSpins?.spinsRemaining).toBeGreaterThan(0)

      const initialSpins = session.sm.state.freeSpins?.spinsRemaining ?? 0
      const freeResult = session.act('next')
      expect(freeResult?.type).toBe('FREE')
      expect(session.sm.state.freeSpins?.spinsRemaining).toBe(initialSpins - 1)
    })
  })

  it('is recoverable from a seeded pick-bonus state', () => {
    const board = [10, 8, 10, 8, 15, 15, 20, 20, 30, 30, 50, 50, 75, 75, 100, 100, 13, 13, 9, 9]
    const session = engine.session()

    session.scenario('withPickBonus', {
      board,
      pickSequence: [0, 1, 2],
      currentPickIndex: 1,
      freeSpins: {
        triggeringWager: session.wager,
        totalWin: 100,
        spinsRemaining: 5,
      },
      revealedValues: [10],
      userPicks: [0],
      winValue: 10,
    })

    const firstPick = session.act('pickBall', 5) as WoodlandWhisperPickResult
    expect(firstPick.pick.revealedIndex).toBe(1)
    expect(firstPick.pick.value).toBe(8)
    expect(firstPick.pick.isMatch).toBe(false)
    expect(firstPick.pick.userIndex).toBe(5)
    expect(session.sm.state.pickBonus?.userPicks).toEqual([0, 5])

    const matchPick = session.act('pickBall', 7) as WoodlandWhisperPickResult
    expect(matchPick.pick.revealedIndex).toBe(2)
    expect(matchPick.pick.value).toBe(10)
    expect(matchPick.pick.isMatch).toBe(true)
    expect(session.sm.state.pickBonus).toBeNull()
    expect(session.sm.state.freeSpins?.spinsRemaining).toBe(15)
  })

  it('uses pickSequence as the reveal source regardless of the tapped card', () => {
    const board = [10, 8, 10, 8, 15, 15, 20, 20, 30, 30, 50, 50, 75, 75, 100, 100, 13, 13, 9, 9]
    const session = engine.session()

    session.scenario('withPickBonus', {
      board,
      pickSequence: [4, 7, 0, 2],
      winValue: 10,
    })

    const first = session.act('pickBall', 19) as WoodlandWhisperPickResult
    expect(first.pick.revealedIndex).toBe(4)
    expect(first.pick.value).toBe(15)
    expect(first.pick.userIndex).toBe(19)
    expect(first.pick.isMatch).toBe(false)

    const second = session.act('pickBall', 0) as WoodlandWhisperPickResult
    expect(second.pick.revealedIndex).toBe(7)
    expect(second.pick.value).toBe(20)
    expect(second.pick.isMatch).toBe(false)

    const third = session.act('pickBall', 0) as WoodlandWhisperPickResult
    expect(third.pick.revealedIndex).toBe(0)
    expect(third.pick.value).toBe(10)
    expect(third.pick.isMatch).toBe(false)

    const fourth = session.act('pickBall', 0) as WoodlandWhisperPickResult
    expect(fourth.pick.revealedIndex).toBe(2)
    expect(fourth.pick.value).toBe(10)
    expect(fourth.pick.isMatch).toBe(true)
    expect(session.sm.state.pickBonus).toBeNull()
    expect(session.sm.state.freeSpins?.spinsRemaining).toBe(10)
  })

  it('records scatter-win metrics through the shared harness', () => {
    const baseSession = engine.session({ seed: 42 })
    baseSession.act('spin')
    baseSession.assertMetricDefined('base-game', 'scatter-win')

    const freeSession = engine.session({ seed: 77 })
    freeSession.scenario('withFreeSpins', { spinsRemaining: 3 })
    freeSession.act('next')
    freeSession.assertMetricDefined('features/free-spins', 'scatter-win')
  })
})
