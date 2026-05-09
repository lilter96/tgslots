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
current_task: "task_034_api_dispatcher_architecture"
---
# Active Context

## Recent Changes
- Implemented Type-Safe Stateless Dispatcher API (`apps/api`). Added `GameRegistry + GameServer` dispatcher, `IGameModule` interface, `InMemorySessionManager`, typed module adapters for both Woodland Whisper and Ancient Dragon, a generic `/game/:gameId/:action` route, and per-game typed route wrappers at `/woodlandwhisper` and `/ancientdragon`. Deleted the old hardcoded `sessions.ts` and `woodland-whisper.ts`. All 275 tests pass. See [[task_034_api_dispatcher_architecture]].
- Rebuilt the Woodland Whisper web client around a shared responsive Pixi layout model. Added viewport/orientation-aware scene geometry, refactored the HUD into a bottom-pinned adaptive slot footer for both info and controls, narrowed footer info cards on normal/large screens, and made the auto-spin modal, pick-bonus board, and win overlay resize cleanly across phone, tablet, and desktop screens in both portrait and landscape. Added deterministic layout tests and updated mobile viewport/canvas handling.
- Fixed Woodland Whisper web-client free-spin UX. Added a persistent HUD banner showing remaining free spins, dynamic `X FREE SPINS WON` announcements after pick-bonus trigger/retrigger, and pure helper coverage for state-delta derivation and restore behavior. Memory now includes a dedicated `[[web-client]]` component note.
- Added Buy Free Spins feature to Woodland Whisper. Config: `buy_bonus_cost_multiplier: 100` in `config.json`. Backend: `WoodlandWhisperBuyResult` type (`'BUY'` SpinType), `buyBonus(rng, wager)` method on state machine, metrics recorded under `features/buy-bonus`. Frontend: `BUY BONUS` button (gold, `100× BET` label) in HUD emits `buyBonus` event; `GameController.buyBonus()` deducts cost and runs pick bonus + free spin loop; `IDLE → FEATURE_TRANSITION` added as valid UI state transition.
- Added Cluster Pays evaluation engine (`cluster/`) and Super Cascades tumble engine (`cascade/`) to `@tgslots/slots-core`. New modules: `cluster/types.ts`, `cluster/cluster-engine.ts`, `cluster/evaluator.ts`, `cascade/types.ts`, `cascade/cascade-grid.ts`, `cascade/vanishing.ts`, `cascade/cascade-engine.ts`, `cascade/sampler.ts`, `paytable/cluster-paytable.ts`. Added `EMPTY_SYMBOL = -2` sentinel to `symbol-registry.ts`. 22 new tests (10 cluster, 14 cascade). See [[task_031_super_cascades_engine]] and [[decision_005_cluster_pays_and_super_cascades]].
- Standardized metric vocabulary across engine + both games + parsheets. Renames: engine `round-payout`→`round-rtp`, `round-win`→`round-win-amount`, `result-count`→`spins-per-round`; AD `awarded-spins`→`spins-awarded`, `spins`→`spins-played`, `feature-win`→`session-win`, `round-win`→`triggered-round-win`; WW `winning-spins`→`hits`, `feature-win`→`session-win`, `round-win`→`triggered-round-win`.
- Rebuilt `--visualize` HTML output as a modern offline-capable dashboard. ApexCharts bundled inline (~600KB single-file report). KPI count-ups with sparklines, RTP composition donut, tolerance-band comparison cards grouped by category, round-win histogram, spin-type donut, collapsible scope tree where every metric kind has a tailored visualization (count → rate gauge bar; value → min/avg/max bar; payout → bar of avg+total; rtp → radial gauge; distribution → ApexCharts horizontal bar). Sticky TOC scroll-spy, dark/light toggle, IntersectionObserver reveal animations.
- Added `category` and `description` fields to `ComparisonTarget` for grouped/tooltipped comparison cards (auto-inferred when not set).
- ADR 004 records the canonical vocabulary rule and visualizer architecture.
- Earlier: split metric kinds into `payout`/`rtp` (ADR 003); fixed Ancient Dragon 33% RTP and migrated to external config format.

## Next Steps
- Boot `apps/api` and smoke-test both games end-to-end via the web client / curl.
- Expand test coverage for core packages.
- Implement the third slot game.
