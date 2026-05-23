import type {
  DataCollector,
  GameMetrics,
  RoundMetricsSnapshot,
} from '@tgslots/slots-simulation-engine'
import type { Wager } from '@tgslots/slots-core/betting'
import type { WoodlandWhisperResult } from './game-state-machine.js'

export const woodlandWhisperMetrics: GameMetrics<WoodlandWhisperResult> = {
  recordResultMetrics(
    collector: DataCollector,
    result: WoodlandWhisperResult,
    _context: { phase: 'spin' | 'next'; wager: Wager },
  ): void {
    const baseScope = collector.scope('base-game')
    const freeSpinScope = collector.scope(['features', 'free-spins'])
    const pickBonusBaseScope = collector.scope(['features', 'pick-bonus-base-game'])
    const pickBonusFreeScope = collector.scope(['features', 'pick-bonus-free-game'])

    if (result.type === 'BASE') {
      baseScope.distribution('scatter-count', String(result.sc ?? 0))

      if (result.win > 0) baseScope.count('hits')

      if (result.triggeredPickBonus) {
        freeSpinScope.count('triggers')
        freeSpinScope.value('spins-awarded', result.pickedBonus ?? 0)
        pickBonusBaseScope.count('triggers')
        pickBonusBaseScope.value('spins-awarded', result.pickedBonus ?? 0)
      }
      return
    }

    if (result.type === 'PICK') {
      return
    }

    if (result.type === 'BUY') {
      const buyBonusScope = collector.scope(['features', 'buy-bonus'])
      buyBonusScope.count('purchases')
      buyBonusScope.value('spins-awarded', result.pickedBonus)
      return
    }

    if (result.type === 'FREE') {
      freeSpinScope.count('spins-played')
      freeSpinScope.payout('spin-win', result.win)
      freeSpinScope.distribution('scatter-count', String(result.sc ?? 0))
      freeSpinScope.payout('scatter-win', result.scatterWin)

      if (result.win > 0) freeSpinScope.count('hits')

      if (result.retriggeredPickBonus) {
        freeSpinScope.count('retriggers')
        freeSpinScope.value('spins-awarded', result.pickedBonus ?? 0)
        pickBonusFreeScope.count('retriggers')
        pickBonusFreeScope.value('spins-awarded', result.pickedBonus ?? 0)
      }
    }
  },

  recordRoundMetrics(collector: DataCollector, round: RoundMetricsSnapshot, _wager: Wager): void {
    const baseScope = collector.scope('base-game')
    const freeSpinScope = collector.scope(['features', 'free-spins'])

    const baseWins = round.winsByType['BASE']
    const freeWins = round.winsByType['FREE']

    const baseTotalWin = baseWins?.total ?? 0
    const baseScatterWin = baseWins?.scatter ?? 0

    const freeTotalWin = freeWins?.total ?? 0
    const freeScatterWin = freeWins?.scatter ?? 0

    const freeCount = round.countsByType['FREE'] ?? 0
    const pickCount = round.countsByType['PICK'] ?? 0

    baseScope.rtp('win', baseTotalWin)
    baseScope.rtp('scatter-win', baseScatterWin)

    freeSpinScope.rtp('feature-rtp', freeTotalWin)
    freeSpinScope.rtp('scatter-rtp', freeScatterWin)

    const hasFreeSpins = freeCount > 0 || pickCount > 0
    if (!hasFreeSpins) return

    freeSpinScope.payout('session-win', freeTotalWin)
    freeSpinScope.payout('triggered-round-win', round.totalWin)

    freeSpinScope.value('total-spins-per-trigger', freeCount)
  },
}
