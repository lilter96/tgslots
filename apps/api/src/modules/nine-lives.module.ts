import type { Rng } from '@tgslots/math/rng/types'
import { Wager } from '@tgslots/slots-core/betting'
import { NineLivesMachine, initialState, BET_CONFIG, config } from '@tgslots/nine-lives'
import type { LivesAction, LivesResult, LivesState } from '@tgslots/nine-lives'
import type { IGameModule } from '../game-module.js'
import '../types/nine-lives.reg.js'

type Payload = { multiplier?: number }

export class NineLivesModule implements IGameModule<'nine-lives'> {
  readonly gameId = 'nine-lives' as const
  readonly wallet = {
    initialBalance: 1000000,
    cost(action: LivesAction, _state: LivesState, payload: Payload): number {
      return action === 'next' || action === 'state'
        ? 0
        : config.baseCost * payload.multiplier! * (action === 'buybonus' ? config.buyCost : 1)
    },
    award(result?: LivesResult): number {
      return result?.win ?? 0
    },
  }

  defaultState(_rng: Rng): LivesState {
    return initialState()
  }

  validateAction(state: LivesState, action: LivesAction, payload: Payload): string | null {
    if (action === 'state') return null
    if (action === 'next') return state.phase === 'FREE' ? null : 'No free spins remaining'
    if (action !== 'spin' && action !== 'buybonus') return `Unknown action: ${String(action)}`
    if (
      !Number.isSafeInteger(payload.multiplier) ||
      payload.multiplier! < 1 ||
      payload.multiplier! > 10000
    )
      return 'Bet multiplier must be an integer from 1 to 10000'
    return state.phase === 'BASE' ? null : 'Complete the nine lives first'
  }

  execute(
    rng: Rng,
    state: LivesState,
    action: LivesAction,
    payload: Payload,
  ): {
    state: LivesState
    result?: LivesResult
  } {
    if (action === 'state') return { state }
    const machine = new NineLivesMachine(state)
    const result =
      action === 'next'
        ? machine.next(rng)!
        : action === 'buybonus'
          ? machine.buyBonus(new Wager(payload.multiplier!, BET_CONFIG))
          : machine.spin(rng, new Wager(payload.multiplier!, BET_CONFIG))
    return { state: machine.state, result }
  }
}
