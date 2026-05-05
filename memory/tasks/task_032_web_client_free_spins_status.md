---
title: "Task 032: Web Client Free Spins Status"
type: "task"
task_id: "task_032_web_client_free_spins_status"
status: "completed"
tags:
- "memory"
- "task"
- "web-client"
- "woodland-whisper"
up:
- "[[progress]]"
---
# Task 032: Web Client Free Spins Status

## Objective

Fix the Woodland Whisper web client UX around free spins so players can always see how many free spins remain, and show how many free spins were just awarded when a pick bonus trigger or retrigger resolves.

## Requirements

- Add a persistent in-game free-spins status banner to the HUD.
- Show the awarded free-spin amount in the feature announcement banner.
- Derive the awarded amount from existing state transitions without changing the backend API.
- Add deterministic tests for the frontend free-spin status logic.

## Summary

- Added `FreeSpinsStatus` to `apps/web-client/src/types.ts`.
- Added `apps/web-client/src/engine/free-spins-status.ts` with pure helpers to:
  - derive the current HUD-visible free-spin state,
  - compute awarded spins from state deltas,
  - format the dynamic announcement copy.
- Updated `GameController` to own and broadcast free-spin status changes, announce awarded spins after pick-bonus resolution, and keep HUD state synchronized through init, trigger, retrigger, and feature completion flows.
- Updated `HUD` to render a persistent `FREE SPINS` panel with the remaining count while a free-spin session is active.
- Updated `WinOverlay` to support dynamic text announcements via `announceFreeSpinsAwarded()`, rendering copy such as `10 FREE SPINS WON`.
- Added `apps/web-client/src/engine/__tests__/free-spins-status.test.ts` covering trigger, retrigger, restore, zero-remaining, and copy formatting cases.

## Verification

- `bun --filter @tgslots/web-client test`
- `bun run typecheck` (from `apps/web-client`)
- `bun run build` (from `apps/web-client`)

## Completion Date

2026-05-06
