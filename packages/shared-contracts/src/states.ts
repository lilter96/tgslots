export interface WWFreeSpinSerialized {
  triggeringMultiplier: number
  totalWin: number
  spinsRemaining: number
}

export interface WWPickBonusSerialized {
  board: number[]
  pickSequence: number[]
  currentPickIndex: number
  userPicks: number[]
  revealedValues: number[]
  winValue: number
  triggeringMultiplier: number
}

export interface WoodlandWhisperSerializedState {
  lastGrid: number[][] | null
  freeSpins: WWFreeSpinSerialized | null
  pickBonus: WWPickBonusSerialized | null
}

export interface ADFreeSpinSerialized {
  triggeringMultiplier: number
  totalWin: number
  spinsRemaining: number
}

export interface AncientDragonSerializedState {
  freeSpins: ADFreeSpinSerialized | null
}
