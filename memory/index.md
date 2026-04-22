# TgSlots Project Map

## Status

- **Phase**: Active Development — 2 games shipped, 0 tests written
- **Runtime**: Bun + TypeScript strict
- **Date Initialized**: 2026-04-21

## Architecture

[[architecture]]

## Core Components

[[math]]
[[slots-core]]
[[slots-simulation-engine]]
[[ancient-dragon]]
[[woodland-whisper]]

## Development

[[active_context]]
[[progress]]
[[dependencies]]
[[coding_rules]]
[[testing_strategy]]

## System Map

| Layer      | Package                            | Purpose                                           |
| ---------- | ---------------------------------- | ------------------------------------------------- |
| Math       | `@tgslots/math`                    | RNG, probability, Sampler/Distribution primitives |
| Core       | `@tgslots/slots-core`              | Paylines, paytable, symbol registry, slot engine  |
| Simulation | `@tgslots/slots-simulation-engine` | Parallel worker runner, metrics, CLI              |
| Game       | `@tgslots/ancient-dragon`          | 5×3, 100 lines, 88.04% RTP, free spins            |
| Game       | `@tgslots/woodland-whisper`        | 5×3, 30 lines, 88.04% RTP, pick bonus             |
| App        | `apps/simulations`                 | CLI entry points per game                         |

## Games Summary

| Game             | Grid | Paylines | RTP    | Feature                      |
| ---------------- | ---- | -------- | ------ | ---------------------------- |
| Ancient Dragon   | 5×3  | 100      | 88.04% | Free Spins (10, ≥3 scatters) |
| Woodland Whisper | 5×3  | 30       | 88.04% | Pick Bonus + Free Spins      |

## Quick Navigation

- Architecture decisions → `memory/decisions/`
- Task files → `memory/tasks/`
- Component docs → `memory/components/`
- Planning docs → `memory/planning/`
