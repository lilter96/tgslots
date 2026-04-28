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
current_task: "task_031_super_cascades_engine"
---
# Active Context

## Recent Changes
- Added Cluster Pays evaluation engine (`cluster/`) and Super Cascades tumble engine (`cascade/`) to `@tgslots/slots-core`. New modules: `cluster/types.ts`, `cluster/cluster-engine.ts`, `cluster/evaluator.ts`, `cascade/types.ts`, `cascade/cascade-grid.ts`, `cascade/vanishing.ts`, `cascade/cascade-engine.ts`, `cascade/sampler.ts`, `paytable/cluster-paytable.ts`. Added `EMPTY_SYMBOL = -2` sentinel to `symbol-registry.ts`. 22 new tests (10 cluster, 14 cascade). See [[task_031_super_cascades_engine]] and [[decision_005_cluster_pays_and_super_cascades]].
- Standardized metric vocabulary across engine + both games + parsheets. Renames: engine `round-payout`→`round-rtp`, `round-win`→`round-win-amount`, `result-count`→`spins-per-round`; AD `awarded-spins`→`spins-awarded`, `spins`→`spins-played`, `feature-win`→`session-win`, `round-win`→`triggered-round-win`; WW `winning-spins`→`hits`, `feature-win`→`session-win`, `round-win`→`triggered-round-win`.
- Rebuilt `--visualize` HTML output as a modern offline-capable dashboard. ApexCharts bundled inline (~600KB single-file report). KPI count-ups with sparklines, RTP composition donut, tolerance-band comparison cards grouped by category, round-win histogram, spin-type donut, collapsible scope tree where every metric kind has a tailored visualization (count → rate gauge bar; value → min/avg/max bar; payout → bar of avg+total; rtp → radial gauge; distribution → ApexCharts horizontal bar). Sticky TOC scroll-spy, dark/light toggle, IntersectionObserver reveal animations.
- Added `category` and `description` fields to `ComparisonTarget` for grouped/tooltipped comparison cards (auto-inferred when not set).
- ADR 004 records the canonical vocabulary rule and visualizer architecture.
- Earlier: split metric kinds into `payout`/`rtp` (ADR 003); fixed Ancient Dragon 33% RTP and migrated to external config format.

## Next Steps
- Expand test coverage for core packages.
- Implement the third slot game.
