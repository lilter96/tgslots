import type { WoodlandWhisperResult } from '@tgslots/woodland-whisper'
import type { WoodlandWhisperSerializedState } from '../modules/woodland-whisper-state.js'
import type { EmptyPayload } from '@tgslots/shared-contracts/game-registry'

interface WoodlandWhisperActions {
  spin: { multiplier: number }
  buybonus: { multiplier: number }
  freespin: EmptyPayload
  pick: { userIndex: number }
  state: EmptyPayload
}

declare module '@tgslots/shared-contracts/game-registry' {
  interface GameRegistry {
    'woodland-whisper': {
      state: WoodlandWhisperSerializedState
      result: WoodlandWhisperResult
      actions: WoodlandWhisperActions
    }
  }
}
