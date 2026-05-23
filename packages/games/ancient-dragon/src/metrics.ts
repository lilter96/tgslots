import type {
  DataCollector,
  GameMetrics,
  RoundMetricsSnapshot,
} from '@tgslots/slots-simulation-engine'
import type { Wager } from '@tgslots/slots-core/betting'
import type { AncientDragonResult } from './game-state-machine.js'

export const ancientDragonMetrics: GameMetrics<AncientDragonResult> = {
  recordResultMetrics(
    collector: DataCollector,
    result: AncientDragonResult,
    _context: { phase: 'spin' | 'next'; wager: Wager },
  ): void {
    const baseScope = collector.scope('base-game')
    const freeSpinScope = collector.scope(['features', 'free-spins'])

    if (result.type === 'BASE') {
      baseScope.distribution('scatter-count', String(result.sc))
      baseScope.payout('spin-win', result.win)
      if (result.win > 0) baseScope.count('hits')
      if (result.triggeredFreeSpins) {
        freeSpinScope.count('triggers')
        freeSpinScope.value('spins-awarded', 10)
      }
      return
    }

    freeSpinScope.count('spins-played')
    freeSpinScope.payout('spin-win', result.win)
    freeSpinScope.distribution('scatter-count', String(result.sc))
    if (result.win > 0) freeSpinScope.count('hits')
    if (result.retriggeredFreeSpins) {
      freeSpinScope.count('retriggers')
      freeSpinScope.value('spins-awarded', 10)
    }
  },

  recordRoundMetrics(collector: DataCollector, round: RoundMetricsSnapshot, _wager: Wager): void {
    const baseScope = collector.scope('base-game')
    const freeSpinScope = collector.scope(['features', 'free-spins'])

    const baseWin = round.winsByType.BASE?.total ?? 0
    const freeWin = round.winsByType.FREE?.total ?? 0

    baseScope.rtp('win', baseWin)
    freeSpinScope.rtp('feature-rtp', freeWin)

    const hasFreeSpins = (round.countsByType.FREE ?? 0) > 0
    if (!hasFreeSpins) return

    freeSpinScope.payout('session-win', freeWin)
    freeSpinScope.payout('triggered-round-win', round.totalWin)
    freeSpinScope.value('total-spins-per-trigger', round.countsByType.FREE ?? 0)
  },
}
