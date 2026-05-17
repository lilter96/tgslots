import type { LeMilitareResult } from '@tgslots/le-militare'
import type { LeMilitareSerializedState } from '../modules/le-militare-state.js'

interface LeMilitareActions {
  spin: { multiplier: number }
  buybonus: { multiplier: number }
  freespin: Record<string, never>
  state: Record<string, never>
}

declare module './game-registry.js' {
  interface GameRegistry {
    'le-militare': {
      state: LeMilitareSerializedState
      result: LeMilitareResult
      actions: LeMilitareActions
    }
  }
}
