import { describe, expect, it } from 'bun:test'
import { BetConfiguration, MultiFrameBetConfiguration } from '../betting/config.js'
import { Wager } from '../betting/wager.js'

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
      expect(() => BetConfiguration.fromBaseCostAndLineCountAndSideBet(40, 30, 5)).toThrow()
    })

    it('should handle integer cost per line', () => {
      const config = new BetConfiguration(50, 10, 5, 0)
      expect(config.baseCost).toBe(50)
      expect(config.costPerLine).toBe(5)
    })

    it('fromBaseCost creates config with cost=1 per line, no side bet', () => {
      const config = BetConfiguration.fromBaseCost(30)
      expect(config.baseCost).toBe(30)
      expect(config.lineCount).toBe(30)
      expect(config.costPerLine).toBe(1)
      expect(config.sideBetBase).toBe(0)
    })

    it('fromLineCountAndCostPerLine creates config with custom cost per line', () => {
      const config = BetConfiguration.fromLineCountAndCostPerLine(10, 5)
      expect(config.baseCost).toBe(50)
      expect(config.lineCount).toBe(10)
      expect(config.costPerLine).toBe(5)
      expect(config.sideBetBase).toBe(0)
    })

    it('fromLineCountAndCostPerLineAndSideBet includes side bet in base cost', () => {
      const config = BetConfiguration.fromLineCountAndCostPerLineAndSideBet(10, 2, 5)
      expect(config.baseCost).toBe(25) // 10*2 + 5
      expect(config.lineCount).toBe(10)
      expect(config.costPerLine).toBe(2)
      expect(config.sideBetBase).toBe(5)
    })

    it('fromBaseCostAndLineCount derives side bet from the difference', () => {
      const config = BetConfiguration.fromBaseCostAndLineCount(40, 30)
      expect(config.baseCost).toBe(40)
      expect(config.lineCount).toBe(30)
      expect(config.costPerLine).toBe(1)
      expect(config.sideBetBase).toBe(10) // 40 - 30
    })

    it('rejects negative baseCost', () => {
      expect(() => new BetConfiguration(-1, 10, 1, 0)).toThrow()
    })

    it('rejects fractional lineCount', () => {
      expect(() => new BetConfiguration(30, 1.5, 1, 0)).toThrow()
    })

    it('toJSON serializes all fields', () => {
      const config = BetConfiguration.fromLineCount(30)
      const json = config.toJSON()
      expect(json.baseCost).toBe(30)
      expect(json.lineCount).toBe(30)
      expect(json.costPerLine).toBe(1)
      expect(json.sideBetBase).toBe(0)
    })
  })

  describe('Wager', () => {
    it('should calculate breakdown correctly', () => {
      // 30 lines, 1 unit per line, 10 units side bet = 40 base units
      const config = BetConfiguration.fromBaseCostAndLineCountAndSideBet(40, 30, 10)

      const wager = new Wager(2, config)

      expect(wager.multiplier).toBe(2)
      expect(wager.creditsPerLine).toBe(2) // 1 * 2
      expect(wager.totalLineWager).toBe(60) // 2 * 30
      expect(wager.totalSideBet).toBe(20) // 10 * 2
      expect(wager.totalWager).toBe(80)
    })

    it('should throw on non-integer multiplier', () => {
      const config = BetConfiguration.fromLineCount(30)
      expect(() => new Wager(1.5, config)).toThrow()
    })
  })

  describe('MultiFrame Wager', () => {
    it('should break down multi-frame wagers', () => {
      const perFrame = BetConfiguration.fromLineCount(30) // 30 units
      const multiConfig = MultiFrameBetConfiguration.build(perFrame, 4) // 4 frames = 120 units

      expect(multiConfig.allFrames.baseCost).toBe(120)

      const multiplier = 2
      const wagers = Wager.forMultiFrame(multiplier, multiConfig)

      expect(wagers.length).toBe(4)
      expect(wagers[0]!.multiplier).toBe(2)
      expect(wagers[0]!.totalWager).toBe(60)
    })
  })

  describe('MultiFrameBetConfiguration', () => {
    it('build creates scaled allFrames config', () => {
      const perFrame = BetConfiguration.fromLineCountAndCostPerLineAndSideBet(10, 2, 5)
      const multi = MultiFrameBetConfiguration.build(perFrame, 3)
      expect(multi.allFrames.baseCost).toBe(75) // (10*2+5)*3
      expect(multi.allFrames.lineCount).toBe(30)
      expect(multi.allFrames.costPerLine).toBe(2)
      expect(multi.allFrames.sideBetBase).toBe(15)
      expect(multi.perFrame).toBe(perFrame)
      expect(multi.frameCount).toBe(3)
    })

    it('toJSON serializes all frames and per-frame config', () => {
      const perFrame = BetConfiguration.fromLineCount(30)
      const multi = MultiFrameBetConfiguration.build(perFrame, 4)
      const json = multi.toJSON()
      expect(json.frameCount).toBe(4)
      expect(json.allFrames.baseCost).toBe(120)
      expect(json.perFrame.baseCost).toBe(30)
    })
  })

  describe('Serialization', () => {
    it('should serialize to JSON correctly', () => {
      const config = BetConfiguration.fromLineCount(30)
      const wager = new Wager(1, config)
      const json = JSON.parse(JSON.stringify(wager))

      expect(json.multiplier).toBe(1)
      expect(json.totalWager).toBe(30)
      expect(json.config.baseCost).toBe(30)
    })
  })
})
