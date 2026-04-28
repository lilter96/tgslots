---
title: "Coding Rules"
type: "coding-rules"
tags: 
- "memory"
- "rules"
up: 
- "[[index]]"
---
# Coding Rules

## TypeScript

- Strict mode enabled in all packages (`"strict": true`)
- No `any` — use `unknown` + type narrowing or explicit generics
- Prefer `interface` over `type` for object shapes
- Prefer `type` for unions, aliases, and mapped types
- All async code uses `async/await` — no raw Promise chains

## Module Design

- Services must be stateless (pure functions or classes with no mutable fields)
- Dependency injection preferred over direct imports of singletons
- No hidden coupling between packages — only explicit imports
- Each package exports from a single `src/index.ts` barrel
- ESM only (`"type": "module"`)

## Hot Path Rules (evaluation + sampling)

- Use integer symbol IDs, never string comparisons in payline evaluation
- Use `AliasSampler` (O(1) Walker-Vose) for weighted reel sampling
- Use `Uint8Array` for reel strip data
- Avoid closures that capture large state inside tight loops

## Game Architecture

- All games implement the state machine pattern: base state ↔ feature states
- Game logic (sampling, evaluation) must be separated from state machine transitions
- Constants (symbols, reels, paytable) live in `constants.ts`
- Config-driven where possible (prefer JSON config like Woodland Whisper)

## Simulation Metrics

- Keep `SpinResult` lean; do not add reporting-specific fields just to feed CLI or visualization output
- Record game-specific telemetry through `recordResultMetrics()` and `recordRoundMetrics()` collector hooks
- Prefer scoped generic metrics (`count`, `value`, `distribution`, `payout`, `rtp`) over slot-specific ad hoc report fields
- **Metric kind discipline:** use `scope.rtp(name, amount)` for wager-normalized contributions (ratio = `total / cumulative-totalBet`); use `scope.payout(name, amount)` for aggregates (count/avg/total/min/max). Never re-introduce a per-call denominator on either. See [[decision_003_split_payout_and_rtp_metric_kinds]].
- **Canonical metric vocabulary:** all games use the shared metric names below. Do not introduce game-specific synonyms. See [[decision_004_canonical_metric_vocabulary_and_modern_visualizer]].

| Concept | Canonical name | Kind |
| --- | --- | --- |
| Spins with win > 0 | `hits` | count |
| Free spins played | `spins-played` | count |
| Free spins granted at trigger | `spins-awarded` | value |
| Per-spin win amount | `spin-win` | payout |
| Trigger events | `triggers` | count |
| Retrigger events | `retriggers` | count |
| Total free spins per trigger session | `total-spins-per-trigger` | value |
| Base game RTP contribution | `win` | rtp |
| Base game scatter RTP | `scatter-win` | rtp (payout in free scope) |
| Free-spin RTP contribution | `feature-rtp` | rtp |
| Free-spin scatter RTP | `scatter-rtp` | rtp |
| Per-trigger session total win | `session-win` | payout |
| Triggered-round total win | `triggered-round-win` | payout |
| Scatter count per spin | `scatter-count` | distribution |

Engine auto-emits at root: `rounds` (count), `round-rtp` (rtp; equals `summary.rtp`), `round-win-amount` (value), `spins-per-round` (value), `round-win-multiplier` (distribution).

## RNG Discipline (CRITICAL)

**All randomness in game packages must go through `Sampler<T>` monads.**

- Game logic functions NEVER accept `rng: Rng` as a parameter
- Every random process is expressed as a module-level `Sampler<T>` constant
- The ONLY valid sites for `rng` consumption are:
  1. `StateMachine.spin(rng)` — the simulation engine boundary
  2. `StateMachine.next(rng)` — the simulation engine boundary
  3. Future API spin handler (not yet implemented)
- Inside `spin`/`next`, only call `.sample(rng)` on pre-built Samplers — never pass `rng` into any other function
- Violation pattern to avoid: `private method(rng: Rng)` — move to `Sampler<T>` in `logic.ts` instead

## Naming Conventions

- Packages: `@tgslots/<name>` kebab-case
- Files: kebab-case
- Types/Interfaces: PascalCase
- Functions/variables: camelCase
- Constants: UPPER_SNAKE_CASE for truly constant primitives; camelCase for objects

## Comments

- Only when WHY is non-obvious (hidden constraint, subtle invariant, workaround)
- Never describe WHAT the code does — identifiers do that
- No multi-line comment blocks

## Error Handling

- Validate at system boundaries only (CLI args, external config files)
- Trust internal types — no defensive checks inside pure functions
- Use `Either<L, R>` from `@tgslots/math` for recoverable errors in library code
