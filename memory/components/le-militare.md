---
title: "Le Militare"
type: "component"
aliases:
- "le-militare"
- "Le Militare GDD"
tags:
- "memory"
- "component"
- "le-militare"
- "gdd"
up:
- "[[index]]"
- "[[architecture]]"
- "[[dependencies]]"
component: "le-militare"
---
# Game Design Document: Le Militare

## Theme & Pitch

Le Militare is a military-themed 6×5 cluster-pays slot with cascade tumble and the headline Combat Operation feature. S300 surface-to-air missile launchers appear on alternating "launcher reels" (1/3/5, 0-indexed 0/2/4). When an S300 lands and arms its reel, the launcher paints that entire column WILD and locks it permanently for the rest of the free-spin session. Simultaneously, PLANE symbols on the opposing "target reels" (2/4/6, 0-indexed 1/3/5) are shot down: each plane is replaced by a sticky multiplier WILD whose value is drawn from a weighted pool (2×–500×). Multipliers accumulate into a session-wide running sum that is applied to **every** cluster win on every spin within the free-spin session. The game targets a high-volatility audience with a 96.2% RTP, a persistent-multiplier free-spin round, and a 100× Buy Bonus.

---

## Game Spec

| Property                  | Value                                                              |
| ------------------------- | ------------------------------------------------------------------ |
| Grid                      | 6 reels × 5 rows (30 cells total)                                  |
| Pay model                 | Cluster pays — orthogonal adjacency (4-connectivity)               |
| Minimum cluster size      | 5 symbols                                                          |
| Maximum cluster size      | 30 symbols (full grid)                                             |
| Cascade / tumble          | Yes — cascade loop, cap 100 steps                                  |
| Wild                      | WILD (id 0) — substitutes any paying symbol                        |
| Mixed-wild clusters       | **Disallowed** — clusters of pure WILDs do not pay                 |
| Scatter                   | SCATTER (id 11) — ≥ 4 anywhere → free spins; no direct cash payout |
| Base bet unit             | 1 (denomination scaling via wager multiplier)                      |
| RTP target                | **96.2%** (62.97% base + 33.23% feature — tolerance ±5% absolute)  |
| Base game hit cycle       | 1-in-3.5 spins (tolerance ±10% relative)                          |
| Free-spin trigger cycle   | 1-in-120 base spins (tolerance ±15% relative)                      |
| Buy Bonus cost            | 100× base bet                                                      |
| Max cascade steps         | 100 (runtime safety cap; probabilistic bound is far below this)    |
| PRNG                      | MT19937 (`mt19937`), seeded externally by simulation engine        |

*Source: `packages/games/le-militare/config/config.json`, `config/parsheet.json`, `src/constants.ts`.*

---

## Symbol Set

| ID | Name     | Category               | Cluster pays | Role                                                        |
| -- | -------- | ---------------------- | ------------ | ----------------------------------------------------------- |
| 0  | WILD     | Wild                   | No           | Substitutes any paying symbol; cannot form standalone clusters |
| 1  | BULLET   | Low pay                | Yes          | Lowest payout tier                                          |
| 2  | GRENADE  | Low-mid pay            | Yes          | —                                                           |
| 3  | HELMET   | Low-mid pay            | Yes          | —                                                           |
| 4  | MEDAL    | Mid pay                | Yes          | —                                                           |
| 5  | RIFLE    | Mid-high pay           | Yes          | —                                                           |
| 6  | TANK     | Mid-high pay           | Yes          | —                                                           |
| 7  | SOLDIER  | High pay               | Yes          | —                                                           |
| 8  | GENERAL  | Highest pay            | Yes          | Top-tier payout; 30-cluster pays 64,540×                    |
| 9  | PLANE    | Paying + feature target | Yes         | Appears only on target reels (1/3/5); has cluster payouts; when any armed S300 reel is active, each PLANE is shot down → replaced by sticky multiplier WILD before cluster evaluation |
| 10 | S300     | Feature trigger        | No           | Appears only on launcher reels (0/2/4); arms its entire reel column → WILD; no cluster payout |
| 11 | SCATTER  | Scatter                | No           | ≥ 4 anywhere on grid → triggers free spins; no direct cash payout |

**Symbol ID assignment** (from `src/constants.ts`):
- ID 0: WILD (always first in registry)
- IDs 1–9: paying symbols in `Object.keys(paytable)` order from `config.json` (BULLET→GENERAL→PLANE)
- ID 10: S300 (first special, hardcoded)
- ID 11: SCATTER (second special, hardcoded)

---

## Full Paytable

Payouts are expressed as **multiples of the base bet** (`cost_to_play = 1`). Final win = `baseClusterWin × max(1, multiplierSum) × wager.multiplier`.

| Cluster | BULLET | GRENADE | HELMET | MEDAL | RIFLE | TANK   | SOLDIER | GENERAL | PLANE |
| ------- | ------ | ------- | ------ | ----- | ----- | ------ | ------- | ------- | ----- |
| 5       | 2      | 3       | 5      | 8     | 15    | 30     | 60      | 120     | 8     |
| 6       | 4      | 6       | 9      | 15    | 30    | 60     | 120     | 240     | 16    |
| 7       | 6      | 10      | 15     | 25    | 52    | 105    | 210     | 420     | 27    |
| 8       | 9      | 15      | 23     | 39    | 82    | 165    | 330     | 660     | 43    |
| 9       | 13     | 22      | 34     | 57    | 122   | 245    | 490     | 980     | 63    |
| 10      | 18     | 30      | 47     | 80    | 175   | 350    | 700     | 1,400   | 90    |
| 11      | 23     | 40      | 63     | 108   | 240   | 480    | 960     | 1,920   | 122   |
| 12      | 30     | 52      | 82     | 141   | 318   | 635    | 1,270   | 2,540   | 161   |
| 13      | 37     | 66      | 105    | 180   | 410   | 820    | 1,640   | 3,280   | 207   |
| 14      | 46     | 82      | 131    | 226   | 520   | 1,040  | 2,080   | 4,160   | 261   |
| 15      | 56     | 101     | 161    | 280   | 649   | 1,297  | 2,595   | 5,190   | 324   |
| 16      | 68     | 123     | 196    | 342   | 800   | 1,598  | 3,195   | 6,390   | 398   |
| 17      | 81     | 147     | 236    | 414   | 977   | 1,953  | 3,905   | 7,810   | 484   |
| 18      | 96     | 175     | 281    | 497   | 1,183 | 2,365  | 4,729   | 9,459   | 583   |
| 19      | 113    | 207     | 333    | 594   | 1,422 | 2,843  | 5,685   | 11,370  | 698   |
| 20      | 132    | 243     | 392    | 706   | 1,698 | 3,395  | 6,790   | 13,580  | 830   |
| 21      | 154    | 284     | 460    | 836   | 2,017 | 4,034  | 8,067   | 16,134  | 983   |
| 22      | 178    | 330     | 537    | 987   | 2,384 | 4,768  | 9,535   | 19,070  | 1,159 |
| 23      | 205    | 383     | 625    | 1,164 | 2,806 | 5,611  | 11,221  | 22,443  | 1,360 |
| 24      | 236    | 443     | 725    | 1,371 | 3,291 | 6,583  | 13,165  | 26,330  | 1,589 |
| 25      | 271    | 511     | 840    | 1,614 | 3,848 | 7,695  | 15,390  | 30,780  | 1,848 |
| 26      | 310    | 589     | 972    | 1,899 | 4,484 | 8,967  | 17,933  | 35,866  | 2,141 |
| 27      | 355    | 678     | 1,124  | 2,234 | 5,210 | 10,420 | 20,839  | 41,679  | 2,472 |
| 28      | 407    | 781     | 1,298  | 2,628 | 6,038 | 12,075 | 24,150  | 48,300  | 2,845 |
| 29      | 466    | 898     | 1,498  | 3,092 | 6,984 | 13,967 | 27,934  | 55,868  | 3,265 |
| 30      | 533    | 1,033   | 1,729  | 3,638 | 8,068 | 16,135 | 32,270  | 64,540  | 3,740 |

*Source: `config/config.json` `paytable` — verbatim, no interpolation.*

**Key observations for math model:**
- GENERAL 30-cluster = 64,540× base bet (theoretical maximum cluster win before multiplier).
- BULLET/GRENADE/HELMET share the low-to-mid pay tier.
- MEDAL/RIFLE/TANK share the mid-to-high tier.
- PLANE's payout curve sits between MEDAL and RIFLE; it has cluster pay only when not shot down (no armed reels in that step).
- The multiplier is applied on top of the total cluster win sum across all cascade steps.

---

## Reel Strips & Placement Invariants

### Strip Architecture

Each reel has one contiguous strip defined in `config/config.json`:
- `reel_strips_base` — used during base game spins and buy-bonus trigger spins.
- `reel_strips_free` — used during free-spin spins.

Strips are stored as ordered name arrays. At runtime, `constants.ts` `encodeStrip()` converts each to a `Uint8Array` of length `n + 2`, duplicating the first two entries at the end to support contiguous-wrap sampling without modulo per-element.

### Placement Invariants (hard constraints)

These invariants are **enforced by strip composition**, not by runtime code. They must be preserved by the mathematician when retuning strips:

| Symbol  | Allowed reel indices (0-indexed) | Forbidden reel indices |
| ------- | -------------------------------- | ---------------------- |
| S300    | 0, 2, 4 (reels 1, 3, 5)         | 1, 3, 5                |
| PLANE   | 1, 3, 5 (reels 2, 4, 6)         | 0, 2, 4                |

Rationale: S300 arms launcher reels; PLANE appears on the alternating target reels. Violating these invariants would allow S300 to arm a reel that itself contains PLANEs (launcher→launcher conflict) or place PLANEs on reels that can be armed directly (destroying the mechanical tension of the feature).

Test: `src/__tests__/contiguous-strip.test.ts` verifies that contiguous-chunk sampling preserves these invariants across a large sample.

### Sampling Mechanism

Sampling is **not** independent per cell. Each reel fill draws a single contiguous chunk of length `n` (= `ROW_COUNT = 5` for initial grid, or `emptiesPerReel[reel]` for cascade refill) from a uniform start position with modulo wrap-around (`makeStripChunkSampler` in `src/logic.ts`):

```
start ~ Uniform(0, stripLen - 1)
chunk = strip[start % n], strip[(start+1) % n], ..., strip[(start+len-1) % n]
```

**Implication for mathematical modeling:** Adjacent symbols within the same chunk are positionally correlated — their co-occurrence frequency on the 5-row window reflects the local composition of the strip. This must be accounted for in any exact probability calculations; cell-independence assumptions will produce incorrect cluster-frequency estimates.

### Reel Strip Contents (full — see Appendix A)

Appendix A contains the verbatim strip arrays for all 12 reel strips (base reel1–reel6, free reel1–reel6). These are the tuning baseline for the mathematician.

---

## Bet Structure & Win Formula

- **Base bet unit**: `cost_to_play = 1` (as configured; denomination scaling is the host platform's responsibility).
- **Wager multiplier**: operator-supplied integer; scales the entire round win linearly.
- **Buy Bonus cost**: 100× base bet (`buy_bonus_cost_multiplier = 100`).
- **Final win formula**:

```
finalWin = baseClusterWin × max(1, finalMultSum) × wager.multiplier
```

where:
- `baseClusterWin` = sum of all `stepWin` values across all cascade steps in the spin.
- `finalMultSum` = `carryMultiplierSum` (from prior free-spin steps in the session) + sum of all multiplier values drawn from the pool this spin.
- `max(1, finalMultSum)` ensures a no-feature spin (no shootdowns, no carry) still pays its cluster win at 1× rather than 0×.

The **carry multiplier accumulates across the entire free-spin session**. A free spin that itself contributes no new multiplier still benefits from multipliers banked in earlier spins of the same session.

---

## Base Game Flow

1. Draw initial 6×5 grid: per-reel contiguous strip chunks of length 5 from `reel_strips_base`.
2. Count initial SCATTERs on the grid (before any combat alteration).
3. Enter the cascade loop with `carryArmedReels = ∅`, `carryMultiplierSum = 0`, `accScatterCount = initialScatterCount`, `remaining = 100`.
4. Cascade loop (see §Cascade Mechanic below).
5. On loop exit:
   - `finalWin = baseClusterWin × max(1, finalMultSum) × wager.multiplier`
   - `triggeredFreeSpins = finalScatterCount ≥ 4`
   - `freeSpinsAwarded = FREE_SPIN_AWARDS[finalScatterCount]` if triggered, else 0
   - Export `endArmedReels`, `endMultiplierSum` for state machine.

---

## Cluster Evaluation

Provided by `createClusterSlotEngine` from `@tgslots/slots-core`:

- **Connectivity**: 4-directional orthogonal adjacency (up/down/left/right). Diagonal adjacency does not contribute.
- **Wild substitution**: WILD (id 0) can substitute for any paying symbol within a cluster. A cluster may contain at most one "real" symbol type plus WILDs.
- **Mixed-wild clusters disallowed**: A cluster consisting entirely of WILD cells (with no non-WILD paying symbol) does **not** pay. (`disallowMixedWilds: true`.)
- **Minimum cluster size**: 5 cells.
- **Non-paying symbols on grid**: S300 (id 10) and SCATTER (id 11) are transparent to cluster evaluation — they do not participate in or block clusters.

---

## Cascade Mechanic

After each round of cluster evaluation within the cascade loop:

1. **Collect winning positions** (`collectVanishPositions`).
2. **Exclude sticky wilds**: positions flagged as sticky in `stickyGrid` are removed from the vanish set. Sticky wilds **survive** cluster vanishing and remain on the grid. (EC-1.3)
3. **Clear winning cells** (non-sticky) from the grid (`grid.clearAt(filteredVanished)`).
4. **Compact sticky flags**: `compactStickyGrid` mirrors gravity compaction on the `stickyGrid` matrix so sticky markers remain aligned with the surviving WILD cells' post-gravity positions. This runs after `clearAt` but before `applyGravity`.
5. **Gravity**: surviving symbols fall to the bottom of each reel column (index `ROW_COUNT - 1` = row 4 is bottom).
6. **Refill**: empty cells at the top of each reel are filled with a fresh contiguous strip chunk from the current strip set (`refillGravitySampler`). Each reel is independent; chunk length = number of empty cells in that reel.
7. **Count new scatters**: SCATTER symbols that land in newly refilled cells are added to `accScatterCount`. These refill-scatters count toward the trigger threshold and can cause retriggers mid-cascade. (EC-1.4)
8. **Repeat** from Combat Operation → cluster evaluation. Loop continues as long as any cluster hit is found. Exits also when `remaining == 0` (cascade cap).

**Last step behavior**: When a cascade step produces zero hits, the step is still recorded (with empty `hits`, `vanishedPositions`) and the loop exits. The final step always has `hits = []`.

---

## Combat Operation

The headline feature. Executes at the **start of every cascade step, before cluster evaluation**, on the post-refill grid.

### Step-by-Step

1. **Detect newly armed reels**: Scan all 6 reels. Any reel that contains at least one S300 cell and is **not** already in `armedReels` is added to `newArmedReels`.

2. **Collect PLANE positions**: Scan all 30 cells. Any cell with `PLANE_ID` is noted as a shoot target (regardless of which reel it's on).

3. **Skip-combat check**: If `newArmedReels.length == 0 AND armedReels.size == 0`, skip all combat (no launcher active). Return `activations=[], shootdowns=[], multiplierDelta=0`.

4. **Shoot down PLANEs**: For each PLANE cell:
   - Draw a multiplier from the weighted pool (`multiplierSampler`). (Independent draw per plane.)
   - Set that cell to WILD (`WILD_ID`).
   - Mark `stickyGrid[reel][row] = true` — this WILD survives cluster vanishing for the rest of the spin.
   - Accumulate into `multiplierDelta`.

5. **Emit ActivationEvents**: For each newly armed reel, push `ActivationEvent { reel, convertedCells: 5 }` and add reel to `armedReels`.

6. **Re-wild all armed reels** (FIX 1.2): For every reel in `armedReels` (both new and carry-over):
   - Set all 5 cells in that column to WILD.
   - **Clear** `stickyGrid[reel][row] = false` for all rows in that column.
   - Rationale: cascade refill in the prior step may have placed non-WILD symbols onto armed reels. Re-wilding ensures armed reels are always fully WILD. Armed-reel cells are never sticky — they are unconditionally overwritten every step.

7. **Cluster evaluation** then proceeds on the post-combat grid.

### Multiplier Pool

| Value | Weight | Probability   |
| ----- | ------ | ------------- |
| 2×    | 40     | 40.00%        |
| 3×    | 25     | 25.00%        |
| 5×    | 15     | 15.00%        |
| 10×   | 10     | 10.00%        |
| 25×   | 5      | 5.00%         |
| 50×   | 3      | 3.00%         |
| 100×  | 1.5    | 1.50%         |
| 500×  | 0.5    | 0.50%         |
| **Total** | **100** | **100.00%** |

Each PLANE is sampled independently. Expected multiplier per plane = `(2×40 + 3×25 + 5×15 + 10×10 + 25×5 + 50×3 + 100×1.5 + 500×0.5) / 100 = (80+75+75+100+125+150+150+250)/100 = 1005/100 = 10.05×`.

*Source: `config/config.json` `multiplier_pool`.*

### Key Invariants

- Armed reels are always on launcher reel indices (0/2/4); PLANE is always on target reel indices (1/3/5). An armed launcher reel can never shoot down a PLANE on itself — architectural separation by strip composition.
- A PLANE that is shot down in step N becomes a sticky WILD in step N and is NOT part of the cluster-vanish set for step N. It may survive into step N+1 if it is not itself in a winning cluster (but it cannot re-appear as PLANE; it's already been replaced).
- `multiplierDelta` from a given step is added to `multSum` immediately; this updated `multSum` is the carry into the next recursive step.

---

## Free Spins

### Trigger

Any spin (base, free, or buy) where `finalScatterCount ≥ 4`.

`finalScatterCount` = initial scatters on the drawn grid + scatters landing in cascade-refill cells across all cascade steps. (EC-1.4)

### Award Table

| Scatter count | Free spins awarded |
| ------------- | ------------------ |
| 4             | 10                 |
| 5             | 15                 |
| 6             | 20                 |
| 7             | 25                 |
| ≥ 8           | 25 (uses highest defined key ≤ count) |

*Source: `config/config.json` `scatter_definition.free_spins_awarded`.*

Scatters 8 and above are not defined in the config; `freeSpinsAwarded()` iterates downward from `finalScatterCount` until it finds a matching key, so ≥ 8 scatters award 25 spins (the maximum).

### Session State (persistent across all spins in a free-spin session)

| Field             | Type             | Description                                                   |
| ----------------- | ---------------- | ------------------------------------------------------------- |
| `triggeringWager` | Wager            | The wager object from the spin that triggered free spins. Applied to all free spins. |
| `spinsRemaining`  | number           | Decremented before each free spin; incremented on retrigger.  |
| `totalWin`        | number           | Cumulative win across all free spins in the session.          |
| `armedReels`      | Set\<number\>    | Reel indices armed during any prior free spin; carried into each subsequent spin. |
| `multiplierSum`   | number           | Running total of all multiplier values accumulated across all free spins so far. |

### Session Lifecycle

1. **Session start** (triggered by `spin()` or `buyBonus()`):
   - `armedReels = new Set()` — empty; the base-spin's armed reels are **NOT** carried into free spins.
   - `multiplierSum = 0` — starts fresh.
   - `totalWin = 0`.
   - `spinsRemaining = freeSpinsAwarded(scatterCount)`.

2. **Each free spin** (`freeGameSpin()`):
   - `spinsRemaining--` (decremented before sampling).
   - Passed to sampler: `carryArmedReels = session.armedReels`, `carryMultiplierSum = session.multiplierSum`.
   - **Initial grid**: carry-armed reels are painted fully WILD before the cascade loop begins (FIX 1.2): for each reel in `carryArmedReels`, all 5 cells are set to WILD.
   - After sampling, update session:
     - `session.armedReels |= result.endArmedReels` (union — armed reels only ever grow).
     - `session.multiplierSum = result.endMultiplierSum`.
     - `session.totalWin += result.finalWin`.

3. **Retrigger** (within `freeGameSpin()`):
   - If `result.scatterCount ≥ 4`: `spinsRemaining += freeSpinsAwarded(result.scatterCount)`.
   - Uses the same award table. No retrigger cap in the math layer (tests use `FREE_SPIN_CAP = 50` to bound simulation; runtime has no cap).

4. **Session end**: `spinsRemaining` reaches 0 and `next()` returns `null`.

### Strip Set

Free spins use `reel_strips_free` (distinct strip set from base game). S300 and PLANE densities on the free strips are tuned independently of the base strips.

---

## Buy Bonus

- **Cost**: 100× base bet (`buy_bonus_cost_multiplier = 100`).
- **Mechanism**: Rejection-resample base spins (using `reel_strips_base`, no carry armed reels, no carry multiplier) until `scatterCount ≥ 4`. The first qualifying spin is used as the trigger; a free-spin session starts normally from its `freeSpinsAwarded`.
- **Session initialization**: identical to a natural trigger — `armedReels = ∅`, `multiplierSum = 0`.

**Mathematical implication**: The buy-bonus trigger spin is drawn from a conditional distribution `P(grid | scatterCount ≥ 4)`. The expected number of scatters given this condition differs from an unconditional draw. Specifically, the probability of getting exactly 4 scatters is proportionally under-represented relative to getting 5, 6, or 7 scatters, because rejection sampling weights outcomes by their unconditional probabilities. The mathematician should account for this when calculating the expected free-spins-awarded from a buy-bonus purchase.

---

## State Machine

### States

- **IDLE**: no free spins in progress. Accepts `spin` and `buyBonus`.
- **FREE_SPIN**: `freeSpins != null && freeSpins.spinsRemaining > 0`. Accepts `freeGameSpin` (via `next()`).

### State Shape

```typescript
interface LeMilitareState {
  lastGrid: number[][] | null       // grid[row][reel] — most recent initial grid snapshot
  freeSpins: LeMilitareFreeSpinsState | null
  lastSpinResult: LeMilitareSpinResult | null
}

interface LeMilitareFreeSpinsState {
  triggeringWager: Wager
  spinsRemaining: number
  totalWin: number
  armedReels: Set<number>
  multiplierSum: number
}
```

### Actions & Transitions

| Action          | Precondition                | Returns               | Transition                                         |
| --------------- | --------------------------- | --------------------- | -------------------------------------------------- |
| `spin(wager)`   | Any state                   | `LeMilitareBaseResult`| Resets `freeSpins = null`. If triggered: sets `freeSpins` with `armedReels = ∅`, `multiplierSum = 0`. |
| `buyBonus(wager)` | Any state                 | `LeMilitareBuyResult` | Resets `freeSpins = null`. Always sets `freeSpins` (guaranteed trigger). |
| `freeGameSpin()` | `spinsRemaining > 0`       | `LeMilitareFreeResult`| Decrements `spinsRemaining`; updates `armedReels`, `multiplierSum`, `totalWin`; increments `spinsRemaining` on retrigger. |
| `next()`        | Any                         | `LeMilitareResult\|null` | Calls `freeGameSpin()` if `spinsRemaining > 0`; else returns `null`. |

### Result Types

```typescript
type LeMilitareResult = LeMilitareBaseResult | LeMilitareFreeResult | LeMilitareBuyResult

// Discriminated by `type` field:
// 'BASE' | 'FREE' | 'BUY'

// Common fields on all three:
{
  type: 'BASE' | 'FREE' | 'BUY'
  win: number                        // = finalWin
  components: { total: number }      // { total: finalWin }
  scatterCount: number               // final scatter count (initial + refill)
  steps: CombatCascadeStep[]         // per-cascade-step detail
  multiplierSum: number              // this spin's added multiplier (not carry)
  finalWin: number                   // same as win
  freeSpinsAwarded: number           // spins added (0 if none)
  state: {
    freeSpinsLeft: number            // session spinsRemaining after this spin
    totalFreeSpinWin: number         // session cumulative win after this spin
    sessionMultiplierSum: number     // session multiplierSum after this spin
  }
}

// BASE-specific:  triggeredFreeSpins: boolean
// FREE-specific:  retriggered: boolean
// BUY-specific:   triggeredFreeSpins: true (always)
```

### CombatCascadeStep Shape

```typescript
interface CombatCascadeStep {
  preCombatGrid: number[][]          // grid[row][reel] before combat this step
  postCombatGrid: number[][]         // grid[row][reel] after combat, before cluster eval
  hits: ClusterHit[]                 // cluster evaluation results
  vanishedPositions: number[]        // cell indices that were cleared (sticky-excluded)
  stickyWildPositions: number[]      // cell indices with sticky WILD at end of step
  stepWin: number                    // cluster win sum for this step (pre-multiplier)
  activations: ActivationEvent[]     // S300 activations this step
  shootdowns: ShootdownEvent[]       // PLANE shootdowns this step
}

interface ActivationEvent { reel: number; convertedCells: 5 }
interface ShootdownEvent  { reel: number; row: number; multiplier: number }
```

Cell index encoding: `cellIndex = reel * ROW_COUNT + row` (`ROW_COUNT = 5`).

---

## RNG & Sampling Primitives

All randomness flows through the `Sampler<T>` monad from `@tgslots/math/probability`. No ad-hoc RNG calls exist in the math layer.

| Sampler                   | Source                   | Description                                                      |
| ------------------------- | ------------------------ | ---------------------------------------------------------------- |
| `multiplierSampler`       | `logic.ts`               | `Sampler.fromWeighted(MULTIPLIER_POOL_WEIGHTS)` — draws one multiplier value per plane per step. |
| `makeStripChunkSampler`   | `logic.ts`               | Contiguous strip chunk of length `n` from uniform start.        |
| `buildGridSampler`        | `logic.ts`               | 6 independent `makeStripChunkSampler` calls (one per reel, length 5). |
| `runCombatOperationSampler` | `logic.ts`             | Per-step combat: detects S300/PLANE, draws multipliers, mutates grid in-place. |
| `refillGravitySampler`    | `logic.ts`               | Per-reel contiguous strip chunks for cascade refill.            |
| `combatCascadeLoopSampler` | `logic.ts`              | Recursive cascade loop; accumulates steps, armed reels, multiplier sum, scatter count. |
| `LE_MILITARE_SAMPLER`     | `logic.ts`               | Top-level spin sampler: wires grid → cascade loop → finalization. |
| `BUY_BONUS_SAMPLER`       | `logic.ts`               | Rejection-resamples `LE_MILITARE_SAMPLER` (base, no carry) until `scatterCount ≥ 4`. |

---

## Edge Cases & Invariants

These invariants are verified by dedicated unit tests in `src/__tests__/` (see FIX tags).

| ID    | Invariant | Source |
| ----- | --------- | ------ |
| EC-1.1 | Pre-armed reels (carry from earlier free spins) keep firing on PLANEs every cascade step, even when no new S300 lands that step. The `armedReels` set is not cleared between cascade steps within a spin. | FIX 1.1 test |
| EC-1.2 | At the start of each free spin, carry-over armed reels are painted fully WILD on the initial grid **before** the cascade loop. Every cascade step re-wilds all armed reels after shootdowns and activations. This ensures refill symbols landing on armed reels are immediately overwritten. | FIX 1.2 test |
| EC-1.3 | Sticky WILD cells (products of PLANE shootdown) are excluded from the vanish set in the same step they are created. They survive cluster clearing and persist into the next step's `preCombatGrid`. `compactStickyGrid` tracks their position through gravity. Sticky wilds can only ever reside on target reel indices (1/3/5) since PLANE only appears there. | FIX 1.3 test |
| EC-1.4 | SCATTER symbols that land in cascade-refill cells count toward the spin's total scatter count (`accScatterCount`) and can cause the free-spin trigger threshold to be crossed mid-cascade. Retriggers may fire from refill scatters, not just scatters in the initial draw. | FIX 1.4 test |
| EC-1.5 | Contiguous-chunk sampling preserves the strip's placement rules: S300 never appears on target reels, PLANE never appears on launcher reels, across all chunk start positions and all wrap-around boundaries. | FIX 1.5 test |
| EC-2 | Combat is skipped entirely if and only if both `newArmedReels.length == 0` AND `armedReels.size == 0`. A step with carry-armed reels but no new S300 still executes the re-wild pass and shoots any PLANEs present. | Logic comment |
| EC-3 | `MAX_CASCADE_STEPS = 100` is a runtime safety cap; its firing is treated as a degenerate case. The mathematical model should confirm the expected number of cascade steps is far below this bound. | `constants.ts` |
| EC-4 | `multiplierSum = 0` until the first shootdown in a spin (or the session). Final win uses `max(1, finalMultSum)`, so a zero-multiplier spin still pays the raw cluster win (at 1× effective multiplier). | Logic, `logic.ts:429` |
| EC-5 | The persistent session `multiplierSum` is applied **per spin**, not retroactively to earlier spins. Each free spin's `finalWin = baseClusterWin × max(1, endMultiplierSum for that spin) × wager.multiplier`. The cumulative session win is the sum of individual per-spin wins. | State machine |
| EC-6 | Retrigger awards are **additive** with no cap in the runtime math layer. Each retrigger adds `freeSpinsAwarded(scatterCount)` to `spinsRemaining`. The simulation test harness uses `FREE_SPIN_CAP = 50` for bounded testing; the production runtime has no cap. The mathematician should verify expected session length and tail distribution. | `game-state-machine.ts` |
| EC-7 | Mixed-wild clusters — clusters consisting entirely of WILD cells with no non-WILD paying symbol — do not pay. (`disallowMixedWilds: true`.) A full column of armed-reel WILDs adjacent to a column of PLANE WILDs constitutes a mixed-wild cluster and pays nothing. | Engine config |
| EC-8 | The base-spin's armed reels at trigger time are **not** carried into the free-spin session. Session `armedReels` always starts empty. Only armed reels accumulated within free spins persist within the session. | State machine `spin()` |
| EC-9 | Buy bonus starts a free-spin session with `armedReels = ∅` and `multiplierSum = 0`, identical to a naturally triggered session. The conditional distribution of the trigger spin (given `scatterCount ≥ 4`) affects expected initial free-spins-awarded but not session initialization. | State machine `buyBonus()` |
| EC-10 | PLANE has cluster payouts (paytable entry exists). If no armed reels are active when a PLANE lands, no shootdown occurs, and a PLANE cluster can form and pay normally per the paytable. This is a valid base-game outcome. | `config.json`, `engine.ts` |

---

## RTP Composition

| Metric              | Target  | Tolerance     | Source metric |
| ------------------- | ------- | ------------- | ------------- |
| Total RTP           | 96.2%   | ±1.5% absolute | `summary.rtp` |
| Base game RTP       | 70.0%   | ±5.0% absolute | `scope[base-game].win.ratio` |
| Feature RTP         | 26.2%   | ±5.0% absolute | `scope[features/free-spins].feature-rtp.ratio` |
| Base game hit cycle | 1-in-3.5 | ±10% relative | `scope[base-game].hits.cycle` |
| Free-spin trigger cycle | 1-in-120 | ±15% relative | `scope[features/free-spins].triggers.cycle` |

*Source: `config/parsheet.json`.*

**Volatility levers** (all tunable in `config/config.json`):
- `multiplier_pool` values and weights — primary variance driver for the free-spin feature.
- `reel_strips_free` — S300 and PLANE density controls combat frequency per free spin.
- `reel_strips_base` — S300, PLANE, SCATTER density controls trigger frequency and base-game combat frequency.
- `paytable` — cluster payout curves control base RTP contribution.
- Inherently non-tunable without code change: `min_cluster = 5`, `MIN_SCATTERS = 4`, `MAX_CASCADE_STEPS = 100`.

---

## Simulation Metrics

| Scope                      | Metric                    | Kind         | Description                                              |
| -------------------------- | ------------------------- | ------------ | -------------------------------------------------------- |
| `base-game`                | `hits`                    | count        | Base spins with `win > 0`                                |
| `base-game`                | `scatter-count`           | distribution | Scatter count per base spin                              |
| `base-game`                | `win`                     | rtp          | Base game RTP contribution                               |
| `features/free-spins`      | `triggers`                | count        | Base spins that triggered free spins                     |
| `features/free-spins`      | `spins-awarded`           | value        | Free spins granted on trigger / retrigger                |
| `features/free-spins`      | `spins-played`            | count        | Free spins played                                        |
| `features/free-spins`      | `spin-win`                | payout       | Per-free-spin win                                        |
| `features/free-spins`      | `scatter-count`           | distribution | Scatter count per free spin                              |
| `features/free-spins`      | `hits`                    | count        | Free spins with `win > 0`                                |
| `features/free-spins`      | `retriggers`              | count        | Free spins that retriggered                              |
| `features/free-spins`      | `feature-rtp`             | rtp          | Free-spin wager-normalized RTP contribution              |
| `features/free-spins`      | `session-win`             | payout       | Per-trigger session total win                            |
| `features/free-spins`      | `triggered-round-win`     | payout       | Round total win on triggered rounds                      |
| `features/free-spins`      | `total-spins-per-trigger` | value        | Total free spins per session including retriggers        |
| `features/combat-operation` | `activations`            | count        | Base spins with at least one S300 activation             |
| `features/combat-operation` | `multiplier-sum-per-spin`| distribution | Rounded multiplier sum per base spin with activations    |
| `features/combat-operation` | `free-activations`       | count        | Free spins with at least one S300 activation             |
| `features/combat-operation` | `multiplier-sum-per-free-spin` | distribution | Rounded multiplier sum per free spin with activations |
| `features/buy-bonus`       | `purchases`               | count        | Buy-bonus purchases                                      |
| `features/buy-bonus`       | `spins-awarded`           | value        | Free spins granted per buy-bonus purchase                |

---

## Configuration Knobs

All tunable values. Values marked ⚙ are in `config/config.json`; values marked 📌 are hardcoded in `src/constants.ts` and require a code change.

| Parameter                         | Current value          | Units / notes                        |
| --------------------------------- | ---------------------- | ------------------------------------ |
| ⚙ `game_metadata.grid_reels`     | 6                      | Must be 6 to maintain S300/PLANE alternation |
| ⚙ `game_metadata.grid_rows`      | 5                      | Rows per reel                        |
| ⚙ `game_metadata.min_cluster`    | 5                      | Minimum cells for a paying cluster   |
| ⚙ `game_metadata.rtp_target`     | 0.962                  | Documentation only; not enforced by code |
| ⚙ `paytable`                      | See Full Paytable §    | Multiplier per cluster size per symbol |
| ⚙ `scatter_definition.min_count` | 4                      | Must match `MIN_SCATTERS` constant   |
| ⚙ `scatter_definition.free_spins_awarded` | {4:10,5:15,6:20,7:25} | Spins per trigger scatter count |
| ⚙ `multiplier_pool.values`       | [2,3,5,10,25,50,100,500] | PLANE shootdown multiplier values  |
| ⚙ `multiplier_pool.weights`      | [40,25,15,10,5,3,1.5,0.5] | Corresponding weights (sum=100)   |
| ⚙ `disallow_mixed_wild_clusters` | true                   | Do not change; required by engine    |
| ⚙ `buy_bonus_cost_multiplier`    | 100                    | Multiplier of base bet for buy bonus |
| ⚙ `reel_strips_base`             | See Appendix A         | 6 strips for base spins              |
| ⚙ `reel_strips_free`             | See Appendix A         | 6 strips for free spins              |
| 📌 `MIN_SCATTERS`                 | 4                      | Must match `scatter_definition.min_count` |
| 📌 `MAX_CASCADE_STEPS`            | 100                    | Runtime safety cap on cascade loop   |
| 📌 `BUY_BONUS_COST_MULTIPLIER`    | 100                    | Read from config at startup          |

---

## Pseudocode

### `createSpinSampler(wager, isFreeSpin, carryArmedReels, carryMultiplierSum)`

```
strips ← isFreeSpin ? INT_STRIPS_FREE : INT_STRIPS_BASE
grid ← buildGridSampler(strips)  // 6 contiguous-chunk draws, length 5 each

// Paint carry-over armed reels WILD before counting initial scatters
for reel in carryArmedReels:
    grid[*, reel] ← WILD

initialScatterCount ← countScatters(grid)
armedReels ← Set(carryArmedReels)
stickyGrid ← 6×5 boolean grid, all false
steps ← []

loop ← combatCascadeLoopSampler(
    grid, strips, armedReels, stickyGrid,
    multSum=carryMultiplierSum,
    accScatterCount=initialScatterCount,
    accSteps=steps, remaining=100
)

baseClusterWin ← Σ step.stepWin for step in steps
multiplierSum   ← loop.finalMultSum - carryMultiplierSum    // this spin's delta only
finalWin        ← baseClusterWin × max(1, loop.finalMultSum) × wager.multiplier
triggered       ← loop.finalScatterCount ≥ MIN_SCATTERS
spinsAwarded    ← triggered ? FREE_SPIN_AWARDS[loop.finalScatterCount] : 0

return LeMilitareSpinResult {
    initialGrid, steps,
    scatterCount: loop.finalScatterCount,
    baseClusterWin, multiplierSum, finalWin,
    triggeredFreeSpins: triggered,
    freeSpinsAwarded: spinsAwarded,
    endArmedReels: loop.finalArmedReels,
    endMultiplierSum: loop.finalMultSum
}
```

### `combatCascadeLoopSampler(grid, strips, armedReels, stickyGrid, multSum, accScatterCount, accSteps, remaining)`

```
if remaining == 0:
    return { steps: accSteps, finalArmedReels: armedReels, finalMultSum: multSum, finalScatterCount: accScatterCount }

preCombatSnapshot ← snapshot(grid)

combat ← runCombatOperationSampler(grid, armedReels, stickyGrid)
// grid mutated in-place by combat

postCombatSnapshot ← snapshot(grid)
newMultSum ← multSum + combat.multiplierDelta

evaluation ← evaluateClusters(grid, engine)

if evaluation.hits.length == 0:
    accSteps.append({ preCombatSnapshot, postCombatSnapshot, hits:[], ... stepWin:0, combat.activations, combat.shootdowns })
    return { steps: accSteps, finalArmedReels: armedReels, finalMultSum: newMultSum, finalScatterCount: accScatterCount }

vanished ← collectVanishPositions(evaluation.hits)
filteredVanished ← vanished excluding positions where stickyGrid[reel][row] == true
grid.clearAt(filteredVanished)
compactStickyGrid(stickyGrid, grid)    // must run before applyGravity
emptiesPerReel ← count empty cells per reel (post-clear, pre-gravity)

accSteps.append({ preCombatSnapshot, postCombatSnapshot, hits: evaluation.hits, vanishedPositions: filteredVanished, ... stepWin: evaluation.totalWin, combat.activations, combat.shootdowns })

refillGravitySampler(grid, strips, emptiesPerReel)   // applies gravity + refill

// Count scatters in newly filled top rows (FIX 1.4)
newScatters ← Σ SCATTER cells in rows [0..emptiesPerReel[reel]-1] for each reel

return combatCascadeLoopSampler(
    grid, strips, armedReels, stickyGrid,
    newMultSum, accScatterCount + newScatters,
    accSteps, remaining - 1
)
```

### `runCombatOperationSampler(grid, armedReels, stickyGrid)`

```
newArmedReels ← reels not in armedReels that contain at least one S300
planePositions ← all (reel, row) where grid[reel][row] == PLANE

if newArmedReels.length == 0 AND armedReels.size == 0:
    return { activations:[], shootdowns:[], multiplierDelta:0 }

// Shoot down each plane: independent multiplier draw per plane
shootdowns ← []
multiplierDelta ← 0
for (reel, row) in planePositions:
    mult ← multiplierSampler.sample()
    grid[reel][row] ← WILD
    stickyGrid[reel][row] ← true
    multiplierDelta += mult
    shootdowns.append({ reel, row, multiplier: mult })

// Activate new reels
activations ← []
for reel in newArmedReels:
    armedReels.add(reel)
    activations.append({ reel, convertedCells: 5 })

// Re-wild ALL armed reels (carry + new); clear their sticky flags
for reel in armedReels:
    for row in 0..4:
        grid[reel][row] ← WILD
        stickyGrid[reel][row] ← false

return { activations, shootdowns, multiplierDelta }
```

---

## Public API

Package: `@tgslots/le-militare` (`packages/games/le-militare/`)

Simulation entrypoint: `bun --filter @tgslots/simulations run le-militare`

```typescript
// src/index.ts exports:
export { LeMilitareStateMachine, BET_CONFIG, Symbols, SIM_CONFIG }
export type {
  LeMilitareState, LeMilitareFreeSpinsState,
  LeMilitareResult, LeMilitareBaseResult, LeMilitareFreeResult, LeMilitareBuyResult,
  LeMilitareSpinResult, CombatCascadeStep, ShootdownEvent, ActivationEvent
}
```

Web-client action registry (`apps/web-client/src/games/le-militare/index.ts`):

```typescript
'le-militare': {
  state:   LeMilitareSerializedState
  result:  LeMilitareResult
  actions: {
    spin:      { multiplier: number }
    buybonus:  { multiplier: number }
    freespin:  Record<string, never>
    state:     Record<string, never>
  }
}
```

---

## Dependencies

- `[[math]]` — `Rng` type, `Sampler<T>`, `SamplingPlan`, `Array1`
- `[[slots-core]]` — `createClusterSlotEngine`, `MutableCascadeGrid`, `evaluateClusters`, `collectVanishPositions`, `EMPTY_SYMBOL`, `BetConfiguration`, `Wager`
- `[[slots-simulation-engine]]` — `StateMachine`, `SpinResult`, `DataCollector`, `RoundMetricsSnapshot` types

---

## Files

**Math / simulation package** (`packages/games/le-militare/`):

- `config/config.json` — all tunable game config: grid dims, paytable, scatter awards, multiplier pool, reel strips (base + free), wild/cluster flags, buy-bonus multiplier
- `config/parsheet.json` — RTP target, hit cycles, feature RTP split; consumed by `SIM_CONFIG`
- `src/constants.ts` — symbol IDs, grid dims, `MIN_SCATTERS`, `MAX_CASCADE_STEPS`, `BUY_BONUS_COST_MULTIPLIER`, `FREE_SPIN_AWARDS`, `MULTIPLIER_POOL_WEIGHTS`, encoded strip arrays
- `src/types.ts` — `ShootdownEvent`, `ActivationEvent`, `CombatCascadeStep`, `LeMilitareSpinResult`
- `src/engine.ts` — wires `createClusterSlotEngine` with paytable, scatter, wild settings
- `src/logic.ts` — all samplers: `multiplierSampler`, `makeStripChunkSampler`, `buildGridSampler`, `runCombatOperationSampler`, `refillGravitySampler`, `combatCascadeLoopSampler`, `LE_MILITARE_SAMPLER`, `BUY_BONUS_SAMPLER`
- `src/game-state-machine.ts` — `LeMilitareStateMachine`, state/result types, metric recording
- `src/index.ts` — public exports, `SIM_CONFIG`
- `src/__tests__/` — FIX 1.1–1.5 edge-case tests, retrigger tests, free-spin session tests

**Web client plugin** (`apps/web-client/src/games/le-militare/`):

- `runtime.ts` — `LeMilitareRuntime`: grid init, cascade step presentation, multiplier HUD, event bus wiring
- `combat/index.ts` — `CombatOperationView`: activation flashes, missile fires, wire rendering
- `combat/missile.ts` — Bézier flight, per-plane trail, explosion, badge spawn
- `combat/badge.ts` — animated ×N multiplier badge
- `mascot/index.ts` — `S300Mascot` visual orchestration
- `animation-config.ts` — timing constants (for reference; not math-relevant)
- `events.ts` — event bus type declarations

---

## Appendix A — Reel Strips (verbatim)

Reproduced exactly from `config/config.json`. These are the strips the mathematician will retune.

> **Notation**: Each strip is a JSON array in symbol order (position 0 = topmost reachable symbol at minimum start). Contiguous chunks of length 5 are drawn from a uniform start position with wrap-around.

### Base Game Strips (`reel_strips_base`)

**Reel 1 (index 0) — launcher reel (S300 only; no PLANE)**
```json
["BULLET","GRENADE","HELMET","MEDAL","RIFLE","TANK","SOLDIER","GENERAL",
 "BULLET","GRENADE","HELMET","MEDAL","RIFLE","TANK","SOLDIER","GENERAL",
 "BULLET","GRENADE","HELMET","MEDAL","RIFLE","TANK","SOLDIER","TANK",
 "BULLET","GRENADE","HELMET","MEDAL","RIFLE","TANK","BULLET","WILD",
 "BULLET","GRENADE","HELMET","MEDAL","RIFLE","BULLET","GRENADE","HELMET",
 "MEDAL","RIFLE","BULLET","GRENADE","HELMET","WILD","BULLET","GRENADE",
 "HELMET","GRENADE","BULLET","GRENADE","S300","TANK","BULLET","SOLDIER",
 "GENERAL","S300","SCATTER","HELMET"]
```

**Reel 2 (index 1) — target reel (PLANE only; no S300)**
```json
["GRENADE","HELMET","MEDAL","RIFLE","TANK","SOLDIER","GENERAL","PLANE",
 "BULLET","GRENADE","HELMET","MEDAL","RIFLE","TANK","SOLDIER","GENERAL",
 "BULLET","GRENADE","HELMET","MEDAL","RIFLE","TANK","SOLDIER","BULLET",
 "GRENADE","HELMET","MEDAL","RIFLE","WILD","GRENADE","HELMET","MEDAL",
 "RIFLE","PLANE","BULLET","GRENADE","HELMET","MEDAL","BULLET","GRENADE",
 "HELMET","BULLET","GRENADE","HELMET","BULLET","GRENADE","WILD","BULLET",
 "GRENADE","PLANE","BULLET","GENERAL","SOLDIER","TANK","BULLET","GRENADE",
 "TANK","SCATTER","PLANE","RIFLE"]
```

**Reel 3 (index 2) — launcher reel (S300 only; no PLANE)**
```json
["HELMET","MEDAL","RIFLE","TANK","SOLDIER","GENERAL","BULLET","GRENADE",
 "HELMET","MEDAL","RIFLE","TANK","SOLDIER","GENERAL","BULLET","GRENADE",
 "HELMET","MEDAL","RIFLE","TANK","SOLDIER","BULLET","GRENADE","HELMET",
 "MEDAL","RIFLE","TANK","BULLET","GRENADE","HELMET","MEDAL","RIFLE",
 "BULLET","GRENADE","HELMET","WILD","MEDAL","BULLET","GRENADE","HELMET",
 "BULLET","GRENADE","HELMET","BULLET","GRENADE","BULLET","GRENADE","WILD",
 "HELMET","RIFLE","BULLET","SOLDIER","GENERAL","RIFLE","BULLET","GRENADE",
 "S300","S300","SCATTER","MEDAL","TANK"]
```

**Reel 4 (index 3) — target reel (PLANE only; no S300)**
```json
["MEDAL","RIFLE","TANK","SOLDIER","GENERAL","BULLET","GRENADE","HELMET",
 "MEDAL","RIFLE","TANK","SOLDIER","GENERAL","BULLET","GRENADE","HELMET",
 "MEDAL","RIFLE","TANK","SOLDIER","BULLET","GRENADE","HELMET","MEDAL",
 "RIFLE","BULLET","GRENADE","HELMET","MEDAL","RIFLE","BULLET","GRENADE",
 "HELMET","WILD","MEDAL","BULLET","GRENADE","HELMET","BULLET","GRENADE",
 "HELMET","BULLET","GRENADE","PLANE","BULLET","WILD","GRENADE","PLANE",
 "BULLET","GRENADE","GENERAL","SOLDIER","TANK","BULLET","RIFLE","PLANE",
 "HELMET","SOLDIER","SCATTER","MEDAL"]
```

**Reel 5 (index 4) — launcher reel (S300 only; no PLANE)**
```json
["RIFLE","TANK","SOLDIER","GENERAL","BULLET","GRENADE","HELMET","MEDAL",
 "RIFLE","TANK","SOLDIER","GENERAL","BULLET","GRENADE","HELMET","MEDAL",
 "RIFLE","TANK","SOLDIER","BULLET","GRENADE","HELMET","MEDAL","RIFLE",
 "BULLET","GRENADE","HELMET","RIFLE","TANK","BULLET","GRENADE","HELMET",
 "MEDAL","BULLET","GRENADE","HELMET","WILD","BULLET","GRENADE","HELMET",
 "BULLET","GRENADE","MEDAL","BULLET","GRENADE","BULLET","WILD","GRENADE",
 "S300","GENERAL","BULLET","SOLDIER","TANK","BULLET","GRENADE","RIFLE",
 "HELMET","S300","SCATTER","BULLET"]
```

**Reel 6 (index 5) — target reel (PLANE only; no S300)**
```json
["SOLDIER","GENERAL","BULLET","GRENADE","HELMET","MEDAL","RIFLE","TANK",
 "SOLDIER","GENERAL","BULLET","GRENADE","HELMET","MEDAL","RIFLE","TANK",
 "BULLET","GRENADE","HELMET","MEDAL","RIFLE","BULLET","GRENADE","HELMET",
 "MEDAL","RIFLE","BULLET","GRENADE","HELMET","SOLDIER","GENERAL","BULLET",
 "GRENADE","HELMET","WILD","MEDAL","BULLET","GRENADE","RIFLE","BULLET",
 "GRENADE","HELMET","BULLET","GRENADE","PLANE","WILD","BULLET","GRENADE",
 "PLANE","BULLET","HELMET","SOLDIER","GENERAL","TANK","RIFLE","BULLET",
 "GRENADE","GENERAL","SCATTER","PLANE"]
```

---

### Free Game Strips (`reel_strips_free`)

**Free Reel 1 (index 0) — launcher reel (S300 only; no PLANE)**
```json
["BULLET","GRENADE","HELMET","MEDAL","RIFLE","TANK","SOLDIER","GENERAL",
 "BULLET","GRENADE","HELMET","MEDAL","RIFLE","TANK","SOLDIER","BULLET",
 "GRENADE","HELMET","MEDAL","RIFLE","BULLET","GRENADE","HELMET","WILD",
 "BULLET","GRENADE","HELMET","RIFLE","TANK","BULLET","GRENADE","HELMET",
 "TANK","BULLET","GRENADE","HELMET","BULLET","GRENADE","WILD","BULLET",
 "GRENADE","GRENADE","BULLET","GRENADE","WILD","BULLET","BULLET","GRENADE",
 "BULLET","HELMET","BULLET","S300","SCATTER","HELMET","MEDAL","SOLDIER",
 "GENERAL","S300","SOLDIER","SCATTER"]
```

**Free Reel 2 (index 1) — target reel (PLANE only; no S300)**
```json
["GRENADE","HELMET","MEDAL","RIFLE","TANK","SOLDIER","GENERAL","BULLET",
 "GRENADE","HELMET","MEDAL","RIFLE","TANK","SOLDIER","BULLET","GRENADE",
 "HELMET","MEDAL","RIFLE","BULLET","GRENADE","HELMET","PLANE","BULLET",
 "GRENADE","RIFLE","TANK","BULLET","GRENADE","HELMET","PLANE","BULLET",
 "GRENADE","HELMET","BULLET","GRENADE","WILD","BULLET","GRENADE","PLANE",
 "BULLET","WILD","GRENADE","BULLET","PLANE","GRENADE","BULLET","PLANE",
 "BULLET","SCATTER","BULLET","MEDAL","GENERAL","SOLDIER","HELMET","MEDAL",
 "HELMET","RIFLE","SCATTER","TANK"]
```

**Free Reel 3 (index 2) — launcher reel (S300 only; no PLANE)**
```json
["HELMET","MEDAL","RIFLE","TANK","SOLDIER","GENERAL","BULLET","GRENADE",
 "HELMET","MEDAL","RIFLE","TANK","SOLDIER","BULLET","GRENADE","HELMET",
 "MEDAL","RIFLE","BULLET","GRENADE","HELMET","GRENADE","BULLET","GRENADE",
 "HELMET","RIFLE","BULLET","GRENADE","HELMET","BULLET","BULLET","GRENADE",
 "WILD","BULLET","GRENADE","TANK","BULLET","GRENADE","BULLET","WILD",
 "GRENADE","BULLET","SOLDIER","GRENADE","WILD","BULLET","SCATTER","BULLET",
 "S300","SOLDIER","GENERAL","HELMET","RIFLE","MEDAL","BULLET","S300",
 "GENERAL","SCATTER","TANK"]
```

**Free Reel 4 (index 3) — target reel (PLANE only; no S300)**
```json
["MEDAL","RIFLE","TANK","SOLDIER","GENERAL","BULLET","GRENADE","HELMET",
 "MEDAL","RIFLE","TANK","SOLDIER","BULLET","GRENADE","HELMET","MEDAL",
 "RIFLE","BULLET","GRENADE","HELMET","PLANE","BULLET","GRENADE","MEDAL",
 "RIFLE","BULLET","GRENADE","HELMET","PLANE","BULLET","GRENADE","HELMET",
 "WILD","BULLET","GRENADE","BULLET","GRENADE","PLANE","BULLET","WILD",
 "GRENADE","PLANE","BULLET","GRENADE","PLANE","BULLET","SCATTER","BULLET",
 "TANK","GENERAL","SOLDIER","MEDAL","RIFLE","HELMET","BULLET","GRENADE",
 "BULLET","MEDAL","SCATTER","TANK"]
```

**Free Reel 5 (index 4) — launcher reel (S300 only; no PLANE)**
```json
["RIFLE","TANK","SOLDIER","GENERAL","BULLET","GRENADE","HELMET","MEDAL",
 "RIFLE","TANK","SOLDIER","BULLET","GRENADE","HELMET","MEDAL","RIFLE",
 "BULLET","GRENADE","HELMET","RIFLE","BULLET","GRENADE","RIFLE","TANK",
 "BULLET","GRENADE","HELMET","WILD","BULLET","GRENADE","HELMET","WILD",
 "BULLET","GRENADE","HELMET","BULLET","GRENADE","BULLET","WILD","GRENADE",
 "GRENADE","BULLET","GRENADE","TANK","BULLET","SCATTER","BULLET","S300",
 "SOLDIER","GENERAL","RIFLE","HELMET","MEDAL","BULLET","S300","SOLDIER",
 "SCATTER","HELMET"]
```

**Free Reel 6 (index 5) — target reel (PLANE only; no S300)**
```json
["SOLDIER","GENERAL","BULLET","GRENADE","HELMET","MEDAL","RIFLE","TANK",
 "SOLDIER","BULLET","GRENADE","HELMET","MEDAL","RIFLE","BULLET","GRENADE",
 "HELMET","PLANE","BULLET","GRENADE","SOLDIER","GENERAL","BULLET","GRENADE",
 "HELMET","PLANE","BULLET","GRENADE","HELMET","WILD","BULLET","GRENADE",
 "PLANE","BULLET","GRENADE","WILD","BULLET","PLANE","GRENADE","BULLET",
 "PLANE","GRENADE","BULLET","SCATTER","BULLET","MEDAL","HELMET","MEDAL",
 "SOLDIER","GENERAL","RIFLE","TANK","BULLET","GRENADE","HELMET","BULLET",
 "HELMET","RIFLE","SCATTER","PLANE"]
```
