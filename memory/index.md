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

- **Phase**: Active Development — 2 games implemented, API + simulation CLI + Pixi web client in place
- **Runtime**: Bun + TypeScript strict
- **Tests**: 322 passing tests as of 2026-05-11
- **Date Initialized**: 2026-04-21

## Architecture

[[architecture]]

## Core Components

[[math]]
[[slots-core]]
[[slots-simulation-engine]]
[[ancient-dragon]]
[[woodland-whisper]]
[[le-militare]]
[[web-client]]
[[marketing-app]]

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
| Game       | `@tgslots/le-militare`             | 6×5, cluster pays, cascade, 96.2% RTP, Combat Operation + persistent-multiplier free spins |
| Contracts  | `@tgslots/shared-contracts`        | Cross-app TS contracts: GameRegistry declaration merging, IGameClient, GameManifest, serialized states |
| App        | `apps/api`                         | Elysia HTTP API (port 3001) — GameServer dispatcher, IGameModule adapters |
| App        | `apps/simulations`                 | Unified simulation CLI and worker entrypoints     |
| App        | `apps/web-client`                  | Pixi multi-game frontend — both games selectable; plugin architecture via IGameClient |
| App        | `apps/marketing`                   | React 18 + Tailwind game presentation pages; "Play Demo" iframe → web-client |

## Games Summary

| Game             | Grid | Paylines        | RTP    | Feature                              |
| ---------------- | ---- | --------------- | ------ | ------------------------------------ |
| Ancient Dragon   | 5×3  | 25              | 88.05% | Mystery INNER + Free Spins (10, ≥3 scatters) |
| Woodland Whisper | 5×3  | 30              | 88.04% | Pick Bonus + Free Spins              |
| Le Militare      | 6×5  | Cluster pays    | 96.2%  | Combat Operation (S300 → PLANE multiplier-wild) + Cascade + Persistent Multiplier Free Spins + Buy Bonus (100×) |

## Quick Navigation

- `[[architecture]]`
- `[[dependencies]]`
- `[[progress]]`
- `[[active_context]]`
