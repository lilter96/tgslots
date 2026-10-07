import type { PaylineHit } from '@tgslots/slots-core/paylines/types'
import type { HoldSpinState, ColumnBoostState } from '@tgslots/slots-core/hold-spin/hold-spin'
import type { SpinResult } from '@tgslots/slots-simulation-engine'

export type PrizeTier = 'CREDIT' | 'MINI' | 'MAJOR' | 'MEGA'
export type BoostKind = 'STOP' | 'PLUS1' | 'PLUS2' | 'X7'
export interface ClubCoin {
  position: number
  value: number
  tier: PrizeTier
}
export type ClubBonus = HoldSpinState<ClubCoin> & ColumnBoostState
export interface ClubState {
  phase: 'BASE' | 'HOLD' | 'BOOST'
  triggeringMultiplier: number
  roundWin: number
  bonus: ClubBonus | null
  lastGrid: number[][]
}
export interface ClubResult extends SpinResult {
  type: 'BASE' | 'BUY' | 'RESPIN'
  grid: number[][]
  hits: readonly PaylineHit[]
  coins: ClubCoin[]
  newCoins: ClubCoin[]
  respins: number
  bonusTriggered: boolean
  bonusEnded: boolean
  bonusTotal: number
  boost?: { column: number; kind: BoostKind; finished: boolean }
  capped: boolean
}
export interface ClubResponse {
  sessionId: string
  balance: number
  revision: number
  state: ClubState
  result?: ClubResult
}
export type ClubAction = 'state' | 'spin' | 'buybonus' | 'next'
export interface MathCommand {
  version: 1
  requestId: string
  action: Exclude<ClubAction, 'state'>
  multiplier: number
  seed: number
  state: ClubState
}
export interface MathReply {
  version: 1
  requestId: string
  state?: ClubState
  result?: ClubResult
  error?: string
}
