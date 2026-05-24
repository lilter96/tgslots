import type { LeMilitareResult } from '@tgslots/le-militare'
import type { LeMilitareSerializedState } from '../modules/le-militare-state.js'
import type { EmptyPayload } from '@tgslots/shared-contracts/game-registry'

interface LeMilitareActions {
  spin: { multiplier: number }
  buybonus: { multiplier: number; option?: 'standard' | 'elite' | 'super' }
  chancespin: { multiplier: number }
  airraidspin: { multiplier: number }
  freespin: EmptyPayload
  state: EmptyPayload
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
