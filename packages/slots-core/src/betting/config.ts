/**
 * Describes the cost structure of a game in credits.
 * All values MUST be integers.
 */
export class BetConfiguration {
  constructor(
    /** Total credits required for a multiplier-1 spin. */
    public readonly baseCost: number,
    /** Number of paylines or multiway cost equivalent. */
    public readonly lineCount: number,
    /** Credits per payline (MUST be an integer). */
    public readonly costPerLine: number,
    /** Extra credits for side bets. */
    public readonly sideBetBase: number,
  ) {
    this.validateInvariants(baseCost, lineCount, costPerLine, sideBetBase)
  }

  private validateInvariants(bc: number, lc: number, cpl: number, sb: number) {
    if (!Number.isInteger(bc) || bc <= 0) {
      throw new Error(`baseCost must be a positive integer: ${bc}`)
    }
    if (!Number.isInteger(lc) || lc < 0) {
      throw new Error(`lineCount must be a non-negative integer: ${lc}`)
    }
    if (!Number.isInteger(cpl) || cpl < 0) {
      throw new Error(`costPerLine must be a non-negative integer: ${cpl}`)
    }
    if (!Number.isInteger(sb) || sb < 0) {
      throw new Error(`sideBetBase must be a non-negative integer: ${sb}`)
    }

    if (lc > 0 && (bc - sb) % lc !== 0) {
      throw new Error(
        `Inconsistent BetConfiguration: (baseCost - sideBetBase) must be divisible by lineCount.`,
      )
    }

    const calculatedTotal = lc * cpl + sb
    if (calculatedTotal !== bc) {
      throw new Error(
        `Inconsistent BetConfiguration: lineCount(${lc}) * costPerLine(${cpl}) + sideBetBase(${sb}) != baseCost(${bc})`,
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
    if (baseCost < lineCount) {
      throw new Error(
        `baseCost must be >= lineCount, got baseCost=${baseCost}, lineCount=${lineCount}`,
      )
    }
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
