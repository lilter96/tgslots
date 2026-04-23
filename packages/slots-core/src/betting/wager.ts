import { BetConfiguration, MultiFrameBetConfiguration } from './config.js'

/**
 * Represents a specific wager placed by a player.
 */
export class Bet {
  constructor(
    /** How many credits are spent per "base unit" of the game's cost. */
    public readonly betMultiplier: number,
    /** The total amount of credits wagered. */
    public readonly totalWager: number,
  ) {}

  /** Create a Bet from a total credit amount and a game configuration. */
  static fromTotalWager(totalWager: number, config: BetConfiguration): Bet {
    return new Bet(totalWager / config.baseCost, totalWager)
  }

  /** Create a Bet for multi-frame games. */
  static fromTotalWagerMulti(totalWager: number, config: MultiFrameBetConfiguration): Bet {
    return new Bet(totalWager / config.allFrames.baseCost, totalWager)
  }

  /** Validates that a total wager is consistent with a given configuration. */
  static validate(betMultiplier: number, totalWager: number, config: BetConfiguration): Bet {
    const expectedTotal = betMultiplier * config.baseCost
    if (Math.abs(expectedTotal - totalWager) > 1e-6) {
      throw new Error(
        `Total wager ${totalWager} inconsistent with bet multiplier ${betMultiplier} and base cost ${config.baseCost}. Expected ${expectedTotal}.`,
      )
    }
    return new Bet(betMultiplier, totalWager)
  }
}

/**
 * A breakdown of a wager into components used by game logic.
 */
export class WagerBreakdown {
  constructor(
    /** Credits per base unit (often corresponds to 'Bet Multiplier' in UI). */
    public readonly betMultiplier: number,
    /** Number of lines or ways being evaluated. */
    public readonly lineCount: number,
    /**
     * Credits wagered per single line.
     * Line wins are multiplied by this value.
     */
    public readonly creditsPerLine: number,
    /** Total credits wagered on all lines. */
    public readonly totalLineWager: number,
    /** Total credits wagered on side bets/features. */
    public readonly totalSideBet: number,
    /** Total credits wagered (totalLineWager + totalSideBet). Scatters use this. */
    public readonly totalWager: number,
    /** The total base units for this cost structure. */
    public readonly baseCost: number,
  ) {}

  static fromBet(bet: Bet, config: BetConfiguration): WagerBreakdown {
    const betMultiplier = bet.betMultiplier
    const totalSideBet = config.sideBetBase * betMultiplier
    const creditsPerLine = config.costPerLine * betMultiplier
    const totalLineWager = creditsPerLine * config.lineCount
    const totalWager = bet.totalWager

    return new WagerBreakdown(
      betMultiplier,
      config.lineCount,
      creditsPerLine,
      totalLineWager,
      totalSideBet,
      totalWager,
      config.baseCost,
    )
  }

  /** Helper to build breakdown for a single frame of a multi-frame game. */
  static fromMulti(betAllFrames: Bet, config: MultiFrameBetConfiguration): WagerBreakdownMulti {
    const betPerFrame = Bet.fromTotalWager(
      betAllFrames.totalWager / config.frameCount,
      config.perFrame,
    )
    const breakdownPerFrame = WagerBreakdown.fromBet(betPerFrame, config.perFrame)

    return new WagerBreakdownMulti(config.frameCount, breakdownPerFrame)
  }
}

/**
 * Breakdown for multi-frame homogeneous games.
 */
export class WagerBreakdownMulti {
  constructor(
    public readonly frameCount: number,
    public readonly perFrame: WagerBreakdown,
  ) {}

  get totalWager(): number {
    return this.perFrame.totalWager * this.frameCount
  }
}
