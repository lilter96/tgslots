import type { ClusterHit } from '@tgslots/slots-core'

export interface ShootdownEvent {
  readonly reel: number
  readonly row: number
  readonly multiplier: number
}

export interface AirRaidPlacement {
  readonly reel: number
  readonly row: number
  readonly multiplier: number
}

// Base-game Air Raid presentation data: the squadron interceptions (each a
// multiplier-WILD landing on a random cell) plus the grid as it looked *before*
// those wilds were stamped in, so the client can fly the planes over the
// original symbols and convert cells on crash.
export interface AirRaidPresentation {
  readonly squadronSize: number
  readonly placements: readonly AirRaidPlacement[]
  readonly preRaidGrid: number[][]
}

export interface ActivationEvent {
  readonly reel: number
  readonly convertedCells: number
}

export interface CombatCascadeStep {
  readonly preCombatGrid: number[][]
  readonly postCombatGrid: number[][]
  readonly hits: readonly ClusterHit[]
  readonly vanishedPositions: readonly number[]
  readonly stickyWildPositions: readonly number[]
  readonly stepWin: number
  readonly activations: readonly ActivationEvent[]
  readonly shootdowns: readonly ShootdownEvent[]
}

export interface LeMilitareSpinResult {
  readonly initialGrid: number[][]
  readonly steps: CombatCascadeStep[]
  readonly scatterCount: number
  readonly baseClusterWin: number
  readonly multiplierSum: number
  readonly finalWin: number
  readonly triggeredFreeSpins: boolean
  readonly freeSpinsAwarded: number
  readonly endArmedReels: readonly number[]
  readonly endMultiplierSum: number
  readonly airRaid: AirRaidPresentation | null
}
