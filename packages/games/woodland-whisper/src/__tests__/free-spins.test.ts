import { describe, expect, it } from 'bun:test'
import type { WoodlandWhisperFreeResult } from '../game-state-machine.js'
import { woodlandWhisperTestEngine as engine } from './test-engine.js'

describe('free-spins / next()', () => {
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
