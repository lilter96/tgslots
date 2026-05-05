import type { WoodlandWhisperState } from '@tgslots/woodland-whisper/game-state-machine'
import type { FreeSpinsStatus } from '../types'

export function deriveAwardedFreeSpins(
  previousState: WoodlandWhisperState,
  nextState: WoodlandWhisperState,
): number | null {
  const previousRemaining = previousState.freeSpins?.spinsRemaining ?? 0
  const nextRemaining = nextState.freeSpins?.spinsRemaining ?? 0

  return nextRemaining > previousRemaining ? nextRemaining - previousRemaining : null
}

export function deriveFreeSpinsStatus(
  state: WoodlandWhisperState,
  awarded: number | null = null,
): FreeSpinsStatus {
  const remaining = state.freeSpins?.spinsRemaining ?? 0

  return {
    active: remaining > 0,
    remaining,
    awarded: awarded && awarded > 0 ? awarded : null,
  }
}

export function formatFreeSpinsAwardedMessage(awarded: number): string {
  return `${awarded} FREE SPINS WON`
}
