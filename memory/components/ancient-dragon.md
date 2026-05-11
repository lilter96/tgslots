---
title: "Ancient Dragon"
type: "component"
aliases: 
- "ancient-dragon"
tags: 
- "memory"
- "component"
- "ancient-dragon"
up: 
- "[[index]]"
- "[[architecture]]"
- "[[dependencies]]"
component: "ancient-dragon"
---
# Component: Ancient Dragon

## Package

`@tgslots/ancient-dragon` — `packages/games/ancient-dragon/`

## Responsibility

Slot game implementation: 5×3 grid, 25 paylines, 88.05% RTP target. Features free spins triggered by scatter symbol and a mystery INNER symbol that resolves to a random symbol per spin. Built on `@tgslots/slots-core` and wired into the unified simulation runner.

## Game Spec

| Property   | Value                                                       |
| ---------- | ----------------------------------------------------------- |
| Grid       | 5 reels × 3 rows                                            |
| Paylines   | 25                                                          |
| RTP Target | 88.05%                                                      |
| Wild       | GOLDDRAGON (id=0)                                           |
| Scatter    | YINYANG (separate pay; ≥3 → trigger 10 free spins)          |
| Mystery    | INNER symbol → replaced with weighted random symbol on land |
| Feature    | Free Spins: 10 spins, retriggerable                         |

## Public API

### Exports (`index.ts`)

```typescript
export { AncientDragonStateMachine, BET_CONFIG, SIM_CONFIG }
```

### State Machine

```typescript
class AncientDragonStateMachine implements StateMachine<AncientDragonResult, AncientDragonState> {
  spin(rng: Rng, wager: Wager): AncientDragonResult
  next(rng: Rng): AncientDragonResult | null
  baseGameSpin(rng: Rng, wager: Wager): AncientDragonResult
  freeGameSpin(rng: Rng): AncientDragonResult
  recordResultMetrics(collector: DataCollector, result: AncientDragonResult, ...): void
  recordRoundMetrics(collector: DataCollector, round: RoundMetricsSnapshot, ...): void
  get state(): AncientDragonState
}

interface FreeSpinState { triggeringWager: Wager; totalWin: number; spinsRemaining: number }
interface AncientDragonState { freeSpins: FreeSpinState | null }
interface AncientDragonResult extends SpinResult { sc: number; triggeredFreeSpins: boolean; retriggeredFreeSpins?: boolean; grid: number[][]; hits: PaylineHit[] }
```

### Logic (internal)

```typescript
function ANCIENT_DRAGON_SAMPLER(wager: Wager): Sampler<{ win: number; sc: number }>
```

## Dependencies

- `[[math]]` (Rng, Sampler, Array1, SamplingPlan)
- `[[slots-core]]` (engine via `buildEngineFromArrays`, payline evaluation, `PrecomputedScatterEngine`, betting)
- `[[slots-simulation-engine]]` (StateMachine and SpinResult types)

## Recorded metrics (canonical names)

| Scope | Metric | Kind | Description |
| --- | --- | --- | --- |
| `base-game` | `scatter-count` | distribution | Scatters per base spin. |
| `base-game` | `spin-win` | payout | Per-base-spin win aggregate. |
| `base-game` | `hits` | count | Base spins with `win > 0`. |
| `base-game` | `win` | rtp | Base game RTP contribution. |
| `features/free-spins` | `triggers` | count | Base spins that triggered the feature. |
| `features/free-spins` | `spins-awarded` | value | Free spins granted on trigger / retrigger (always 10). |
| `features/free-spins` | `spins-played` | count | Free spins played. |
| `features/free-spins` | `spin-win` | payout | Per-free-spin win aggregate. |
| `features/free-spins` | `scatter-count` | distribution | Scatters per free spin. |
| `features/free-spins` | `hits` | count | Free spins with `win > 0`. |
| `features/free-spins` | `retriggers` | count | Free spins that retriggered. |
| `features/free-spins` | `feature-rtp` | rtp | Free-spin wager-normalized RTP contribution. |
| `features/free-spins` | `session-win` | payout | Per-trigger session total win. |
| `features/free-spins` | `triggered-round-win` | payout | Round total win on triggered rounds. |
| `features/free-spins` | `total-spins-per-trigger` | value | Total free spins per trigger session, including retriggers. |

## Files

- `config/config.json` — game mechanics: metadata (25 lines), symbols, paytable, scatter paytable, reel strips, inner reel strip, feature config
- `config/parsheet.json` — simulation verification targets (RTP, cycles, feature metrics) consumed by SIM_CONFIG
- `constants.ts` — loads all constants from config.json; exports BET_CONFIG, SYM_NAMES, Symbols, PAY_TABLE, SCATTER_PAY, PAYLINE_DATA, STRIP_STRINGS, INNER_WEIGHTS
- `engine.ts` — builds `SlotWithPaylinesEngine` via `buildEngineFromArrays`
- `logic.ts` — mystery-symbol resolution, positional sampling, wager-aware evaluation, `ANCIENT_DRAGON_SAMPLER`
- `game-state-machine.ts` — base/free-spin transitions and wager retention between rounds
- `index.ts` — exports `AncientDragonStateMachine`, `BET_CONFIG`, and `SIM_CONFIG` with normalized comparison targets
