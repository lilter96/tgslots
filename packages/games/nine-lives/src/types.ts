import type { SpinResult } from '@tgslots/slots-simulation-engine'
import type { ClusterHit } from '@tgslots/slots-core'
export interface LivesState {
  phase: 'BASE' | 'FREE'
  triggeringMultiplier: number
  remaining: number
  multiplier: number
  roundWin: number
  bonusWin: number
  lastGrid: number[][]
}
export interface LivesStep {
  before: number[][]
  after: number[][]
  hits: readonly ClusterHit[]
  vanished: readonly number[]
  multiplier: number
  win: number
}
export interface LivesCoin {
  position: number
  value: number
}
export interface LivesResult extends SpinResult {
  type: 'BASE' | 'BUY' | 'FREE'
  grid: number[][]
  finalGrid: number[][]
  steps: LivesStep[]
  coins: LivesCoin[]
  collectionWin: number
  clusterWin: number
  scatters: number
  bonusTriggered: boolean
  bonusEnded: boolean
  remaining: number
  multiplier: number
  roundWin: number
  capped: boolean
}
export type LivesAction = 'state' | 'spin' | 'buybonus' | 'next'
