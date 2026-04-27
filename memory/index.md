---
title: "TgSlots Project Map"
type: "map"
aliases: 
- "Project Map"
- "Memory Index"
tags: 
- "memory"
- "index"
---
# TgSlots Project Map

## Status

- **Phase**: Active Development — 2 games implemented, unified simulation CLI and report generation in place
- **Runtime**: Bun + TypeScript strict
- **Tests**: 11 files / 168 passing tests across `math`, `slots-core`, and `slots-simulation-engine` as of 2026-04-26
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

## Obsidian Vault

> [!tip]
> `memory/` is a real Obsidian vault. Every note should keep YAML frontmatter with `title`, `type`, `tags`, `aliases`, and `up`; task, component, and decision notes also carry machine-readable IDs and status fields. Prefer `[[wikilinks]]`, keep note titles stable, and use the metadata for search or Dataview-style queries.

## System Map

| Layer      | Package                            | Purpose                                           |
| ---------- | ---------------------------------- | ------------------------------------------------- |
| Math       | `@tgslots/math`                    | RNG, probability, Sampler/Distribution primitives |
| Core       | `@tgslots/slots-core`              | Paylines, scatter, betting, paytable, slot engine |
| Simulation | `@tgslots/slots-simulation-engine` | Parallel runner, scoped metrics, CLI, JSON/HTML reports |
| Game       | `@tgslots/ancient-dragon`          | 5×3, 25 lines, 88.05% RTP target, mystery INNER + free spins |
| Game       | `@tgslots/woodland-whisper`        | 5×3, 30 lines, 88.04% RTP, pick bonus             |
| App        | `apps/simulations`                 | Unified simulation CLI and worker entrypoints     |

## Games Summary

| Game             | Grid | Paylines | RTP    | Feature                              |
| ---------------- | ---- | -------- | ------ | ------------------------------------ |
| Ancient Dragon   | 5×3  | 25       | 88.05% | Mystery INNER + Free Spins (10, ≥3 scatters) |
| Woodland Whisper | 5×3  | 30       | 88.04% | Pick Bonus + Free Spins              |

## Quick Navigation

- `[[architecture]]`
- `[[dependencies]]`
- `[[progress]]`
- `[[active_context]]`
