import { describe, expect, it } from 'bun:test'
import type { WoodlandWhisperBuyResult } from '../game-state-machine.js'
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
})
