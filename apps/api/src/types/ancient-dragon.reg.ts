import type { AncientDragonResult } from '@tgslots/ancient-dragon'
import type { AncientDragonSerializedState } from '../modules/ancient-dragon-state.js'

interface AncientDragonActions {
  spin: { multiplier: number }
  freespin: Record<string, never>
  state: Record<string, never>
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
