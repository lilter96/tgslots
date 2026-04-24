import { describe, expect, it } from 'bun:test'
import { BetConfiguration, MultiFrameBetConfiguration } from '../betting/config.js'
import { Bet, WagerBreakdown } from '../betting/wager.js'

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

    it('should handle fractional cost per line', () => {
      const config = BetConfiguration.fromBaseCostAndLineCountAndSideBet(35, 30, 5)
      expect(config.costPerLine).toBe(1)

      const config2 = new BetConfiguration(50, 20, 2.5, 0)
      expect(config2.baseCost).toBe(50)
    })
  })

  describe('WagerBreakdown', () => {
    it('should break down a standard wager correctly', () => {
      // 30 lines, 1 unit per line, 10 units side bet = 40 base units
      const config = BetConfiguration.fromBaseCostAndLineCountAndSideBet(40, 30, 10)

      // Player bets 80 credits
      const bet = Bet.fromTotalWager(80, config)
      expect(bet.betMultiplier).toBe(2)

      const breakdown = WagerBreakdown.fromBet(bet, config)
      expect(breakdown.betMultiplier).toBe(2)
      expect(breakdown.lineCount).toBe(30)
      expect(breakdown.creditsPerLine).toBe(2) // 1 * 2
      expect(breakdown.totalLineWager).toBe(60) // 2 * 30
      expect(breakdown.totalSideBet).toBe(20) // 10 * 2
      expect(breakdown.totalWager).toBe(80)
    })

    it('should handle fractional credits per line', () => {
      // 20 lines, 0.5 units per line, 0 side bet = 10 base units
      const config = BetConfiguration.fromLineCountAndCostPerLine(20, 0.5)

      // Player bets 50 credits
      const bet = Bet.fromTotalWager(50, config)
      expect(bet.betMultiplier).toBe(5)

      const breakdown = WagerBreakdown.fromBet(bet, config)
      expect(breakdown.creditsPerLine).toBe(2.5) // 0.5 * 5
      expect(breakdown.totalLineWager).toBe(50)
    })
  })

  describe('MultiFrame Wager', () => {
    it('should break down multi-frame wagers', () => {
      const perFrame = BetConfiguration.fromLineCount(30) // 30 units
      const multiConfig = MultiFrameBetConfiguration.build(perFrame, 4) // 4 frames = 120 units

      expect(multiConfig.allFrames.baseCost).toBe(120)

      const totalWager = 240 // betMultiplier = 2
      const betAll = Bet.fromTotalWagerMulti(totalWager, multiConfig)
      expect(betAll.betMultiplier).toBe(2)

      const multiBreakdown = WagerBreakdown.fromMulti(betAll, multiConfig)
      expect(multiBreakdown.frameCount).toBe(4)
      expect(multiBreakdown.perFrame.betMultiplier).toBe(2)
      expect(multiBreakdown.perFrame.totalWager).toBe(60)
      expect(multiBreakdown.totalWager).toBe(240)
    })
  })
})
