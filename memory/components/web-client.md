---
title: "Web Client"
type: "component"
aliases:
- "web-client"
tags:
- "memory"
- "component"
- "web-client"
up:
- "[[index]]"
- "[[architecture]]"
- "[[dependencies]]"
component: "web-client"
---
# Component: Web Client

## Package

`@tgslots/web-client` — `apps/web-client/`

## Responsibility

Pixi-based multi-game frontend. Both Woodland Whisper and Ancient Dragon are selectable. Owns responsive scene layout, session balance, reel rendering, HUD, feature overlays, auto-spin controls, API-driven game flow, and session restoration. Built on a plugin architecture: adding a new game = drop a folder under `src/games/<id>/` and export an `IGameClient` instance.

## Plugin Architecture

Games register themselves by augmenting `GameRegistry` (declaration merging from `@tgslots/shared-contracts/game-registry`) and implementing `IGameClient<G>`:

```
src/games/
  registry.ts                     ← Record<GameId, IGameClient<GameId>>
  woodland-whisper/
    index.ts                       ← declare module + IGameClient export
    manifest.ts, assets.ts
    runtime.ts                     ← WoodlandWhisperRuntime (pick bonus, buy bonus, free spins)
    buy-bonus-control.ts
    pick-bonus-view.ts
    free-spins-helpers.ts
    __tests__/
  ancient-dragon/
    index.ts
    manifest.ts, assets.ts
    runtime.ts                     ← AncientDragonRuntime (mystery INNER reveal, free spins)
    __tests__/
  le-militare/
    index.ts, manifest.ts, assets.ts
    runtime.ts                     ← LeMilitareRuntime (~330 lines; delegates to helpers, ReelFrame, combat/, mascot/)
    multiplier-hud.ts, buy-bonus-control.ts, animation-config.ts
    helpers/                       ← pure helpers: grid-transform, cluster-grouping, free-spins-math,
                                       mascot-projection, tween-utils, buy-bonus-rules, present-plan
    reel-frame/reel-frame.ts       ← ReelFrame extends Graphics; update(layout, reelScale)
    mascot/                        ← S300Mascot composition root + palette, design, draw-chassis,
                                       draw-radar, draw-launcher, tweens, geometry
    combat/                        ← CombatOperationView composition root + wire-renderer,
                                       activation-animator, missile, explosion, badge, events
    __tests__/                     ← grid-transform, cluster-grouping, free-spins-math,
                                       buy-bonus-rules, present-plan, runtime tests
```

**Le Militare `PresentPlan` pattern**: `derivePresentPlan(result: LeMilitareResult)` returns a `{ preAnnounce?, retriggerAnnounce? }` struct that drives the single `_present(result, plan)` method — eliminates three near-duplicate `_presentBase/_presentFree/_presentBuy` methods (OCP fix).

**Le Militare coordinate transform**: `helpers/mascot-projection.ts` encapsulates the 8-line bespoke math that converts mascot-parent-space launch/connection points into `CombatOperationView` local design-space coordinates. Called from `LeMilitareRuntime.resize()`.

**`IGameClient<G>`** (from `@tgslots/shared-contracts`):
- `manifest: GameManifest` — grid, symbols, theme, features, natural dimensions
- `assets: AssetManifest` — SVG symbol/environment records
- `mount(ctx: GameUIContext<G>): Promise<GameRuntime<G>>`

**`GameUIContext<G>`** (web-client local):
- `scene`, `eventBus`, `dispatcher`, `assets`
- `fsm`, `session`, `hud` so a plugin can mount game-specific HUD controls without pushing game logic into the shared engine

**`GameRuntime<G>`**:
- `applyState(state)` — restores visual state; always emits `'free-spins:updated'` on the event bus
- `presentResult(action, result)` — drives reel animation, win overlay, and feature views
- `resize(layout)`, `destroy()`
- Optional `resumeFeatures?()` — resumes pick-bonus or mid-session features after restore

## Engine Layer (zero knowledge of any specific game)

| File | Responsibility |
|---|---|
| `engine/dispatcher.ts` | `GameDispatcher<G>` — `POST /game/:gameId/:action`, persists sessionId per game in `localStorage` (`tgslots:session:<gameId>`) |
| `engine/spin-orchestrator.ts` | Generic FSM loop: wager deduction, spin, free-spin loop (`while freeSpinsRemaining > 0`), auto-spin with stop conditions, and shared speed-aware auto-spin cadence |
| `engine/state-machine.ts` | UI FSM: IDLE → SPINNING → STOPPING → WIN_SHOW / FEATURE_TRANSITION → IDLE |
| `engine/session-manager.ts` | Balance, bet multiplier, last win |
| `engine/event-bus.ts` | Typed pub/sub: `win:awarded`, `free-spins:updated`, `auto-spin:updated`, `buy-bonus:requested`, `feature:enter/exit`, `pick-card-selected`, `error:api` |
| `engine/signal.ts` | ~60-line typed reactive signal; `subscribe` returns unsubscribe token |
| `engine/scene.ts` | `PixiScene` — 5 named z-ordered Containers: background → reels → features → hud → overlays; `clearGameLayers()` empties bottom 3 |
| `engine/asset-registry.ts` | Namespaced texture loading; SVG rasterization via canvas API |
| `engine/hud.ts` | Bottom-pinned adaptive HUD footer: balance, bet, last-win, `FAST` / `TURBO`, spin, auto-spin, free-spins badge, and plugin-owned control slots |
| `engine/layout.ts` | Responsive viewport snapshot per manifest dimensions; portrait/landscape/wide |
| `engine/spin-speed.ts` | Shared `normal` / `fast` / `turbo` timing profiles plus the controller that coordinates HUD state, runtime pacing, and auto-spin delay |
| `engine/reel-set.ts`, `engine/reel.ts`, `engine/symbol-view.ts` | Manifest-driven reel strip rendering |
| `engine/win-overlay.ts` | Transient win/feature announcements; copy from `manifest.winTiers` |
| `engine/auto-spin-panel.ts` | Responsive auto-spin modal |

## App Entry

| File | Responsibility |
|---|---|
| `src/main.ts` | `init()` reads `?game=`; missing/unknown → `showPicker()`. `mountGame(gameId)` bootstraps Pixi app, scene, session, eventBus, assetRegistry, HUD, dispatcher, runtime, orchestrator |
| `src/app/game-picker.ts` | Pure DOM overlay listing `gameRegistry` entries; `history.pushState` on selection |

## API Connectivity

- Dev: `BASE_URL = ''` — `/game/*` forwarded to `:3001` by Vite dev proxy (`vite.config.ts`)
- Prod: set `VITE_API_URL` env var
- SessionId persisted in `localStorage` per game

## Free Spins Flow

- `runtime.applyState()` always emits `'free-spins:updated'`
- `SpinOrchestrator` tracks `_freeSpinsRemaining` via this event and loops `doFreeSpin()` automatically
- HUD shows persistent free-spins badge via `eventBus.on('free-spins:updated', ...)`
- Announced as `N FREE SPINS WON` via `formatFreeSpinsAwardedMessage(n)` (Woodland only)

## Spin Speed Modes

- `SpinSpeedController` owns the active mode: `normal`, `fast`, or `turbo`
- `HUD` exposes compact `FAST` and `TURBO` toggles in the bottom footer and `main.ts` syncs the selected mode into the mounted runtime
- `SpinOrchestrator` uses the active profile for post-spin auto-spin delay
- `ReelSet`, `Reel`, `WinOverlay`, and both game runtimes use the shared profile for reel stagger, spin duration, settle timing, overlay pacing, win-line highlight pacing, scatter pacing, and pick-bonus pacing

## Woodland Buy Bonus Flow

- Woodland Whisper mounts `buy-bonus-control.ts` into `hud.slot('control-right')`
- The button emits `buy-bonus:requested`; `main.ts` forwards it to `SpinOrchestrator.buyBonus(session.betMultiplier)`
- The control disables itself outside `IDLE`, during auto-spin, or while free spins are active by listening to `fsm`, `auto-spin:updated`, and `free-spins:updated`
- Woodland Whisper `applyState()` does **not** render the pick-bonus board immediately from action responses; it only stashes pending feature state. The board is shown by the explicit feature flow (`presentResult(...)->_runPickBonus()`) or by `resumeFeatures()` during session restore.
- Woodland Whisper pick-bonus UI is mounted in `scene.overlays`, not `scene.features`, so the full-screen bonus board correctly covers the bottom HUD/footer.

## Verification

- `bun --filter @tgslots/web-client test`
- `bun --filter @tgslots/web-client run typecheck`
- `bun run build`
- Manual: `http://localhost:3002/?game=woodland-whisper`, `?game=ancient-dragon`, `http://localhost:3002/` (picker)
