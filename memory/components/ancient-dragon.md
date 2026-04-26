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

Slot game implementation: 5×3 grid, 100 paylines, 88.05% RTP target. Features free spins triggered by scatter symbol. Built on `@tgslots/slots-core` and wired into the unified simulation runner.

## Game Spec

| Property   | Value                                                       |
| ---------- | ----------------------------------------------------------- |
| Grid       | 5 reels × 3 rows                                            |
| Paylines   | 100                                                         |
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
  get state(): AncientDragonState
}

interface AncientDragonState { freeSpinsLeft: number; lastWager: Wager | null }
interface AncientDragonResult extends SpinResult { sc: number }
```

### Logic (internal)

```typescript
function ANCIENT_DRAGON_SAMPLER(wager: Wager): Sampler<{ win: number; sc: number }>
```

## Dependencies

- `[[math]]` (Rng, Sampler, Array1, SamplingPlan)
- `[[slots-core]]` (engine via `buildEngineFromArrays`, payline evaluation, `PrecomputedScatterEngine`, betting)
- `[[slots-simulation-engine]]` (StateMachine and SpinResult types)

## Files

- `constants.ts` — symbol enum, paytable array, 5 reel strip arrays, 100 payline definitions
- `engine.ts` — builds `SlotWithPaylinesEngine` via `buildEngineFromArrays`
- `logic.ts` — mystery-symbol resolution, positional sampling, wager-aware evaluation, `ANCIENT_DRAGON_SAMPLER`
- `game-state-machine.ts` — base/free-spin transitions and wager retention between rounds
- `index.ts` — exports `AncientDragonStateMachine`, `BET_CONFIG`, and `SIM_CONFIG`
