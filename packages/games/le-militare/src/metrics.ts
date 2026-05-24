import type {
  DataCollector,
  GameMetrics,
  RoundMetricsSnapshot,
} from '@tgslots/slots-simulation-engine'
import type { Wager } from '@tgslots/slots-core/betting'
import type { LeMilitareResult } from './game-state-machine.js'

export const leMilitareMetrics: GameMetrics<LeMilitareResult> = {
  recordResultMetrics(
    collector: DataCollector,
    result: LeMilitareResult,
    _context: { phase: 'spin' | 'next'; wager: Wager },
  ): void {
    const baseScope = collector.scope('base-game')
    const freeScope = collector.scope(['features', 'free-spins'])
    const combatScope = collector.scope(['features', 'combat-operation'])

    if (result.type === 'BASE') {
      if (result.win > 0) baseScope.count('hits')
      baseScope.distribution('scatter-count', String(result.scatterCount))
      if (result.triggeredFreeSpins) {
        freeScope.count('triggers')
        freeScope.value('spins-awarded', result.freeSpinsAwarded)
      }
      if (result.multiplierSum > 0) {
        combatScope.count('activations')
        combatScope.distribution(
          'multiplier-sum-per-spin',
          String(Math.round(result.multiplierSum)),
        )
      }
      return
    }

    if (result.type === 'BUY') {
      const buyScope = collector.scope(['features', 'buy-bonus'])
      buyScope.count('purchases')
      buyScope.value('spins-awarded', result.freeSpinsAwarded)
      return
    }

    if (result.type === 'FREE') {
      freeScope.count('spins-played')
      freeScope.payout('spin-win', result.win)
      freeScope.distribution('scatter-count', String(result.scatterCount))
      if (result.win > 0) freeScope.count('hits')
      if (result.retriggered) {
        freeScope.count('retriggers')
        freeScope.value('spins-awarded', result.freeSpinsAwarded)
      }
      if (result.multiplierSum > 0) {
        combatScope.count('free-activations')
        combatScope.distribution(
          'multiplier-sum-per-free-spin',
          String(Math.round(result.multiplierSum)),
        )
      }
    }
  },

  recordRoundMetrics(collector: DataCollector, round: RoundMetricsSnapshot, _wager: Wager): void {
    const baseScope = collector.scope('base-game')
    const freeScope = collector.scope(['features', 'free-spins'])

    const baseWins = round.winsByType['BASE']
    const freeWins = round.winsByType['FREE']

    const baseTotalWin = baseWins?.total ?? 0
    const freeTotalWin = freeWins?.total ?? 0
    const freeCount = round.countsByType['FREE'] ?? 0

    baseScope.rtp('win', baseTotalWin)
    freeScope.rtp('feature-rtp', freeTotalWin)

    if (freeCount > 0) {
      freeScope.payout('session-win', freeTotalWin)
      freeScope.payout('triggered-round-win', round.totalWin)
      freeScope.value('total-spins-per-trigger', freeCount)
    }
  },
}
