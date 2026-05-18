import type { Container } from 'pixi.js'

export interface SymbolTransformEvent {
  reel: number
  row: number
  newSymbolId: number
}

export interface MultiplierStickEvent {
  reel: number
  row: number
  multiplier: number
  badge: Container
}
