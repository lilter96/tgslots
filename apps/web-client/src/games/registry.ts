import type { GameId } from '@tgslots/shared-contracts'
import type { IGameClient } from '../engine/game-client.js'
import { woodlandWhisperClient } from './woodland-whisper/index.js'
import { ancientDragonClient } from './ancient-dragon/index.js'
import { leMilitareClient } from './le-militare/index.js'

export const gameRegistry: Record<string, IGameClient<GameId>> = {
  'woodland-whisper': woodlandWhisperClient,
  'ancient-dragon': ancientDragonClient,
  'le-militare': leMilitareClient,
}
