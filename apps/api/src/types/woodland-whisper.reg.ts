import type { WoodlandWhisperResult } from '@tgslots/woodland-whisper'
import type { WoodlandWhisperSerializedState } from '../modules/woodland-whisper-state.js'

interface WoodlandWhisperActions {
  spin: { multiplier: number }
  buybonus: { multiplier: number }
  freespin: Record<string, never>
  pick: { userIndex: number }
  state: Record<string, never>
}

declare module './game-registry.js' {
  interface GameRegistry {
    'woodland-whisper': {
      state: WoodlandWhisperSerializedState
      result: WoodlandWhisperResult
      actions: WoodlandWhisperActions
    }
  }
}
