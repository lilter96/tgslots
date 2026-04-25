/**
 * Denomination represents the mapping between game credits and real currency.
 */
export interface Denomination {
  readonly id: string
  readonly valueInCents: number // Must be integer
  readonly label: string
}

/**
 * BetLevel represents a multiplier applied to the base cost of a game.
 */
export interface BetLevel {
  readonly multiplier: number // Must be integer
}

/**
 * Describes the cost structure of a game.
 * All costs are measured in "base units" which correspond to credits at multiplier 1.
 */
export class BetConfiguration {
  constructor(
    /** Total base units required to play one spin (e.g., 30 lines + 10 side bet = 40). */
    public readonly baseCost: number,
    /** Number of paylines or multiway cost equivalent. */
    public readonly lineCount: number,
    /** Base units per payline (MUST be an integer for strict math). */
    public readonly costPerLine: number,
    /** Extra base units for features/bonuses not tied to paylines. */
    public readonly sideBetBase: number,
  ) {
    // Enforce integer invariants
    if (!Number.isInteger(baseCost) || baseCost <= 0) {
      throw new Error(`baseCost must be a positive integer: ${baseCost}`)
    }
    if (!Number.isInteger(lineCount) || lineCount < 0) {
      throw new Error(`lineCount must be a non-negative integer: ${lineCount}`)
    }
    if (!Number.isInteger(costPerLine) || costPerLine < 0) {
      throw new Error(`costPerLine must be a non-negative integer: ${costPerLine}`)
    }
    if (!Number.isInteger(sideBetBase) || sideBetBase < 0) {
      throw new Error(`sideBetBase must be a non-negative integer: ${sideBetBase}`)
    }

    const calculatedTotal = lineCount * costPerLine + sideBetBase
    if (calculatedTotal !== baseCost) {
      throw new Error(
        `Inconsistent BetConfiguration: lineCount(${lineCount}) * costPerLine(${costPerLine}) + sideBetBase(${sideBetBase}) != baseCost(${baseCost})`,
      )
    }
  }

  /** All base units go to lines, 1 unit per line. */
  static fromLineCount(lineCount: number): BetConfiguration {
    return new BetConfiguration(lineCount, lineCount, 1, 0)
  }

  /** Same as fromLineCount but emphasizing the cost to play. */
  static fromBaseCost(baseCost: number): BetConfiguration {
    return new BetConfiguration(baseCost, baseCost, 1, 0)
  }

  /** Lines have a custom cost per line, no side bet. */
  static fromLineCountAndCostPerLine(lineCount: number, costPerLine: number): BetConfiguration {
    return new BetConfiguration(lineCount * costPerLine, lineCount, costPerLine, 0)
  }

  /** Lines have a custom cost per line plus a fixed side bet. */
  static fromLineCountAndCostPerLineAndSideBet(
    lineCount: number,
    costPerLine: number,
    sideBetBase: number,
  ): BetConfiguration {
    return new BetConfiguration(
      lineCount * costPerLine + sideBetBase,
      lineCount,
      costPerLine,
      sideBetBase,
    )
  }

  /**
   * Implicit side bet is the difference between base cost and line count (assuming 1 unit per line).
   * Note: baseCost MUST be >= lineCount.
   */
  static fromBaseCostAndLineCount(baseCost: number, lineCount: number): BetConfiguration {
    return new BetConfiguration(baseCost, lineCount, 1, baseCost - lineCount)
  }

  /**
   * Derived cost per line from total cost, line count and side bet.
   * MUST result in an integer cost per line.
   */
  static fromBaseCostAndLineCountAndSideBet(
    baseCost: number,
    lineCount: number,
    sideBetBase: number,
  ): BetConfiguration {
    const costPerLine = (baseCost - sideBetBase) / lineCount
    return new BetConfiguration(baseCost, lineCount, costPerLine, sideBetBase)
  }

  toJSON() {
    return {
      baseCost: this.baseCost,
      lineCount: this.lineCount,
      costPerLine: this.costPerLine,
      sideBetBase: this.sideBetBase,
    }
  }
}

/**
 * Describes cost for multi-frame games where each frame is identical.
 */
export class MultiFrameBetConfiguration {
  constructor(
    public readonly allFrames: BetConfiguration,
    public readonly perFrame: BetConfiguration,
    public readonly frameCount: number,
  ) {}

  static build(perFrame: BetConfiguration, frameCount: number): MultiFrameBetConfiguration {
    const allFrames = new BetConfiguration(
      perFrame.baseCost * frameCount,
      perFrame.lineCount * frameCount,
      perFrame.costPerLine,
      perFrame.sideBetBase * frameCount,
    )
    return new MultiFrameBetConfiguration(allFrames, perFrame, frameCount)
  }

  toJSON() {
    return {
      allFrames: this.allFrames.toJSON(),
      perFrame: this.perFrame.toJSON(),
      frameCount: this.frameCount,
    }
  }
}
