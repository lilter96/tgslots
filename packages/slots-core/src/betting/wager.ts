import { BetConfiguration, Denomination, MultiFrameBetConfiguration } from './config.js'

/**
 * Represents a specific wager placed by a player.
 * Combines a bet level (multiplier), denomination, and the game's cost structure.
 */
export class Wager {
  constructor(
    /** How many credits are spent per "base unit" of the game's cost. */
    public readonly betMultiplier: number,
    /** The denomination used for this wager. */
    public readonly denomination: Denomination,
    /** The game's cost configuration. */
    public readonly config: BetConfiguration,
  ) {
    if (!Number.isInteger(betMultiplier) || betMultiplier <= 0) {
      throw new Error(`betMultiplier must be a positive integer: ${betMultiplier}`)
    }
  }

  /** Total credits wagered. */
  get totalCredits(): number {
    return this.betMultiplier * this.config.baseCost
  }

  /** Total amount wagered in cents. */
  get totalAmountInCents(): number {
    return this.totalCredits * this.denomination.valueInCents
  }

  /** Gets the breakdown for this wager. */
  getBreakdown(): WagerBreakdown {
    return WagerBreakdown.fromWager(this)
  }

  toJSON() {
    return {
      betMultiplier: this.betMultiplier,
      denomination: this.denomination,
      config: this.config.toJSON(),
      totalCredits: this.totalCredits,
      totalAmountInCents: this.totalAmountInCents,
    }
  }
}

/**
 * A breakdown of a wager into components used by game logic.
 * ALL values are strict integers (credits).
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
  ) {
    // Sanity checks
    if (!Number.isInteger(creditsPerLine)) {
      throw new Error(`creditsPerLine must be an integer: ${creditsPerLine}`)
    }
  }

  static fromWager(wager: Wager): WagerBreakdown {
    return WagerBreakdown.fromBet(wager.betMultiplier, wager.config)
  }

  static fromBet(betMultiplier: number, config: BetConfiguration): WagerBreakdown {
    const totalSideBet = config.sideBetBase * betMultiplier
    const creditsPerLine = config.costPerLine * betMultiplier
    const totalLineWager = creditsPerLine * config.lineCount
    const totalWager = betMultiplier * config.baseCost

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
  static fromMulti(betMultiplier: number, config: MultiFrameBetConfiguration): WagerBreakdownMulti {
    const breakdownPerFrame = WagerBreakdown.fromBet(betMultiplier, config.perFrame)
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
