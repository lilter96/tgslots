---
title: "task_020_fix_free_spin_simulation"
type: "task"
tags: 
- "memory"
- "task"
up: 
- "[[index]]"
- "[[progress]]"
task_id: "task_020_fix_free_spin_simulation"
status: "completed"
---
# Task: task_020_fix_free_spin_simulation

## Description
Implement the Free Spin simulation loop for Woodland Whisper. Wins during Free Spins must be doubled (payline + scatter).

## Requirements
- `spin()` must initiate the Free Spin state.
- `next()` must correctly loop through awarded free spins.
- Apply `2x` multiplier to wins during Free Spins.
- Integrate correctly with `ModernDataCollector`.

## Status
completed

## Summary
Implemented the Woodland Whisper free-spin loop so `spin()` enters the feature state, `next()` drains awarded free spins correctly, and free-spin wins receive the intended `2x` multiplier while remaining compatible with `ModernDataCollector`.
