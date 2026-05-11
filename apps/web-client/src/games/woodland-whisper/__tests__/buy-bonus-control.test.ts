import { describe, expect, it } from 'bun:test'
import { formatBuyBonusCostLabel, isBuyBonusEnabled } from '../buy-bonus-control.js'
import { GameUIState } from '../../../types.js'

describe('buy-bonus control helpers', () => {
  it('formats the configured cost label for the HUD button', () => {
    expect(formatBuyBonusCostLabel(100)).toBe('100x BET')
  })

  it('is enabled only while the UI is idle with no auto-spin or free spins active', () => {
    expect(
      isBuyBonusEnabled({
        uiState: GameUIState.IDLE,
        isAutoSpin: false,
        freeSpinsRemaining: 0,
      }),
    ).toBe(true)

    expect(
      isBuyBonusEnabled({
        uiState: GameUIState.SPINNING,
        isAutoSpin: false,
        freeSpinsRemaining: 0,
      }),
    ).toBe(false)

    expect(
      isBuyBonusEnabled({
        uiState: GameUIState.IDLE,
        isAutoSpin: true,
        freeSpinsRemaining: 0,
      }),
    ).toBe(false)

    expect(
      isBuyBonusEnabled({
        uiState: GameUIState.IDLE,
        isAutoSpin: false,
        freeSpinsRemaining: 3,
      }),
    ).toBe(false)
  })
})
