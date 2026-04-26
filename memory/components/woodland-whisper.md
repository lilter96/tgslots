---
title: "Woodland Whisper"
type: "component"
aliases: 
- "woodland-whisper"
tags: 
- "memory"
- "component"
- "woodland-whisper"
up: 
- "[[index]]"
- "[[architecture]]"
- "[[dependencies]]"
component: "woodland-whisper"
---
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
export { WoodlandWhisperStateMachine, WOODLAND_WHISPER_SAMPLER, BET_CONFIG, SIM_CONFIG }
```

### State Machine

```typescript
class WoodlandWhisperStateMachine implements StateMachine<
  WoodlandWhisperResult,
  WoodlandWhisperState
> {
  spin(rng: Rng, wager: Wager): WoodlandWhisperResult
  next(rng: Rng): WoodlandWhisperResult | null
  get state(): WoodlandWhisperState
}

interface WoodlandWhisperState { freeSpinsLeft: number; lastWager: Wager | null }
interface WoodlandWhisperResult extends SpinResult { sc: number }
```

### Logic (internal)

```typescript
function WOODLAND_WHISPER_SAMPLER(
  wager: Wager,
  isFreeSpin?: boolean,
): Sampler<{ win: number; sc: number; pickedBonus: number }>
```

## Dependencies

- `[[math]]` (Rng, Sampler, Array1, SamplingPlan)
- `[[slots-core]]` (engine via `buildEngineFromArrays`, payline evaluation, `PrecomputedScatterEngine`, betting)
- `[[slots-simulation-engine]]` (StateMachine and SpinResult types)

## Config

`config/config.json` contains:

- Symbol definitions with IDs and weights
- Paytable (symbol → count → multiplier)
- Reel strip definitions (5 reels)
- Payline definitions (30 paylines)

## Files

- `config/config.json` — complete game config
- `constants.ts` — loads + validates config, exports typed constants (no BASE_STRIP_STRINGS alias)
- `logic.ts` — strip encoding, pick-bonus sampling, free-spin evaluation, `WOODLAND_WHISPER_SAMPLER`
- `game-state-machine.ts` — pick-bonus and free-spin transitions with retained wager
- `index.ts` — exports `WoodlandWhisperStateMachine`, sampler, `BET_CONFIG`, and `SIM_CONFIG`
