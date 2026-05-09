---
title: "Decision 006 — Type-Safe Stateless API Dispatcher"
type: "decision"
decision_id: "decision_006"
status: "accepted"
tags:
- "memory"
- "decision"
- "api"
up:
- "[[architecture]]"
---
# Decision 006 — Type-Safe Stateless API Dispatcher

## Context

`apps/api` was hardcoded to Woodland Whisper: routes, DTOs, and the session store kept live `WoodlandWhisperStateMachine` instances in memory. Adding Ancient Dragon (or any future game) would require copy-pasting the entire route + session layer.

## Decision

Adopt a `GameRegistry + GameServer` dispatcher pattern:

1. **`GameRegistry`** — a TypeScript interface extended via declaration merging. Each game file imports and merges its `(state, result, actions)` triple. All dispatcher, module, and route types are derived from this single source of truth.

2. **`IGameModule<G>`** — each game implements `defaultState`, `validateAction`, and `execute`. The dispatcher calls these methods; it never imports game logic directly.

3. **Stateless sessions** — sessions store only JSON (`WoodlandWhisperSerializedState`, `AncientDragonSerializedState`). Modules hydrate (deserialize) on load and dehydrate (serialize) after execution. `triggeringMultiplier: number` replaces `Wager` instances.

4. **`ISessionManager` interface** — `InMemorySessionManager` is the first impl; a Redis/SQL impl can slot in with no dispatcher change.

5. **TypeBox only** (no Typia) — already bundled with Elysia; provides compile-time inference, runtime validation, and Swagger output in one schema.

6. **Elysia inline handlers** — the factory-function pattern broke Elysia 1.x type inference. Inline handlers adjacent to their schemas allow Elysia to infer body/context types correctly. `result!` non-null assertion is safe for action endpoints (spin/buybonus/freespin/pick always produce a result).

## Consequences

- Adding a new game: implement `IGameModule<G>`, declare-merge the registry, mount routes. Dispatcher core is unchanged.
- The `StateMachine<TResult, TState>` simulation contract is untouched; `apps/simulations` is unaffected.
- The `/woodlandwhisper` URL prefix is preserved for backwards compatibility with `apps/web-client`.
- Horizontal scaling is now possible: swap `InMemorySessionManager` for a Redis-backed impl.
