# Component: Woodland Whisper

## Package

`@tgslots/woodland-whisper` — `packages/games/woodland-whisper/`

## Responsibility

Slot game implementation: 5×3 grid, 30 paylines, 88.04% RTP target. Features pick bonus (find matching pair) that awards free spins, with 2x win multiplier during free spins. Config-driven via `config/config.json`.

## Game Spec

| Property             | Value                                                                    |
| -------------------- | ------------------------------------------------------------------------ |
| Grid                 | 5 reels × 3 rows                                                         |
| Paylines             | 30                                                                       |
| RTP Target           | 88.04%                                                                   |
| Wild                 | WOMAN (id=0)                                                             |
| Scatter              | COIN (≥2 pays separately; ≥3 → trigger pick bonus)                       |
| Mystery              | REPLACEMENT symbol → weighted random replacement                         |
| Feature              | Pick Bonus: choose cards to find matching pair → awards free spins count |
| Free Spin Multiplier | 2x on all wins                                                           |

## Public API

### Exports (index.ts)

```typescript
export { WoodlandWhisperStateMachine } from './game-state-machine'
export type { WoodlandWhisperState, WoodlandWhisperResult } from './game-state-machine'
export { BET } from './constants'
export { SPIN_WITH_SCATTER } from './logic'
```

### State Machine

```typescript
class WoodlandWhisperStateMachine implements StateMachine<WoodlandWhisperResult, WoodlandWhisperState> {
  spin(rng: Rng): WoodlandWhisperResult
  next(rng: Rng): WoodlandWhisperResult | null
  get state(): WoodlandWhisperState
}

interface WoodlandWhisperResult extends SpinResult {
  sc: number       // scatter count this spin
  scatters: number // same value — feeds ModernDataCollector scatter distribution
}
```

### Evaluation (internal)

```typescript
// Paylines via slots-core; scatter via PrecomputedScatterEngine (O(R))
function evaluate(strips: readonly Uint8Array[], positions: readonly number[]): number
function evaluateWithScatter(
  strips: readonly Uint8Array[],
  positions: readonly number[],
): { win: number; sc: number }
```

### Logic (internal)

```typescript
// Full spin outcome — pick bonus composed in via flatMap; pickedBonus=0 if sc < 3
export const SPIN_WITH_SCATTER: Sampler<{ win: number; sc: number; pickedBonus: number }>
export const FREE_SPIN_WITH_SCATTER: Sampler<{ win: number; sc: number; pickedBonus: number }>
// pickBonusSampler is module-private; withPickBonus() composes it into both spin samplers
```

## Dependencies

- `[[math]]` (mt19937, Sampler, AliasSampler)
- `[[slots-core]]` (engine via buildEngineFromArrays, payline evaluation, PrecomputedScatterEngine)

## Config

`config/config.json` contains:

- Symbol definitions with IDs and weights
- Paytable (symbol → count → multiplier)
- Reel strip definitions (5 reels)
- Payline definitions (30 paylines)

## Files

- `config/config.json` — complete game config
- `constants.ts` — loads + validates config, exports typed constants (no BASE_STRIP_STRINGS alias)
- `evaluation.ts` — line and grid evaluation (internal)
- `logic.ts` — sampling + strip encoding; exports only SPIN_WITH_SCATTER, FREE_SPIN_WITH_SCATTER
- `game-state-machine.ts` — state machine + pick bonus simulation; sets both `sc` and `scatters`
- `index.ts` — explicit named exports only
