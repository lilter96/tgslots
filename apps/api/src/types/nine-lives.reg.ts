import type { LivesState, LivesResult } from '@tgslots/nine-lives'
import type { EmptyPayload } from '@tgslots/shared-contracts/game-registry'
declare module '@tgslots/shared-contracts/game-registry' {
  interface GameRegistry {
    'nine-lives': {
      state: LivesState
      result: LivesResult
      actions: {
        state: EmptyPayload
        spin: { multiplier: number }
        buybonus: { multiplier: number }
        next: EmptyPayload
      }
    }
  }
}
