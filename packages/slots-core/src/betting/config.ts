/**
 * Describes the cost structure of a game.
 * Base cost is measured in "base units" which are then multiplied by a bet multiplier (credits).
 */
export class BetConfiguration {
  constructor(
    /** Total base units required to play one spin (e.g., 30 lines + 10 side bet = 40). */
    public readonly baseCost: number,
    /** Number of paylines or multiway cost equivalent. */
    public readonly lineCount: number,
    /** Base units per payline (usually 1, but can be fractional or > 1). */
    public readonly costPerLine: number,
    /** Extra base units for features/bonuses not tied to paylines. */
    public readonly sideBetBase: number,
  ) {
    const calculatedTotal = lineCount * costPerLine + sideBetBase
    if (Math.abs(calculatedTotal - baseCost) > 1e-6) {
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

  /** Derived cost per line from total cost, line count and side bet. */
  static fromBaseCostAndLineCountAndSideBet(
    baseCost: number,
    lineCount: number,
    sideBetBase: number,
  ): BetConfiguration {
    const costPerLine = (baseCost - sideBetBase) / lineCount
    return new BetConfiguration(baseCost, lineCount, costPerLine, sideBetBase)
  }

  /** Implicit side bet is the difference between base cost and line count (assuming 1 unit per line). */
  static fromBaseCostAndLineCount(baseCost: number, lineCount: number): BetConfiguration {
    return new BetConfiguration(baseCost, lineCount, 1, baseCost - lineCount)
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
}
