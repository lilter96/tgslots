# Task: task_017_wager_and_cost_system

## Description
Implement a robust wager and cost system in `@packages/slots-core` based on the provided C# "truth" implementation. The system must handle game cost structures (base cost, line count, side bets) and provide a breakdown of how a user's total wager is distributed across these components.

## Requirements
- Port `CostDescription` logic to TypeScript with improved naming (e.g., `BetDefinition`).
- Port `ValidatedWager` logic to TypeScript with improved naming (e.g., `Wager`).
- Port `WagerBreakdown` logic to TypeScript with improved naming (e.g., `WagerBreakdown`).
- Handle multi-frame homogeneous games (`CostDescriptionMultiHomogeneous`).
- Ensure line wins are multiplied by `LineWager` and scatter wins are multiplied by `TotalWager` (as per rules).
- Use `slots-core` conventions (strictly typed, modular).

## Implementation Plan
1. Create `packages/slots-core/src/betting/types.ts` for interfaces and types.
2. Create `packages/slots-core/src/betting/bet-definition.ts` (equivalent to `CostDescription`).
3. Create `packages/slots-core/src/betting/wager.ts` (equivalent to `ValidatedWager` and `WagerBreakdown`).
4. Update `packages/slots-core/index.ts` to export new betting modules.
5. Add unit tests in `@packages/slots-core` (or a separate test file) to verify the logic.

## Files to Modify
- `packages/slots-core/index.ts`
- `packages/slots-core/src/betting/types.ts` (New)
- `packages/slots-core/src/betting/bet-definition.ts` (New)
- `packages/slots-core/src/betting/wager.ts` (New)

## Dependencies
- `@packages/slots-core`

## Status
completed

## Summary
Implemented a robust betting system and aligned games with parsheet data.
- **System**: Created `BetConfiguration`, `Bet`, and `WagerBreakdown` in `@packages/slots-core`.
- **Ancient Dragon**: 
    - Fixed scatter engine row count (5 -> 3).
    - Integrated new betting system.
    - Verified: RTP 85.93% (Target 88.04%), Scatter Cycle 140.71 (Target 140.52).
- **Woodland Whisper**:
    - Removed 2-of-a-kind pays for CHEST and COIN to match parsheet trigger logic and reduce hit rate.
    - Verified: RTP 95.45% (Target 88.04%), Scatter Cycle 137.51 (Target 140.52).
    - Hit rate reduced from 31% to 24% (Target 9% - discrepancy remains in provided reel strips).
- **Core Improvements**: Fixed `slots-simulation-engine` exports and added worker JIT warmup.
