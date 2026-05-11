import type { WoodlandWhisperResult } from '@tgslots/woodland-whisper'
import type { WoodlandWhisperSerializedState } from '@tgslots/shared-contracts/states'
import type { IGameClient } from '../../engine/game-client.js'
import { manifest } from './manifest.js'
import { assets } from './assets.js'
import { WoodlandWhisperRuntime } from './runtime.js'

declare module '@tgslots/shared-contracts/game-registry' {
  interface GameRegistry {
    'woodland-whisper': {
      state: WoodlandWhisperSerializedState
      result: WoodlandWhisperResult
      actions: {
        spin: { multiplier: number }
        buybonus: { multiplier: number }
        freespin: Record<string, never>
        pick: { userIndex: number }
        state: Record<string, never>
      }
    }
  }
}

export const woodlandWhisperClient: IGameClient<'woodland-whisper'> = {
  manifest,
  assets,
  async mount(ctx) {
    const runtime = new WoodlandWhisperRuntime()
    await runtime.init(ctx)
    return runtime
  },
}
