---
title: "task_002_sim_engine_enhanced_reporting"
type: "task"
tags: 
- "memory"
- "task"
up: 
- "[[index]]"
- "[[progress]]"
task_id: "task_002_sim_engine_enhanced_reporting"
status: "completed"
---
# Task: task_002_sim_engine_enhanced_reporting

## Description

The current simulation reporting is too basic. We need enhanced metrics (variance, scatter cycle, per-mode RTP, feature analytics) to properly validate games against par sheets.

## Requirements

- Extend `SpinResult` and simulation metrics to capture richer reporting data.
- Add formatted CLI output for enhanced reporting.
- Keep both games compatible with the expanded collector and formatter flow.

## Implementation Plan

- [x] Step 1: Create task file and update memory
- [x] Step 2: Extend `SpinResult` and `RawSimulationMetrics` interfaces
- [x] Step 3: Update `ModernDataCollector`
- [x] Step 4: Update `Metrics.emptyRaw()`, `merge()`, and `finalize()`
- [x] Step 5: Populate `scatters` and `featureType` in Woodland Whisper
- [x] Step 6: Create `packages/slots-simulation-engine/src/cli/formatter.ts`
- [x] Step 7: Update `cli/index.ts`
- [x] Step 8: Update entry points

## Status
completed

## Summary

Implemented enhanced simulation reporting, including richer metrics and formatted CLI output. During the work, also fixed an infinite loop bug in `mt19937`, corrected an Ancient Dragon payline bounds bug, and verified both games with 1M-spin runs.
