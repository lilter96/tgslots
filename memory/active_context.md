---
title: "Active Context"
type: "active-context"
aliases: 
- "Current Task"
tags: 
- "memory"
- "context"
up: 
- "[[index]]"
current_task: "task_028_fix_dragon_rtp_config"
---
# Active Context

## Recent Changes
- Fixed Ancient Dragon 33% RTP bug: root cause was `BetConfiguration.fromLineCount(100)` with only 25 paylines in PAYLINE_DATA, causing 4× overbilling relative to evaluated paylines.
- Migrated Ancient Dragon to external config format (config/config.json + config/parsheet.json) matching Woodland Whisper pattern.
- Restored INNER mystery symbol mechanic: replaced FAN clusters in reel strips with INNER tokens across all 5 reels; added inner_reel_strip to config.
- Scaled paytable values to target 88.05% RTP (confirmed 88.95% ± 1% over 2M spins).
- All parsheet comparisons now passing (RTP, win cycle, trigger cycle, retrigger cycle, avg spins/trigger, feature RTP).

## Next Steps
- Expand test coverage for core packages.
- Implement the third slot game.
