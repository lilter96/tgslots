import { describe, expect, it } from 'bun:test'
import { deriveFreeCarryOverMultiplier } from '../helpers/free-spins-math.js'
import type {
  LeMilitareBaseResult,
  LeMilitareFreeResult,
  LeMilitareBuyResult,
} from '@tgslots/le-militare'

function freeResult(multiplierSum: number, sessionMultiplierSum: number): LeMilitareFreeResult {
  return {
    type: 'FREE',
    win: 0,
    components: { total: 0 },
    scatterCount: 0,
    retriggered: false,
    freeSpinsAwarded: 0,
    steps: [],
    multiplierSum,
    finalWin: 0,
    state: { freeSpinsLeft: 0, totalFreeSpinWin: 0, sessionMultiplierSum },
  }
}

function baseResult(): LeMilitareBaseResult {
  return {
    type: 'BASE',
    win: 0,
    components: { total: 0 },
    scatterCount: 0,
    triggeredFreeSpins: false,
    freeSpinsAwarded: 0,
    steps: [],
    multiplierSum: 0,
    finalWin: 0,
    state: { freeSpinsLeft: 0, totalFreeSpinWin: 0, sessionMultiplierSum: 0 },
  }
}

function buyResult(): LeMilitareBuyResult {
  return {
    type: 'BUY',
    win: 0,
    components: { total: 0 },
    scatterCount: 0,
    triggeredFreeSpins: true,
    freeSpinsAwarded: 10,
    steps: [],
    multiplierSum: 0,
    finalWin: 0,
    state: { freeSpinsLeft: 10, totalFreeSpinWin: 0, sessionMultiplierSum: 0 },
  }
}

describe('deriveFreeCarryOverMultiplier', () => {
  it('returns 0 for BASE result', () => {
    expect(deriveFreeCarryOverMultiplier(baseResult())).toBe(0)
  })

  it('returns 0 for BUY result', () => {
    expect(deriveFreeCarryOverMultiplier(buyResult())).toBe(0)
  })

  it('returns 0 on first free spin (no prior multiplier)', () => {
    expect(deriveFreeCarryOverMultiplier(freeResult(3, 3))).toBe(0)
  })

  it('returns the carry-over from prior free spins', () => {
    // session has accumulated 7 total; this spin contributed 3 → carry-over was 4
    expect(deriveFreeCarryOverMultiplier(freeResult(3, 7))).toBe(4)
  })

  it('returns 0 when no combat ops happened this spin (multiplierSum = 0)', () => {
    expect(deriveFreeCarryOverMultiplier(freeResult(0, 5))).toBe(5)
  })
})
