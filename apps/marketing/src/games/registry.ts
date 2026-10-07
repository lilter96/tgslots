import type { GamePresentation } from '../types'
import { woodlandWhisper } from './woodland-whisper'
import { ancientDragon } from './ancient-dragon'
import { leMilitare } from './le-militare'

import { x7Club } from './x7-club'

export const gameRegistry: Record<string, GamePresentation> = {
  'woodland-whisper': woodlandWhisper,
  'ancient-dragon': ancientDragon,
  'le-militare': leMilitare,
  'x7-club': x7Club,
}
