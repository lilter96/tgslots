---
title: "Task 033: Web Client Responsive Layout"
type: "task"
task_id: "task_033_web_client_responsive_layout"
status: "completed"
tags:
- "memory"
- "task"
- "web-client"
- "frontend"
- "responsive"
up:
- "[[progress]]"
---
# Task 033: Web Client Responsive Layout

## Objective

Make the Woodland Whisper web client fully adaptive across phone, tablet, and desktop resolutions in both portrait and landscape, with a clean responsive architecture instead of ad hoc scaling.

## Requirements

- Add a shared viewport-aware layout model for the Pixi scene.
- Prevent overlap between reels, HUD, and overlays across supported resolutions.
- Rebuild the HUD and modal overlays so they reflow cleanly on small screens.
- Add deterministic tests for the layout rules.
- Keep memory documentation synchronized with the new frontend architecture.

## Summary

- Added `apps/web-client/src/engine/layout.ts` with a pure responsive scene-layout model:
  - viewport classification (`phone` / `tablet` / `desktop`),
  - orientation-aware HUD modes (`wide` / `compact` / `portrait`),
  - computed bounds for reels, info area, controls area, modals, and feature overlays.
- Replaced the old `main.ts` resize math with `getResponsiveLayout()`, so reels, frame, HUD, win overlay, pick bonus board, and auto-spin panel all consume one shared geometry snapshot.
- Rebuilt `HUD` as a reflowing bottom-footer layout instead of a fixed pair of scaled containers. The HUD now:
  - renders balance, bet, win, and free-spins status as responsive info cards,
  - pins both the info strip and the control dock to the bottom edge like a modern slot footer,
  - adapts across portrait, compact landscape, and wide desktop layouts without moving HUD info to the top or side.
- Refactored `AutoSpinPanel` into a responsive modal that:
  - sizes itself from viewport bounds,
  - reflows preset chips into multiple rows on narrow screens,
  - stacks stop-condition toggles when horizontal space is limited.
- Refactored `PickBonusUI` into a viewport-scaled feature board with responsive title sizing and centered feature bounds.
- Refactored `WinOverlay` to resize from the responsive layout snapshot and keep announcement scale readable on smaller screens.
- Added `apps/web-client/src/engine/__tests__/layout.test.ts` covering representative phone, tablet, laptop, and desktop viewports.
- Updated `apps/web-client/index.html` viewport/canvas rules for better full-screen mobile behavior.

## Verification

- `bun --filter @tgslots/web-client test`
- `bun --filter @tgslots/web-client typecheck`
- `bun --filter @tgslots/web-client build`
- `bun run typecheck` currently fails in unrelated pre-existing `apps/api/src/__tests__/woodland-whisper.test.ts` type errors and was not changed in this task.

## Completion Date

2026-05-06
