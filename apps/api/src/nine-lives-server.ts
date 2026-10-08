import { mt19937 } from '@tgslots/math'
import { Wager } from '@tgslots/slots-core/betting'
import { NineLivesMachine, initialState, BET_CONFIG, config } from '@tgslots/nine-lives'
import type { LivesResult, LivesState } from '@tgslots/nine-lives'
import { RevisionedSessionServer, SessionError } from '@tgslots/slots-server'
export function createNineLivesServer() {
  return new RevisionedSessionServer<LivesState, LivesResult>({
    initialState,
    cost(action, state, multiplier) {
      if (action === 'next') {
        if (state.phase !== 'FREE') throw new SessionError(400, 'No free spins remaining')
        return 0
      }
      if (state.phase !== 'BASE') throw new SessionError(400, 'Complete the nine lives first')
      return config.baseCost * multiplier * (action === 'buybonus' ? config.buyCost : 1)
    },
    execute(action, state, multiplier, seed) {
      const machine = new NineLivesMachine(state)
      const rng = mt19937(seed)
      const result =
        action === 'next'
          ? machine.next(rng)!
          : action === 'buybonus'
            ? machine.buyBonus(new Wager(multiplier, BET_CONFIG))
            : machine.spin(rng, new Wager(multiplier, BET_CONFIG))
      return { state: machine.state, result }
    },
  })
}
