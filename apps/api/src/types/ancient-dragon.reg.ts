import type { AncientDragonResult } from '@tgslots/ancient-dragon'
import type { AncientDragonSerializedState } from '../modules/ancient-dragon-state.js'
import type { EmptyPayload } from '@tgslots/shared-contracts/game-registry'

interface AncientDragonActions {
  spin: { multiplier: number }
  freespin: EmptyPayload
  state: EmptyPayload
}

declare module './game-registry.js' {
  interface GameRegistry {
    'ancient-dragon': {
      state: AncientDragonSerializedState
      result: AncientDragonResult
      actions: AncientDragonActions
    }
  }
}
