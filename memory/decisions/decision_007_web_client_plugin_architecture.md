---
title: "Decision 007: Web Client Game-as-Plugin Architecture"
type: "decision"
aliases:
- "decision_007"
- "web client plugin"
tags:
- "memory"
- "decision"
- "web-client"
- "architecture"
up:
- "[[index]]"
- "[[architecture]]"
decision_id: "007"
status: "accepted"
date: "2026-05-11"
---
# Decision 007: Web Client Game-as-Plugin Architecture

## Context

`apps/web-client` was originally hardwired to Woodland Whisper: the API base URL baked in the game path, `GameController` imported WW-specific types and constants, asset SVGs were WW-only, and feature views (pick bonus, free spins) lived alongside generic engine code with no plugin seam. Adding Ancient Dragon required a full client rewrite.

The backend already solved multi-game dispatch with `GameRegistry` declaration merging + `IGameModule<G>` + `GameServer.execute`. The decision was to mirror that pattern on the client.

## Decision

Introduce an `IGameClient<G>` plugin contract. The engine is game-agnostic; each game lives in `src/games/<id>/` and self-registers. Adding a new game = drop a folder and export an `IGameClient` instance.

### Key structures

```ts
// IGameClient<G> — game plugin contract
interface IGameClient<G extends GameId> {
  readonly manifest: GameManifest      // grid, symbols, theme, features
  readonly assets: AssetManifest       // SVG symbol/env records
  mount(ctx: GameUIContext<G>): Promise<GameRuntime<G>>
}

// GameRuntime<G> — returned by mount()
interface GameRuntime<G extends GameId> {
  applyState(state: GameState<G>): void
  presentResult<A extends ActionType<G>>(action: A, result: GameResult<G>): Promise<void>
  resize(layout: UILayoutSnapshot): void
  destroy(): void
  resumeFeatures?(): Promise<void>
}

// Scene — z-ordered layer stack injected into GameUIContext
interface Scene {
  readonly background: Container   // lowest z
  readonly reels: Container
  readonly features: Container
  readonly hud: Container
  readonly overlays: Container     // highest z
  clearGameLayers(): void
}
```

Contracts shared between api and web-client live in `packages/shared-contracts`.

## Rationale

- **Mirrors the API side** — same declaration-merging pattern; same `GameId` type; same `ActionPayload`/`ActionResponse` types shared via `@tgslots/shared-contracts`. Developers already understand the API dispatch model.
- **Zero-knowledge engine** — `SpinOrchestrator`, `HUD`, `dispatcher`, `scene` have no imports from any specific game package. Game-specific Pixi code stays in `src/games/<id>/`.
- **Feature views stay per-game** — `PickBonusView` (Woodland) and mystery-reveal (Ancient Dragon) are visually unique; abstracting them would yield a worse UI with no benefit.
- **Headless game packages stay simulation-friendly** — Pixi is kept out of `packages/games/*`.

## Consequences

- Adding a new game = one new folder under `src/games/<id>/` + one module declaration. No engine changes required.
- `main.ts` is the composition root and branches on gameId only for creating typed dispatchers and orchestrator actions. All other game-specific code is in the plugin.
- `@tgslots/shared-contracts` is a required dependency for both `apps/api` and `apps/web-client`. It must build before either consumer.
- The old `GameController` and `ApiClient` engine files are deleted; their responsibilities split between `SpinOrchestrator` (FSM loop) and `GameRuntime` (presentation).
