import { describe, expect, it } from 'bun:test'
import { isBuyBonusEnabled, formatBuyBonusCostLabel } from '../helpers/buy-bonus-rules.js'
import { GameUIState } from '../../../types.js'

describe('formatBuyBonusCostLabel', () => {
  it('formats the cost multiplier as a bet label', () => {
    expect(formatBuyBonusCostLabel(100)).toBe('100x BET')
    expect(formatBuyBonusCostLabel(50)).toBe('50x BET')
  })
})

describe('isBuyBonusEnabled', () => {
  it('is enabled when idle with no auto-spin and no free spins', () => {
    expect(
      isBuyBonusEnabled({ uiState: GameUIState.IDLE, isAutoSpin: false, freeSpinsRemaining: 0 }),
    ).toBe(true)
  })

  it('is disabled while spinning', () => {
    expect(
      isBuyBonusEnabled({
        uiState: GameUIState.SPINNING,
        isAutoSpin: false,
        freeSpinsRemaining: 0,
      }),
    ).toBe(false)
  })

  it('is disabled during auto-spin', () => {
    expect(
      isBuyBonusEnabled({ uiState: GameUIState.IDLE, isAutoSpin: true, freeSpinsRemaining: 0 }),
    ).toBe(false)
  })

  it('is disabled when free spins are active', () => {
    expect(
      isBuyBonusEnabled({ uiState: GameUIState.IDLE, isAutoSpin: false, freeSpinsRemaining: 5 }),
    ).toBe(false)
  })

  it('is disabled in WIN_SHOW state', () => {
    expect(
      isBuyBonusEnabled({
        uiState: GameUIState.WIN_SHOW,
        isAutoSpin: false,
        freeSpinsRemaining: 0,
      }),
    ).toBe(false)
  })
})
