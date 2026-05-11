---
title: "Task 036: Woodland Whisper Buy Bonus Frontend Restore"
type: "task"
aliases:
- "task_036"
tags:
- "memory"
- "task"
- "web-client"
- "woodland-whisper"
up:
- "[[index]]"
- "[[active_context]]"
task_id: "036"
status: "completed"
date_started: "2026-05-11"
date_completed: "2026-05-11"
---
# Task 036: Woodland Whisper Buy Bonus Frontend Restore

## Goal

Restore the Woodland Whisper buy-bonus feature in `apps/web-client` after the game-as-plugin refactor. The backend `buybonus` action already existed; the missing part was the plugin-owned HUD control and the wiring back into the shared `SpinOrchestrator`.

## Implementation Summary

1. Extended the local `GameUIContext` contract to expose `hud`, `fsm`, and `session` so game plugins can mount game-specific controls without adding game knowledge to `main.ts` or shared engine modules.
2. Added `buy-bonus-control.ts` under `apps/web-client/src/games/woodland-whisper/`:
   - mounts into `hud.slot('control-right')`
   - shows `BUY BONUS` with `100x BET`
   - disables itself outside `IDLE`, during auto-spin, or while free spins are active
   - emits `buy-bonus:requested`
3. Wired `main.ts` to:
   - forward `buy-bonus:requested` to `orchestrator.buyBonus(session.betMultiplier)`
   - publish `auto-spin:updated` so plugin controls can react to auto-spin state generically
4. Reused the existing `buybonus` dispatcher/orchestrator/runtime path; no API changes were needed.
5. Cleaned up web-client test typing so package-level typecheck passes.
6. Corrected the runtime sequencing bug: `applyState()` no longer opens the pick-bonus board from a buy-bonus or triggering-spin response. Instead it stores pending pick-bonus state, and the board opens only from the actual feature flow or from `resumeFeatures()` during restore.
7. Moved the Woodland Whisper pick-bonus board from `scene.features` to `scene.overlays` so the full-screen feature correctly covers the HUD/footer instead of rendering underneath balance/bet/win cards.

## Tests

- `bun --filter @tgslots/web-client test`
- `bun run --filter @tgslots/web-client typecheck`
- `bun run typecheck`
- `bun run --filter @tgslots/web-client build`

## Outcome

- Woodland Whisper again exposes a buy-bonus button in the plugin-based HUD.
- Buy bonus now triggers the existing backend `buybonus` action and flows through pick bonus + free spins in the shared orchestration path.
- The guaranteed trigger spin is now shown before the pick-bonus board opens, matching backend semantics.
- Web-client package tests, typecheck, and build all pass.

## Related

- [[task_035_web_client_plugin_refactor]]
- [[web-client]]
- [[woodland-whisper]]
