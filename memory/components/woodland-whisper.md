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

`WoodlandWhisperStateMachine` implements `StateMachine<WoodlandWhisperResult, WoodlandWhisperState>`.

#### Granular Methods

- `baseGameSpin(rng, wager)`: Executes the base game spin.
- `freeGameSpin(rng)`: Executes a single free spin.
- `pickBall(rng)`: Executes a single pick in the pick bonus.

#### State Structure

```typescript
interface FreeSpinState {
  triggeringWager: Wager
  totalWin: number
  spinsRemaining: number
}

interface PickBonusState {
  board: number[]           // 20-item board (10 pairs)
  pickSequence: number[]    // Predefined sequence of pick indices
  currentIndex: number      // Current step in the sequence
  winValue: number          // Final free spins awarded
}

interface WoodlandWhisperState {
  lastGrid: number[][] | null
  freeSpins: FreeSpinState | null
  pickBonus: PickBonusState | null
}
```

#### Result Type

```typescript
interface WoodlandWhisperResult extends SpinResult {
  type: 'BASE' | 'FREE' | 'PICK'
  sc?: number
  grid?: number[][]
  pickedBonus?: number
  triggeredPickBonus?: boolean
  retriggeredPickBonus?: boolean
  pick?: {
    index: number
    value: number
    isMatch: boolean
    board: number[]
    picks: number[]
  }
  state: {
    freeSpinsLeft: number
    totalFreeSpinWin: number
  }
}
```

## Logic (internal)

- `WOODLAND_WHISPER_SAMPLER`: Returns evaluation results including the 5x3 grid.
- `generatePickBonus(winValue, rng)`: Generates a shuffled 20-item board and a valid pick sequence resulting in `winValue`.

## Dependencies

- `[[math]]` (Rng, Sampler, Array1, SamplingPlan)
- `[[slots-core]]` (engine, payline evaluation, `PrecomputedScatterEngine`, betting)
- `[[slots-simulation-engine]]` (StateMachine and SpinResult types, introduced `'PICK'` spin type)

## Recorded metrics (canonical names)

| Scope | Metric | Kind | Description |
| --- | --- | --- | --- |
| `base-game` | `scatter-count` | distribution | Scatters per base spin. |
| `base-game` | `hits` | count | Base spins with `win > 0`. |
| `base-game` | `win` | rtp | Base game RTP contribution. |
| `base-game` | `scatter-win` | rtp | Base game scatter-pay RTP contribution. |
| `features/free-spins` | `triggers` | count | Pick-bonus triggers. |
| `features/free-spins` | `spins-awarded` | value | Free spins granted on trigger / retrigger. |
| `features/free-spins` | `spins-played` | count | Free spins played. |
| `features/free-spins` | `spin-win` | payout | Per-free-spin win aggregate. |
| `features/free-spins` | `scatter-count` | distribution | Scatters per free spin. |
| `features/free-spins` | `scatter-win` | payout | Per-free-spin scatter-pay aggregate. |
| `features/free-spins` | `hits` | count | Free spins with `win > 0`. |
| `features/free-spins` | `retriggers` | count | Free spins that retriggered. |
| `features/free-spins` | `feature-rtp` | rtp | Free-spin RTP contribution. |
| `features/free-spins` | `scatter-rtp` | rtp | Free-spin scatter-pay RTP contribution. |
| `features/free-spins` | `session-win` | payout | Per-trigger session total win. |
| `features/free-spins` | `triggered-round-win` | payout | Round total win on triggered rounds. |
| `features/free-spins` | `total-spins-per-trigger` | value | Total free spins per trigger session. |
| `features/pick-bonus-base-game` | `triggers`, `spins-awarded` | count, value | Per-base-spin trigger telemetry. |
| `features/pick-bonus-free-game` | `retriggers`, `spins-awarded` | count, value | Per-free-spin retrigger telemetry. |

## Files

- `config/config.json` — complete game config
- `constants.ts` — loads + validates config, exports typed constants
- `logic.ts` — strip encoding, pick-bonus generation, `WOODLAND_WHISPER_SAMPLER`
- `game-state-machine.ts` — granular phase methods and structured recovery state
- `index.ts` — public exports
