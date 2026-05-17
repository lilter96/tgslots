import type { GamePresentation } from '../types'
import { woodlandWhisper } from './woodland-whisper'
import { ancientDragon } from './ancient-dragon'
import { leMilitare } from './le-militare'

export const gameRegistry: Record<string, GamePresentation> = {
  'woodland-whisper': woodlandWhisper,
  'ancient-dragon': ancientDragon,
  'le-militare': leMilitare,
}
