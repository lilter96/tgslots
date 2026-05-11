import type { GameId, ActionType, GameState, GameResult } from '@tgslots/shared-contracts'
import type { GameManifest, AssetManifest } from '@tgslots/shared-contracts'
import type { Scene } from './scene.js'
import type { GameEventBus } from './event-bus.js'
import type { GameDispatcher } from './dispatcher.js'
import type { GameAssets } from './asset-registry.js'
import type { UILayoutSnapshot } from './layout.js'

export type { GameManifest, AssetManifest, GameAssets }

export interface GameUIContext<G extends GameId> {
  readonly scene: Scene
  readonly eventBus: GameEventBus
  readonly dispatcher: GameDispatcher<G>
  readonly assets: GameAssets
}

export interface GameRuntime<G extends GameId> {
  applyState(state: GameState<G>): void
  presentResult<A extends ActionType<G>>(action: A, result: GameResult<G>): Promise<void>
  resize(layout: UILayoutSnapshot): void
  destroy(): void
  /** Optional: resume any active feature (e.g. pick bonus) after a session restore. */
  resumeFeatures?(): Promise<void>
}

export interface IGameClient<G extends GameId> {
  readonly manifest: GameManifest
  readonly assets: AssetManifest
  mount(ctx: GameUIContext<G>): Promise<GameRuntime<G>>
}
