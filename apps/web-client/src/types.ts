export enum GameUIState {
  IDLE = 'IDLE',
  SPINNING = 'SPINNING',
  STOPPING = 'STOPPING',
  WIN_SHOW = 'WIN_SHOW',
  FEATURE_TRANSITION = 'FEATURE_TRANSITION',
}

export interface UIReelConfig {
  symbolWidth: number
  symbolHeight: number
  visibleSymbols: number
  totalSymbols: number // for pooling
}

export interface UIGridConfig {
  reels: number
  rows: number
  reelSpacing: number
}
