import type { AncientDragonResult } from '@tgslots/ancient-dragon'
import type { AncientDragonSerializedState } from '@tgslots/shared-contracts/states'
import type { IGameClient } from '../../engine/game-client.js'
import { manifest } from './manifest.js'
import { assets } from './assets.js'
import { AncientDragonRuntime } from './runtime.js'

declare module '@tgslots/shared-contracts/game-registry' {
  interface GameRegistry {
    'ancient-dragon': {
      state: AncientDragonSerializedState
      result: AncientDragonResult
      actions: {
        spin: { multiplier: number }
        freespin: Record<string, never>
        state: Record<string, never>
      }
    }
  }
}

export const ancientDragonClient: IGameClient<'ancient-dragon'> = {
  manifest,
  assets,
  async mount(ctx) {
    const runtime = new AncientDragonRuntime()
    await runtime.init(ctx)
    return runtime
  },
}
