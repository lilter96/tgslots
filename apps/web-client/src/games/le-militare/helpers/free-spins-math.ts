import type { LeMilitareResult } from '@tgslots/le-militare'

/**
 * Returns the carry-over multiplier that was accumulated in earlier spins of
 * the same free-spin session, before this spin added its own contribution.
 *
 * For BASE and BUY results there is no session carry-over, so this returns 0.
 */
export function deriveFreeCarryOverMultiplier(result: LeMilitareResult): number {
  if (result.type !== 'FREE') return 0
  return result.state.sessionMultiplierSum - result.multiplierSum
}
