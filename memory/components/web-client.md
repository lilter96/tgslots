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

Pixi-based Woodland Whisper frontend. Owns local session balance display, reel rendering, HUD, feature overlays, auto-spin controls, API-driven game flow, and restoration of active pick-bonus / free-spin sessions from backend state.

## UI Flow

- `GameController` is the orchestration layer between API state, reel animations, feature overlays, and HUD synchronization.
- `HUD` renders balance, bet, last win, the buy-bonus button, auto-spin controls, and the persistent free-spins status panel.
- `WinOverlay` renders transient centered announcements such as `BONUS!`, win tiers, and dynamic free-spin award messages.
- `PickBonusUI` renders the 20-card pick-bonus board and restores revealed picks from session state.

## Free Spins UX

- The HUD shows a persistent `FREE SPINS` panel whenever `state.freeSpins?.spinsRemaining > 0`.
- The panel displays the remaining count, e.g. `7 LEFT`.
- When a pick bonus resolves into free spins, the centered banner shows the awarded amount, e.g. `10 FREE SPINS WON`.
- On free-spin retrigger, the awarded amount is computed from the delta between previous and next `spinsRemaining`, then announced without requiring any backend DTO change.
- On session restore, active free spins resume with the persistent remaining-count panel visible, but without replaying a fabricated “won X spins” announcement.

## Key Files

- `src/engine/game-controller.ts` — API orchestration, feature loops, free-spin status broadcasting
- `src/engine/hud.ts` — balance/bet/win controls and persistent free-spins HUD panel
- `src/engine/win-overlay.ts` — transient feature and win banners
- `src/engine/free-spins-status.ts` — pure status derivation and dynamic copy helpers
- `src/main.ts` — Pixi bootstrap and controller/HUD wiring

## Verification

- `bun run test`
- `bun run typecheck`
- `bun run build`
