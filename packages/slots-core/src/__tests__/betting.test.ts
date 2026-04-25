import { describe, expect, it } from 'bun:test'
import { BetConfiguration, MultiFrameBetConfiguration } from '../betting/config.js'
import { Wager, WagerBreakdown } from '../betting/wager.js'

const TEST_DENOM = { id: '1c', valueInCents: 1, label: '$0.01' }

describe('Betting System', () => {
  describe('BetConfiguration', () => {
    it('should calculate cost per line correctly', () => {
      const config = BetConfiguration.fromBaseCostAndLineCountAndSideBet(40, 30, 10)
      expect(config.baseCost).toBe(40)
      expect(config.lineCount).toBe(30)
      expect(config.sideBetBase).toBe(10)
      expect(config.costPerLine).toBe(1)
    })

    it('should throw on inconsistent values', () => {
      expect(() => new BetConfiguration(40, 30, 1, 5)).toThrow()
    })

    it('should throw on fractional costs', () => {
      // (40 - 5) / 30 = 1.1666... (fractional cost per line) is now DISALLOWED
      expect(() => BetConfiguration.fromBaseCostAndLineCountAndSideBet(40, 30, 5)).toThrow()
    })

    it('should handle integer cost per line', () => {
      const config = new BetConfiguration(50, 10, 5, 0)
      expect(config.baseCost).toBe(50)
      expect(config.costPerLine).toBe(5)
    })
  })

  describe('Wager', () => {
    it('should calculate total credits and amount correctly', () => {
      const config = BetConfiguration.fromLineCount(30)
      const wager = new Wager(2, TEST_DENOM, config)

      expect(wager.totalCredits).toBe(60)
      expect(wager.totalAmountInCents).toBe(60) // 60 * 1c
    })

    it('should calculate amount for different denoms', () => {
      const config = BetConfiguration.fromLineCount(30)
      const denom5c = { id: '5c', valueInCents: 5, label: '$0.05' }
      const wager = new Wager(1, denom5c, config)

      expect(wager.totalCredits).toBe(30)
      expect(wager.totalAmountInCents).toBe(150) // 30 * 5c
    })
  })

  describe('WagerBreakdown', () => {
    it('should break down a standard wager correctly', () => {
      // 30 lines, 1 unit per line, 10 units side bet = 40 base units
      const config = BetConfiguration.fromBaseCostAndLineCountAndSideBet(40, 30, 10)

      const wager = new Wager(2, TEST_DENOM, config)
      const breakdown = WagerBreakdown.fromWager(wager)

      expect(breakdown.betMultiplier).toBe(2)
      expect(breakdown.lineCount).toBe(30)
      expect(breakdown.creditsPerLine).toBe(2) // 1 * 2
      expect(breakdown.totalLineWager).toBe(60) // 2 * 30
      expect(breakdown.totalSideBet).toBe(20) // 10 * 2
      expect(breakdown.totalWager).toBe(80)
    })
  })

  describe('MultiFrame Wager', () => {
    it('should break down multi-frame wagers', () => {
      const perFrame = BetConfiguration.fromLineCount(30) // 30 units
      const multiConfig = MultiFrameBetConfiguration.build(perFrame, 4) // 4 frames = 120 units

      expect(multiConfig.allFrames.baseCost).toBe(120)

      const betMultiplier = 2
      const multiBreakdown = WagerBreakdown.fromMulti(betMultiplier, multiConfig)

      expect(multiBreakdown.frameCount).toBe(4)
      expect(multiBreakdown.perFrame.betMultiplier).toBe(2)
      expect(multiBreakdown.perFrame.totalWager).toBe(60)
      expect(multiBreakdown.totalWager).toBe(240)
    })
  })

  describe('Serialization', () => {
    it('should serialize to JSON correctly', () => {
      const config = BetConfiguration.fromLineCount(30)
      const wager = new Wager(1, TEST_DENOM, config)
      const json = JSON.parse(JSON.stringify(wager))

      expect(json.betMultiplier).toBe(1)
      expect(json.totalCredits).toBe(30)
      expect(json.config.baseCost).toBe(30)
    })
  })
})
