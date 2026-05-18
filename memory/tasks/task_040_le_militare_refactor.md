---
title: "Le Militare SOLID Refactor"
type: "task"
task_id: "task_040"
status: "completed"
tags:
- "memory"
- "task"
- "web-client"
- "le-militare"
- "refactor"
up:
- "[[progress]]"
---
# Task 040: Le Militare SOLID Refactor

## Goal

Decompose three god-files in `apps/web-client/src/games/le-militare/` following SOLID principles and reaching woodland-parity on test coverage.

## What Was Done

### Phase 1 — Pure helpers + tests (no behavior change)
- Created `helpers/grid-transform.ts`: `transposeGrid`, `decodePosition`
- Created `helpers/cluster-grouping.ts`: `groupHitsBySymbol`
- Created `helpers/free-spins-math.ts`: `deriveFreeCarryOverMultiplier`
- Created `helpers/mascot-projection.ts`: `projectMascotPointsToCombatLocal`
- Added `__tests__/grid-transform.test.ts`, `cluster-grouping.test.ts`, `free-spins-math.test.ts`
- Updated `runtime.ts` to import from these helpers

### Phase 2 — Buy-bonus woodland parity
- Created `helpers/buy-bonus-rules.ts`: `isBuyBonusEnabled`, `formatBuyBonusCostLabel`
- Refactored `buy-bonus-control.ts` to delegate to helpers
- Added `__tests__/buy-bonus-rules.test.ts`

### Phase 3 — Mascot decomposition
- Deleted `s300-mascot.ts` (676 lines)
- Created `mascot/` subfolder: `palette.ts`, `design.ts`, `draw-chassis.ts`, `draw-radar.ts`, `draw-launcher.ts`, `tweens.ts`, `geometry.ts`, `index.ts`
- Created `helpers/tween-utils.ts`: `killAllTweens` (shared, deduplicates recursive GSAP kill logic)
- `mascot/index.ts` is ~105-line `S300Mascot extends Container` composition root

### Phase 4 — Combat view decomposition
- Deleted `combat-operation-view.ts` (645 lines)
- Created `combat/` subfolder: `events.ts`, `combat-layout.ts`, `wire-renderer.ts`, `activation-animator.ts`, `missile.ts`, `explosion.ts`, `badge.ts`, `index.ts`
- `combat/index.ts` is ~165-line `CombatOperationView extends Container` composition root
- Dropped dead `_trailGraphics: Graphics | null = null` field
- `destroy()` uses shared `killAllTweens` instead of duplicated inline recursive kill
- `clearPersistentMultipliers` and `deactivateAllWires` collapsed into private `_deactivateWires()`
- Updated `runtime.ts` import from `./combat-operation-view.js` → `./combat/index.js`

### Phase 5 — Runtime collapse
- Created `helpers/present-plan.ts`: `PresentPlan` type + `derivePresentPlan(result)` — switch-based, exhaustive
- Collapsed `_presentBase/_presentFree/_presentBuy` into single `_present(result, plan)` in `runtime.ts`
- Created `reel-frame/reel-frame.ts`: `ReelFrame extends Graphics` with `update(layout, reelScale)` — accepts config struct at construction, draws border + column/row separators
- Replaced ~27 lines of inline frame drawing in `runtime.resize()` with `this._frame.update(layout, reelScale)`
- Added `__tests__/present-plan.test.ts` (6 tests), `__tests__/runtime.test.ts` (2 tests)

### Phase 6 — Bug fix + memory update
- Fixed `assets.ts` audio paths: `/assets/sounds/woodland-whisper/` → `/assets/sounds/le-militare/`
- Updated memory docs

## Final Structure

```
le-militare/
  index.ts, manifest.ts, assets.ts (audio paths corrected), animation-config.ts
  runtime.ts                  (~330 lines, down from 429)
  multiplier-hud.ts
  buy-bonus-control.ts        (delegates to helpers)
  helpers/
    grid-transform.ts
    cluster-grouping.ts
    free-spins-math.ts
    mascot-projection.ts
    tween-utils.ts
    buy-bonus-rules.ts
    present-plan.ts
  reel-frame/
    reel-frame.ts
  mascot/
    index.ts, palette.ts, design.ts
    draw-chassis.ts, draw-radar.ts, draw-launcher.ts
    tweens.ts, geometry.ts
  combat/
    index.ts, events.ts, combat-layout.ts
    wire-renderer.ts, activation-animator.ts
    missile.ts, explosion.ts, badge.ts
  __tests__/
    grid-transform.test.ts, cluster-grouping.test.ts
    free-spins-math.test.ts, buy-bonus-rules.test.ts
    present-plan.test.ts, runtime.test.ts
```

## Verification

- `bun run typecheck` — only 5 pre-existing errors in `packages/games/le-militare/src/` (not caused by this refactor)
- `bun --filter @tgslots/web-client test` — 105 tests pass (up from 97 before the refactor)
