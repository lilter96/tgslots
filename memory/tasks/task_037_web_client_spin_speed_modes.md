---
title: "Task 037: Web Client Fast and Turbo Spin Speeds"
type: "task"
aliases:
- "task_037"
tags:
- "memory"
- "task"
- "web-client"
up:
- "[[index]]"
- "[[active_context]]"
task_id: "037"
status: "completed"
date_started: "2026-05-11"
date_completed: "2026-05-11"
---
# Task 037: Web Client Fast and Turbo Spin Speeds

## Goal

Add modern slot-style fast and turbo spin modes to `apps/web-client`, with visible HUD controls and shared timing behavior across both Woodland Whisper and Ancient Dragon.

## Implementation Summary

1. Added `engine/spin-speed.ts` with a shared `SpinSpeedController` and three timing profiles: `normal`, `fast`, and `turbo`.
2. Extended the shared engine contracts so `main.ts` can drive spin-speed state into the active game runtime and `SpinOrchestrator`.
3. Added compact `FAST` and `TURBO` toggle controls to the bottom HUD footer, keeping the modern slot-style bottom-pinned control area intact.
4. Updated reel motion, reel stagger, settle timing, overlay pacing, payline/scatter highlight pacing, pick-bonus pacing, and auto-spin delay to consume the active speed profile.
5. Implemented the speed syncing in both game runtimes so Woodland Whisper and Ancient Dragon stay behaviorally aligned.
6. Added focused coverage for the spin-speed controller and for auto-spin scheduling with a non-default speed profile.

## Tests

- `bun --filter @tgslots/web-client test`
- `bun --filter @tgslots/web-client typecheck`
- `bun --filter @tgslots/web-client build`

## Outcome

- The shared web client now exposes `FAST` and `TURBO` spin controls directly in the footer HUD.
- Both shipped games honor the selected speed consistently for reel motion, win presentation, feature pacing, and auto-spin cadence.
- The change stayed inside the generic engine/plugin boundary instead of reintroducing game-specific timing logic into shared app code.

## Related

- [[task_033_web_client_responsive_layout]]
- [[task_035_web_client_plugin_refactor]]
- [[web-client]]
