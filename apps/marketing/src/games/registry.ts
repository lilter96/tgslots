import type { GamePresentation } from '../types'
import { woodlandWhisper } from './woodland-whisper'
import { ancientDragon } from './ancient-dragon'

export const gameRegistry: Record<string, GamePresentation> = {
  'woodland-whisper': woodlandWhisper,
  'ancient-dragon': ancientDragon,
}
