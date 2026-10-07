import type { Rng } from '@tgslots/math/rng/types'
import { WoodlandWhisperStateMachine, type WoodlandWhisperResult } from './game-state-machine.js'

/** Simulation-only player: resolve every pick before continuing free spins.
 * Card positions do not change the predetermined award. The HTTP game retains
 * explicit user picks; only the Monte Carlo adapter supplies these inputs.
 */
export class WoodlandWhisperSimulationStateMachine extends WoodlandWhisperStateMachine {
  override next(rng: Rng): WoodlandWhisperResult | null {
    const pick = this.state.pickBonus
    if (pick) {
      const index = pick.board.findIndex((_, index) => !pick.userPicks.includes(index))
      if (index < 0) throw new Error('Pick feature exhausted without a matching award')
      return this.pickBall(index)
    }
    return super.next(rng)
  }
}
