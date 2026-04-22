# Task: task_002_sim_engine_enhanced_reporting

## Context

The current simulation reporting is too basic. We need enhanced metrics (variance, scatter cycle, per-mode RTP, feature analytics) to properly validate games against par sheets.

## Status

- [x] Step 1: Create task file and update memory
- [x] Step 2: Extend `SpinResult` and `RawSimulationMetrics` interfaces
- [x] Step 3: Update `ModernDataCollector`
- [x] Step 4: Update `Metrics.emptyRaw()`, `merge()`, and `finalize()`
- [x] Step 5: Populate `scatters` and `featureType` in Woodland Whisper
- [x] Step 6: Create `packages/slots-simulation-engine/src/cli/formatter.ts`
- [x] Step 7: Update `cli/index.ts`
- [x] Step 8: Update entry points

## Progress

- 2026-04-21: Initialized task.
- 2026-04-21: Implemented enhanced reporting. Discovered and fixed infinite loop bug in `mt19937` (rejection sampling limit truncation). Fixed out-of-bounds bug in `Ancient Dragon` payline evaluation. Verified both games with 1M spins.
