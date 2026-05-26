export interface LMFreeSpinSerialized {
  triggeringMultiplier: number
  spinsRemaining: number
  totalWin: number
  armedReels: number[]
  multiplierSum: number
}

export interface LeMilitareSerializedState {
  lastGrid: number[][] | null
  freeSpins: LMFreeSpinSerialized | null
  /** Selected volatility mode for the session. */
  mode?: 'recon' | 'assault' | 'siege'
  /** Cumulative win for the current round (base + free spins), used for max-win cap. */
  roundWin: number
}
