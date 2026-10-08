import { expect, test } from 'bun:test'
import { collectCashPrizes } from '../collector/cash-prizes'
test('collector combines integer prizes at one authoritative multiplier', () => {
  expect(collectCashPrizes([{ value: 20 }, { value: 50 }], 7)).toBe(490)
  expect(collectCashPrizes([])).toBe(0)
})
test('collector rejects invalid prizes, multipliers and overflow', () => {
  for (const value of [-1, 1.5, NaN]) expect(() => collectCashPrizes([{ value }])).toThrow()
  expect(() => collectCashPrizes([{ value: 1 }], 0)).toThrow()
  expect(() => collectCashPrizes([{ value: Number.MAX_SAFE_INTEGER }], 2)).toThrow()
})
