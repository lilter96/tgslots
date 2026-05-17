---
title: "Task 039: Le Militare Web-Client Visuals"
type: task
status: completed
task_id: "039"
component: "le-militare"
tags: [web-client, animation, cascade]
---

# Task 039: Le Militare Web-Client Visuals

Fix the missing cascade animations and implement the planned Combat Operation visuals in the web-client.

## Success Criteria
- [x] Implement `CascadeAnimator` for falling symbol animations.
- [x] Implement `CombatOperationView` for S300 and shootdown animations.
- [x] Implement `MultiplierHud` for persistent multiplier tracking.
- [x] Implement `BuyBonusControl` for feature purchase.
- [x] Integrate all components into `LeMilitareRuntime`.
- [x] Verify smooth transitions between cascade steps.

## Progress
- Created `cascade-animator.ts` with GSAP-based falling logic.
- Created `combat-operation-view.ts` for S300 flood and multiplier badge animations.
- Created `multiplier-hud.ts` for session/spin multiplier display.
- Created `buy-bonus-control.ts` for buy bonus functionality.
- Updated `LeMilitareRuntime` to use the new animation pipeline.
- Verified with typecheck.
