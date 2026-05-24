import type { LeMilitareResult } from '@tgslots/le-militare'
import type { LeMilitareSerializedState } from '../modules/le-militare-state.js'
import type { EmptyPayload } from '@tgslots/shared-contracts/game-registry'

type LMMode = 'recon' | 'assault' | 'siege'

interface LeMilitareActions {
  spin: { multiplier: number; mode?: LMMode }
  buybonus: { multiplier: number; option?: 'standard' | 'elite' | 'super'; mode?: LMMode }
  chancespin: { multiplier: number; mode?: LMMode }
  airraidspin: { multiplier: number; mode?: LMMode }
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
