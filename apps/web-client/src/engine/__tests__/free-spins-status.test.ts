import { describe, expect, it } from 'bun:test'
import type { WoodlandWhisperState } from '@tgslots/woodland-whisper/game-state-machine'
import {
  deriveAwardedFreeSpins,
  deriveFreeSpinsStatus,
  formatFreeSpinsAwardedMessage,
} from '../free-spins-status'

function makeState(spinsRemaining: number | null): WoodlandWhisperState {
  return {
    lastGrid: null,
    freeSpins:
      spinsRemaining === null
        ? null
        : {
            triggeringWager: {} as never,
            totalWin: 0,
            spinsRemaining,
          },
    pickBonus: null,
  }
}

describe('free-spins status helpers', () => {
  it('derives awarded spins when a pick bonus starts free spins', () => {
    expect(deriveAwardedFreeSpins(makeState(null), makeState(10))).toBe(10)

    expect(deriveFreeSpinsStatus(makeState(10), 10)).toEqual({
      active: true,
      remaining: 10,
      awarded: 10,
    })
  })

  it('derives awarded spins when free spins retrigger on top of remaining spins', () => {
    expect(deriveAwardedFreeSpins(makeState(3), makeState(13))).toBe(10)

    expect(deriveFreeSpinsStatus(makeState(13), 10)).toEqual({
      active: true,
      remaining: 13,
      awarded: 10,
    })
  })

  it('does not invent an awarded amount when restoring an active session', () => {
    expect(deriveFreeSpinsStatus(makeState(5))).toEqual({
      active: true,
      remaining: 5,
      awarded: null,
    })
  })

  it('treats zero remaining spins as inactive even if the state object still exists', () => {
    expect(deriveFreeSpinsStatus(makeState(0))).toEqual({
      active: false,
      remaining: 0,
      awarded: null,
    })
  })

  it('formats the free-spins award announcement copy with the awarded amount', () => {
    expect(formatFreeSpinsAwardedMessage(10)).toBe('10 FREE SPINS WON')
  })
})
