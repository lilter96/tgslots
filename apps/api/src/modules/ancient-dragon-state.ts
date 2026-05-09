export interface ADFreeSpinSerialized {
  triggeringMultiplier: number
  totalWin: number
  spinsRemaining: number
}

export interface AncientDragonSerializedState {
  freeSpins: ADFreeSpinSerialized | null
}
