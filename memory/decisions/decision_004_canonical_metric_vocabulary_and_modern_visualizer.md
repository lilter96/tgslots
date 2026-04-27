---
title: "Canonical metric vocabulary and modern offline-charted visualizer"
type: "decision"
aliases:
- "decision_004_canonical_metric_vocabulary_and_modern_visualizer"
tags:
- "memory"
- "decision"
up:
- "[[index]]"
- "[[architecture]]"
decision_id: "decision_004_canonical_metric_vocabulary_and_modern_visualizer"
status: "accepted"
---
# Decision: Canonical metric vocabulary + modern offline-charted visualizer

## Context

After [[decision_003_split_payout_and_rtp_metric_kinds]] the engine had clean metric kinds, but the metric *names* were drifting between games:

- Same concept, different names: AD `hits` vs WW `winning-spins`; AD `awarded-spins` vs WW `spins-awarded`; AD `spins` vs WW `spins-played`.
- Engine auto-emitted `round-payout` (actually rtp-kind) and `round-win` (collided with the `payout`-kind `round-win` recorded inside `features/free-spins`).
- `feature-rtp` (rtp) and `feature-win` (payout) cohabited the free-spin scope with no obvious distinction in name.

Separately, the `--visualize` HTML output was 334 lines of hand-rolled HTML with zero charts, zero animations, no theme toggle, and a flat comparison table that gave no sense of tolerance bands. Distribution metrics and the ratio-bearing RTP metrics rendered as the same anonymous 3-cell table row.

## Options Considered

1. **Display labels only** — keep raw names internal, add a label registry consumed only by the visualizer. Rejected: leaves console output and parsheet refs ambiguous, two names per metric to remember.
2. **Engine renames + display labels** — only the engine auto-emits get renamed. Rejected: cross-game synonyms (`hits` vs `winning-spins`) would persist in dashboards.
3. **Full canonical standardization** (chosen) — pick one name per concept across both games + the engine, update parsheets and tests, and pair it with a visualizer rewrite that renders modern animated charts for every metric kind.

## Decision

### Canonical metric vocabulary (concept → name → kind)

| Concept | Name | Kind |
| --- | --- | --- |
| Round count | `rounds` | count |
| Per-round RTP contribution | `round-rtp` | rtp (root) |
| Round win value aggregate | `round-win-amount` | value (root) |
| Spin results per round | `spins-per-round` | value (root) |
| Round win multiplier histogram | `round-win-multiplier` | distribution (root) |
| Spins with `win > 0` | `hits` | count |
| Free spins played | `spins-played` | count |
| Free spins granted at trigger | `spins-awarded` | value |
| Per-spin win amount | `spin-win` | payout |
| Trigger events | `triggers` | count |
| Retrigger events | `retriggers` | count |
| Total free spins per trigger session | `total-spins-per-trigger` | value |
| Base RTP contribution | `win` | rtp (in `base-game`) |
| Base scatter RTP | `scatter-win` | rtp (in `base-game`) |
| Free-spin RTP contribution | `feature-rtp` | rtp |
| Free-spin scatter RTP | `scatter-rtp` | rtp |
| Per-trigger session total win | `session-win` | payout |
| Triggered-round total win | `triggered-round-win` | payout |
| Scatter count per spin | `scatter-count` | distribution |

Renames applied this change:

- Engine: `round-payout` → `round-rtp`; `round-win` → `round-win-amount`; `result-count` → `spins-per-round`.
- Ancient Dragon: `awarded-spins` → `spins-awarded`; `spins` → `spins-played`; `feature-win` → `session-win`; `round-win` → `triggered-round-win`.
- Woodland Whisper: `winning-spins` → `hits`; `feature-win` → `session-win`; `round-win` → `triggered-round-win`.

Parsheet JSONs were updated to point at the canonical names; comparison wire format is otherwise unchanged.

### Visualizer rewrite

Replaced `packages/slots-simulation-engine/src/visualizer/index.ts` (single 334-line file) with a composed module:

```
visualizer/
├── index.ts           orchestration entrypoint
├── template.ts        page skeleton
├── styles.ts          modern dark theme + light toggle CSS (string)
├── client.ts          client-side JS string: count-up, theme toggle, ApexCharts init
├── assets.ts          reads node_modules/apexcharts UMD at render time
├── labels.ts          MetricDisplay registry (label / description / format / chart)
├── format.ts          shared HTML / number formatters
└── sections/
    ├── header.ts      hero + theme toggle
    ├── kpis.ts        animated KPI cards with sparkline backdrops
    ├── rtp-donut.ts   RTP composition donut (sums to summary.rtp)
    ├── comparisons.ts grouped tolerance-band cards
    ├── distribution.ts round-win histogram + spin-type donut
    ├── scopes.ts      collapsible scope tree with per-metric chart per kind
    └── toc.ts         sticky scroll-spy nav
```

Charts use **ApexCharts** as a regular dependency (`apexcharts ^3.54.0`); the UMD bundle is read from `node_modules` at HTML render time and embedded inline so the report opens fully offline without any network access. KPI cards count up from 0; bar fills, comparison band markers, and ApexCharts series animate via `IntersectionObserver`-driven `.in-view` reveals. Theme toggle uses `data-theme` on `<html>`, persisted in `localStorage`, and dispatches a `themechange` event so charts re-skin live.

`ComparisonTarget` gained optional `category` (`rtp` / `cycle` / `average` / `distribution` / `count`) and `description` fields, used by the visualizer to group comparison cards and render tooltips. Category is auto-inferred from the comparison id / format when not supplied.

## Consequences

- Dashboards across games speak the same vocabulary; reading one report transfers to the other.
- The engine's auto-emitted `round-rtp` is unambiguous and surfaces at the top of the scope tree as the canonical wager-normalized total.
- Parsheets keep working without wire-format changes (only metric names updated where they referenced renamed metrics).
- The visualizer is a single self-contained HTML file (~610KB) that opens offline, animates, and groups information by intent. No CDN access required at render or view time.
- Adding a new game means picking from the canonical vocabulary first and only inventing a new name when no concept fits — the registry in `labels.ts` is the place to add a display label/description for any new canonical metric.

## Coding rule

> Use the canonical metric vocabulary in [[coding_rules]]. New metrics must either reuse a canonical name or be added to [[coding_rules]] + the `METRIC_LABELS` registry in `packages/slots-simulation-engine/src/visualizer/labels.ts`. Engine auto-emits at root (`rounds`, `round-rtp`, `round-win-amount`, `spins-per-round`, `round-win-multiplier`) are reserved.
