import type { LeMilitareResult } from '@tgslots/le-militare'
import type { LeMilitareSerializedState } from '@tgslots/shared-contracts/states'
import type { IGameClient } from '../../engine/game-client.js'
import { manifest } from './manifest.js'
import { assets } from './assets.js'
import { LeMilitareRuntime } from './runtime.js'

declare module '@tgslots/shared-contracts/game-registry' {
  interface GameRegistry {
    'le-militare': {
      state: LeMilitareSerializedState
      result: LeMilitareResult
      actions: {
        spin: { multiplier: number }
        buybonus: { multiplier: number }
        freespin: Record<string, never>
        state: Record<string, never>
      }
    }
  }
}

export const leMilitareClient: IGameClient<'le-militare'> = {
  manifest,
  assets,
  soundMapping: {
    'win:awarded': {
      name: 'win-small',
      options: { volume: 0.8 },
    },
    'feature:announced': 'win-big',
  },
  async mount(ctx) {
    const runtime = new LeMilitareRuntime()
    await runtime.init(ctx)
    return runtime
  },
}
