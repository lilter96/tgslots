import type { GamePresentation } from '../types'
import { woodlandWhisper } from './woodland-whisper'

export const gameRegistry: Record<string, GamePresentation> = {
  'woodland-whisper': woodlandWhisper,
}
