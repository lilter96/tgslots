import { BetConfiguration, MultiFrameBetConfiguration } from './config.js'

/** Maximum allowed bet multiplier to prevent integer overflow in credit calculations. */
export const MAX_MULTIPLIER = 10_000

/**
 * A breakdown of a wager into component credits used by game math.
 * Immutable and optimized for hot-path access.
 * ALL values are strict integers (credits).
 */
export class Wager {
  /** Credits wagered per single line. */
  public readonly creditsPerLine: number
  /** Total credits wagered on all lines. */
  public readonly totalLineWager: number
  /** Total credits wagered on side bets/features. */
  public readonly totalSideBet: number
  /** Total credits wagered for the entire spin. */
  public readonly totalWager: number

  constructor(
    /** How many credits are spent per "base unit" of the game's cost. */
    public readonly multiplier: number,
    /** The game's cost configuration. */
    public readonly config: BetConfiguration,
  ) {
    if (!Number.isInteger(multiplier) || multiplier <= 0) {
      throw new Error(`multiplier must be a positive integer: ${multiplier}`)
    }
    if (multiplier > MAX_MULTIPLIER) {
      throw new Error(`multiplier ${multiplier} exceeds maximum ${MAX_MULTIPLIER}`)
    }

    this.creditsPerLine = config.costPerLine * multiplier
    this.totalLineWager = this.creditsPerLine * config.lineCount
    this.totalSideBet = config.sideBetBase * multiplier
    this.totalWager = multiplier * config.baseCost

    // Final integrity check
    if (this.totalLineWager + this.totalSideBet !== this.totalWager) {
      throw new Error(`Wager integrity failure: line + side != total`)
    }
  }

  /**
   * Helper for multi-frame games.
   */
  static forMultiFrame(multiplier: number, config: MultiFrameBetConfiguration): Wager[] {
    return Array.from({ length: config.frameCount }, () => new Wager(multiplier, config.perFrame))
  }

  toJSON() {
    return {
      multiplier: this.multiplier,
      creditsPerLine: this.creditsPerLine,
      totalLineWager: this.totalLineWager,
      totalSideBet: this.totalSideBet,
      totalWager: this.totalWager,
      config: this.config.toJSON(),
    }
  }
}
