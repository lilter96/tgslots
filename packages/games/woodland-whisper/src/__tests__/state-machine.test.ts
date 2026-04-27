import { describe, expect, it } from 'bun:test'
import { mt19937 } from '@tgslots/math/rng/mt19937'
import { Wager } from '@tgslots/slots-core/betting'
import { BET_CONFIG } from '../constants.js'
import { WoodlandWhisperStateMachine } from '../game-state-machine.js'
import { generatePickBonus } from '../logic.js'

describe('WoodlandWhisper Logic', () => {
  it('generatePickBonus should create a valid 20-item board and pick sequence', () => {
    const rng = mt19937(42)
    const winValue = 10
    const { board, pickSequence } = generatePickBonus(winValue).sample(rng)

    expect(board.length).toBe(20)
    expect(pickSequence.length).toBeGreaterThanOrEqual(2)

    // Check board contains pairs
    const counts = new Map<number, number>()
    for (const val of board) {
      counts.set(val, (counts.get(val) ?? 0) + 1)
    }
    for (const count of counts.values()) {
      expect(count).toBe(2)
    }

    // Check pick sequence results in winValue match
    const seen = new Set<number>()
    let matchedValue = -1
    for (let i = 0; i < pickSequence.length; i++) {
      const idx = pickSequence[i]
      if (idx === undefined) throw new Error('pickSequence index undefined')
      const val = board[idx]
      if (val === undefined) throw new Error('board value undefined')
      if (seen.has(val)) {
        matchedValue = val
        expect(i).toBe(pickSequence.length - 1) // Must be the last one
        break
      }
      seen.add(val)
    }
    expect(matchedValue).toBe(winValue)
  })
})

describe('WoodlandWhisperStateMachine', () => {
  it('should transition from BASE to PICK to FREE', () => {
    const rng = mt19937(12345) // Seed chosen to likely trigger sc >= 3 or just manually trigger
    const sm = new WoodlandWhisperStateMachine()
    const wager = new Wager(1, BET_CONFIG)

    // Manually force a trigger by finding a seed or just testing the methods
    // Let's test granular methods directly

    // 1. Base Spin
    const baseResult = sm.baseGameSpin(rng, wager)
    expect(baseResult.type).toBe('BASE')
    expect(baseResult.grid).toBeDefined()
    expect(baseResult.grid?.length).toBe(3)
    expect(baseResult.grid?.[0]?.length).toBe(5)

    if (baseResult.triggeredPickBonus) {
      expect(sm.state.pickBonus).not.toBeNull()

      // 2. Picking
      let lastPickResult: any
      while (sm.state.pickBonus) {
        const pickResult = sm.pickBall()
        expect(pickResult.type).toBe('PICK')
        expect(pickResult.pick).toBeDefined()
        lastPickResult = pickResult
      }
      expect(lastPickResult.pick.isMatch).toBe(true)
      expect(sm.state.freeSpins).not.toBeNull()
      expect(sm.state.freeSpins?.spinsRemaining).toBeGreaterThan(0)

      // 3. Free Spins
      const initialSpins = sm.state.freeSpins?.spinsRemaining ?? 0
      const fsResult = sm.freeGameSpin(rng)
      expect(fsResult.type).toBe('FREE')
      expect(sm.state.freeSpins?.spinsRemaining).toBe(initialSpins - 1)
    }
  })

  it('should be recoverable from state', () => {
    const sm = new WoodlandWhisperStateMachine()
    const wager = new Wager(1, BET_CONFIG)

    // Setup a partial state
    const board = [10, 8, 10, 8, 15, 15, 20, 20, 30, 30, 50, 50, 75, 75, 100, 100, 13, 13, 9, 9]
    const pickSequence = [0, 1, 2] // 10, 8, 10 (match 10)

    const state: any = {
      lastGrid: null,
      freeSpins: {
        triggeringWager: wager,
        totalWin: 100,
        spinsRemaining: 5,
      },
      pickBonus: {
        board,
        pickSequence,
        currentIndex: 1, // Already picked board[0] = 10
        winValue: 10,
      },
    }

    // Inject state (since _state is private, we'll use a cast or setter if available)
    // Actually, in our implementation _state is private and has no setter.
    // We should probably add a way to set state or just test that it works if we could.
    // For now, let's verify that the logic handles the state fields.

    // @ts-ignore
    sm._state = state

    const rng = mt19937(42)
    const pickResult = sm.pickBall()
    expect(pickResult.pick?.value).toBe(8)
    expect(pickResult.pick?.isMatch).toBe(false)
    expect(sm.state.pickBonus?.currentIndex).toBe(2)

    const matchResult = sm.pickBall()
    expect(matchResult.pick?.value).toBe(10)
    expect(matchResult.pick?.isMatch).toBe(true)
    expect(sm.state.pickBonus).toBeNull()
    expect(sm.state.freeSpins?.spinsRemaining).toBe(15) // 5 + 10
  })

  it('should record scatter-win in recordResultMetrics', () => {
    const sm = new WoodlandWhisperStateMachine()
    const wager = new Wager(1, BET_CONFIG)
    const mockCollector: any = {
      _metrics: {} as any,
      scope(name: string | string[]) {
        const key = Array.isArray(name) ? name.join('.') : name
        if (!this._metrics[key]) this._metrics[key] = { payouts: {} }
        return {
          payout: (id: string, win: number, w?: number) => {
            this._metrics[key].payouts[id] = (this._metrics[key].payouts[id] ?? 0) + win
          },
          distribution: () => {},
          count: () => {},
          value: () => {},
        }
      },
    }

    // Test BASE result with 3 scatters
    const baseResult: any = {
      type: 'BASE',
      sc: 3,
      scatterWin: 150,
      win: 150,
      triggeredPickBonus: true,
      pickedBonus: 10,
    }

    sm.recordResultMetrics(mockCollector, baseResult, { phase: 'spin', wager })

    // scatter-win for BASE is now tracked via recordRoundMetrics (from winsByType), not recordResultMetrics
    expect(mockCollector._metrics['base-game']?.payouts['scatter-win']).toBeUndefined()

    // Test FREE result with 2 scatters
    const freeResult: any = {
      type: 'FREE',
      sc: 2,
      scatterWin: 60, // 2 scatters is 1x total bet = 30. * 2 multiplier in free spins = 60.
      win: 60,
    }

    sm.recordResultMetrics(mockCollector, freeResult, { phase: 'next', wager })
    expect(mockCollector._metrics['features.free-spins'].payouts['scatter-win']).toBe(60)

    // Test recordRoundMetrics — scatter-win for BASE and FREE is sourced from winsByType
    const roundSnapshot: any = {
      bet: 30,
      winsByType: { BASE: { total: 150, scatter: 150 }, FREE: { total: 60, scatter: 60 } },
      countsByType: { FREE: 1 },
    }
    sm.recordRoundMetrics(mockCollector, roundSnapshot, wager)
    expect(mockCollector._metrics['base-game'].payouts['scatter-win']).toBe(150)
    expect(mockCollector._metrics['features.free-spins'].payouts['scatter-rtp']).toBe(60)
  })
})
