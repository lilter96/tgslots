---
title: "task_028_fix_dragon_rtp_config"
type: "task"
tags:
- "memory"
- "task"
up:
- "[[index]]"
- "[[progress]]"
task_id: "task_028_fix_dragon_rtp_config"
status: "completed"
---
# Task: task_028_fix_dragon_rtp_config

## Description
Fix Ancient Dragon's 33% RTP bug and migrate the game to the external config format used by Woodland Whisper (config/config.json + config/parsheet.json).

## Root Cause
`BetConfiguration.fromLineCount(100)` set baseCost=100 but `PAYLINE_DATA` only encodes 25 paylines. Players paid 4× the expected cost, deflating line RTP by 4×. Result: ~33% instead of 88%.

## Requirements
- Fix BetConfig to match actual payline count (25)
- Restore INNER mystery symbol mechanic (FAN clusters were placeholders)
- Migrate constants to load from config/config.json
- Create config/parsheet.json with comprehensive simulation comparisons
- Scale paytable to achieve ~88% RTP

## Status
completed

## Summary
- Created `config/config.json`: lines=25, paytable scaled for 88% RTP, FAN clusters replaced with INNER tokens in reel strips, inner_reel_strip for mystery resolution, feature config.
- Created `config/parsheet.json`: 6 comparisons — total RTP (88.05% ±1%), win cycle (~2.08 ±5%), trigger cycle (~142 ±5%), retrigger cycle (~1965 ±20%), avg spins/trigger (~10.72 ±5%), feature RTP (~6.26% ±1.5%).
- Rewrote `constants.ts` to load all data from config.json (same pattern as Woodland Whisper).
- Updated `index.ts` to export `SIM_CONFIG` with parsheet loaded from file.
- Verified 88.95% RTP over 2M spins; all parsheet comparisons pass.
