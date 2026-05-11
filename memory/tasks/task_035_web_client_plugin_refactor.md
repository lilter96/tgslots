---
title: "Task 035: Web Client Game-as-Plugin Refactor"
type: "task"
aliases:
- "task_035"
tags:
- "memory"
- "task"
- "web-client"
up:
- "[[index]]"
- "[[active_context]]"
task_id: "035"
status: "completed"
date_started: "2026-05-10"
date_completed: "2026-05-11"
---
# Task 035: Web Client Game-as-Plugin Refactor

## Goal

Refactor `apps/web-client` from a single-game Woodland Whisper client into a multi-game plugin host. Both Woodland Whisper and Ancient Dragon should be selectable at `?game=<id>`. Adding a third game should require only a new folder under `src/games/<id>/`.

## Migration Steps (all completed)

1. **`packages/shared-contracts`** — new package with `GameRegistry` declaration merging, `IGameClient`, `GameManifest`, `AssetManifest`, `GameRuntime`, `GameUIContext`, serialized states, `ActionRequest`/`ActionResponse`.
2. **Types in shared-contracts** — `IGameClient`/`GameManifest`/`GameRuntime` interfaces published.
3. **Ancient Dragon result parity** — `grid: number[][]` and `hits: PaylineHit[]` propagated through AD state machine → API module → serialized state.
4. **New engine primitives** — `dispatcher.ts`, `signal.ts`, `event-bus.ts` added alongside existing engine.
5. **Manifest-driven generic engine** — `reel-set.ts`, `reel.ts`, `symbol-view.ts`, `asset-registry.ts`, `hud.ts`, `win-overlay.ts`, `layout.ts` refactored; no Woodland-specific imports in engine layer.
6. **Woodland Whisper UI plugin** — extracted to `src/games/woodland-whisper/`; `pick-bonus-ui.ts` and `free-spins-status.ts` moved; `IGameClient<'woodland-whisper'>` implemented.
7. **`spin-orchestrator.ts`** — generic FSM orchestrator replaces `game-controller.ts`; `main.ts` restructured around `?game=` routing and `GamePicker` fallback.
8. **Ancient Dragon UI plugin** — `src/games/ancient-dragon/` with inline SVG assets, manifest, and runtime (free spins, mystery INNER reveal).
9. **`game-picker.ts`** — DOM overlay listing all registered games; `history.pushState` on selection.
10. **Cleanup** — page title → "TG Slots"; `vite.config.ts` dev proxy to `:3001`; `BASE_URL = ''` default; `@tgslots/math` removed from web-client dependencies.

## Tests Added (Step 10 / completion)

- `engine/__tests__/signal.test.ts` — subscribe order, unsubscribe idempotence, same-value no-notify
- `engine/__tests__/dispatcher.test.ts` — URL format, sessionId persistence per gameId, error envelope
- `engine/__tests__/spin-orchestrator.test.ts` — FSM transitions for base spin, win, free-spin loop, auto-spin, resume
- `engine/__tests__/scene.test.ts` — Scene interface z-order and clearGameLayers contract
- `packages/shared-contracts/src/__tests__/registry.test.ts` — GameRegistry utility type assertions
- `games/woodland-whisper/__tests__/free-spins-status.test.ts` — relocated from `engine/__tests__/`

## Outcome

- 322 tests passing (was 275)
- Both games boot at `http://localhost:3002/?game=woodland-whisper` and `?game=ancient-dragon`
- Game picker at `http://localhost:3002/` (no param)
- Engine has zero imports from any specific game package
- `@tgslots/shared-contracts` consumed by both `apps/api` and `apps/web-client`

## Related

- [[decision_007_web_client_plugin_architecture]]
- [[web-client]]
- [[ancient-dragon]]
- [[task_034_api_dispatcher_architecture]]
