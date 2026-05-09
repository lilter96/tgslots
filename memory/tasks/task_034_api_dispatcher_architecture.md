---
title: "Task 034 — Type-Safe Stateless Dispatcher API"
type: "task"
task_id: "task_034"
status: "completed"
tags:
- "memory"
- "task"
up:
- "[[progress]]"
---
# Task 034 — Type-Safe Stateless Dispatcher API

## Goal

Introduce a `GameRegistry + GameServer` dispatcher so that `apps/api` can serve any number of games over a stateless, JSON-serialized session store, replacing the hardcoded Woodland-Whisper-only routes and the live-instance session store.

## Completed Work

### New files (`apps/api/src/`)

| File | Purpose |
|------|---------|
| `types/game-registry.ts` | `GameRegistry` interface extended via declaration merging; `GameId`, `GameState<G>`, `GameResult<G>`, `ActionType<G>`, `ActionPayload<G,A>` utility types |
| `types/actions.ts` | `ActionRequest<G,A>`, `ActionResponse<G>`, `DispatchOutcome<G>` |
| `types/woodland-whisper.reg.ts` | Declaration merge registering `'woodland-whisper'` with its state/result/actions |
| `types/ancient-dragon.reg.ts` | Declaration merge registering `'ancient-dragon'` |
| `game-module.ts` | `IGameModule<G>` interface (`defaultState`, `validateAction`, `execute`) |
| `session-manager.ts` | `ISessionManager` + `SessionEntry` interfaces |
| `in-memory-session-manager.ts` | `Map`-backed impl; 1-hour TTL, `purgeExpired` on every access |
| `dispatcher.ts` | `GameServer.register()` + synchronous `execute()` — hydrate → validate → run → save |
| `modules/woodland-whisper-state.ts` | `WoodlandWhisperSerializedState`, `WWFreeSpinSerialized`, `WWPickBonusSerialized` (uses `triggeringMultiplier: number` instead of `Wager`) |
| `modules/woodland-whisper.module.ts` | `WoodlandWhisperModule implements IGameModule<'woodland-whisper'>` |
| `modules/ancient-dragon-state.ts` | `AncientDragonSerializedState` |
| `modules/ancient-dragon.module.ts` | `AncientDragonModule implements IGameModule<'ancient-dragon'>` |
| `routes.ts` | Generic `POST /game/:gameId/:action` endpoint |
| `routes/woodland-whisper.routes.ts` | Typed wrappers at `/woodlandwhisper` (spin, buybonus, freespin, pick, state) |
| `routes/ancient-dragon.routes.ts` | Typed wrappers at `/ancientdragon` (spin, freespin, state) |
| `__tests__/session-manager.test.ts` | TTL + cross-game guard unit tests |
| `__tests__/dispatcher.test.ts` | Round-trip + error path tests against a fake `IGameModule` |

### Deleted files

- `apps/api/src/sessions.ts` — replaced by `in-memory-session-manager.ts`
- `apps/api/src/woodland-whisper.ts` — replaced by module + routes split

### Modified files

- `apps/api/src/index.ts` — rewritten to wire `InMemorySessionManager + GameServer`, register both modules, mount all three route sets
- `apps/api/src/dtos.ts` — added `sessionId: t.String()` to `ActionResponseSchema`
- `apps/api/src/__tests__/woodland-whisper.test.ts` — replaced `createSession`/`injectState` with `InMemorySessionManager.save()` helper; updated all imports
- `apps/api/package.json` — added `@tgslots/ancient-dragon: workspace:*`
- `packages/games/woodland-whisper/src/game-state-machine.ts` — optional `initialState` constructor param
- `packages/games/ancient-dragon/src/game-state-machine.ts` — optional `initialState` constructor param
- `packages/games/ancient-dragon/src/index.ts` — added type re-exports for `AncientDragonState`, `AncientDragonResult`, etc.

## Key Decisions

- **Synchronous `execute()`**: No async in dispatcher; all game logic and session I/O is synchronous.
- **Serialized state uses `triggeringMultiplier: number`** not `Wager` instance — hydration reconstructs `new Wager(multiplier, BET_CONFIG)`.
- **Elysia inline handlers** (not factory functions): factory pattern broke Elysia 1.x type inference; inline handlers let schema-adjacent inference work. `result!` non-null assertion is safe for action routes (spin/freespin/pick/buybonus always produce a result).
- **`/state` fallback**: When a provided (expired) sessionId returns 404, the state endpoint silently retries with no sessionId to create a new session — matching the documented behavior.
- **TypeBox only** (no Typia): already in-project via Elysia; gives compile-time inference, runtime validation, and Swagger in one schema.

## Verification

- `bun run typecheck` — passes
- `bun run lint` — passes
- `bun test` — **275 pass, 0 fail**
