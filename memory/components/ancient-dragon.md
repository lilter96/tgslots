# Component: Ancient Dragon

## Package

`@tgslots/ancient-dragon` — `packages/games/ancient-dragon/`

## Responsibility

Slot game implementation: 5×5 grid, 100 paylines, 88.04% RTP target. Features free spins triggered by scatter symbol. Built on `@tgslots/slots-core`.

## Game Spec

| Property   | Value                                                       |
| ---------- | ----------------------------------------------------------- |
| Grid       | 5 reels × 5 rows                                            |
| Paylines   | 100                                                         |
| RTP Target | 88.04%                                                      |
| Wild       | GOLDDRAGON (id=0)                                           |
| Scatter    | YINYANG (separate pay; ≥3 → trigger 10 free spins)          |
| Mystery    | INNER symbol → replaced with weighted random symbol on land |
| Feature    | Free Spins: 10 spins, retriggerable                         |

## Public API

### Exports (index.ts)

```typescript
export { AncientDragonStateMachine } from './game-state-machine'
export type { AncientDragonState, AncientDragonResult } from './game-state-machine'
export { BET } from './constants'
export { SPIN_WITH_SCATTER } from './logic'
```

### State Machine

```typescript
class AncientDragonStateMachine implements StateMachine<AncientDragonResult, AncientDragonState> {
  spin(rng: Rng): AncientDragonResult
  next(rng: Rng): AncientDragonResult | null
  get state(): AncientDragonState
}

interface AncientDragonResult extends SpinResult {
  sc: number       // scatter count this spin
  scatters: number // same value — feeds ModernDataCollector scatter distribution
}
```

### Logic (internal)

```typescript
// Paylines via slots-core; scatter via PrecomputedScatterEngine (O(R))
function evaluateWithScatter(strips: readonly Uint8Array[], positions: readonly number[]): { win: number; sc: number }
function resolveStrips(stripStrings: readonly string[][], repSym: number): Uint8Array[]
```

## Dependencies

- `[[math]]` (mt19937, Sampler, AliasSampler)
- `[[slots-core]]` (engine via buildEngineFromArrays, payline evaluation, PrecomputedScatterEngine)

## Files

- `constants.ts` — symbol enum, paytable array, 5 reel strip arrays, 100 payline definitions
- `engine.ts` — 11 lines: builds SlotWithPaylinesEngine via `buildEngineFromArrays`
- `logic.ts` — evaluation + sampling (evaluateWithScatter, resolveStrips, SPIN_WITH_SCATTER, FREE_SPIN_WITH_SCATTER)
- `game-state-machine.ts` — state transitions; sets both `sc` and `scatters` on result
- `index.ts` — explicit named exports only
