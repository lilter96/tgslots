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
}
