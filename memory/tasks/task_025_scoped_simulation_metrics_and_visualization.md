---
title: "task_025_scoped_simulation_metrics_and_visualization"
type: "task"
tags: 
- "memory"
- "task"
up: 
- "[[index]]"
- "[[progress]]"
task_id: "task_025_scoped_simulation_metrics_and_visualization"
status: "completed"
---
# Task: task_025_scoped_simulation_metrics_and_visualization

## Description
Replace the slot-specific simulation metrics shape with generic scoped metrics, rework reporting/verification around normalized comparison targets, and rebuild `--visualize` as a useful simulation-vs-reference dashboard.

## Requirements
- Remove slot-specific assumptions from `RawSimulationMetrics`.
- Add nested scopes with generic count, value, distribution, and payout metrics.
- Let games record scoped metrics explicitly instead of expanding `SpinResult`.
- Replace hard-coded parsheet verification with normalized comparison selectors.
- Rebuild `--visualize` around the new report model.
- Add direct simulation-engine tests and sync memory docs.

## Status
completed

## Summary
Implemented a scoped simulation metrics system with generic recorder APIs, state-machine metric hooks, normalized reference comparisons, awaited HTML visualization, and direct simulation-engine coverage for finalize/merge/comparison behavior.
