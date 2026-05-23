# Repository Guidelines

## Project Structure
`tgslots` is a Bun-based TypeScript monorepo. Shared logic lives in `packages/`: `math`, `slots-core`, `slots-simulation-engine`, `shared-contracts`, and `asset-pipeline`. Game packages live in `packages/games/`. Apps live in `apps/` (api, simulations, web-client, marketing).

## Memory
Before non-trivial tasks, read `memory/index.md` and `memory/active_context.md`. Architectural decisions live in `memory/decisions/`. Memory stores only what code cannot tell you: ADRs and current work context. If `ls`, `grep`, or `git log` can answer it, it doesn't belong in memory.

When you make a change that alters a design choice, add an ADR to `memory/decisions/`. Keep `memory/active_context.md` current with what you're working on.

## Build, Test, and Development Commands
- `bun install`: install workspace dependencies
- `bun run build`: runs each workspace `build` script and validates TypeScript compilation
- `bun run typecheck`: checks the root TS graph with `tsc --noEmit`
- `bun run eslint:lint`: runs ESLint across the repo
- `bun run eslint:fix`: auto-fix lint issues
- `bun run validate`: runs typecheck, lint, and tests (full CI check)
- `bun run setup`: install deps and build all workspaces (first-time setup)
- `bun run dev:api` / `dev:client` / `dev:marketing`: start individual dev servers
- `bun test`: runs Bun tests across packages with test files
- `bun --filter @tgslots/math test`: run tests for a single workspace
- `bun --filter @tgslots/simulations run sim -- --game ancient-dragon`: run a simulation

## Coding Rules

### TypeScript
- Strict mode enabled in all packages (`"strict": true`)
- No `any` — use `unknown` + type narrowing or explicit generics
- Prefer `interface` over `type` for object shapes
- Prefer `type` for unions, aliases, and mapped types
- All async code uses `async/await` — no raw Promise chains
- ESM only (`"type": "module"`)
- Prefix intentionally unused parameters with `_`

### Naming Conventions
- Packages: `@tgslots/<name>` kebab-case
- Files: kebab-case
- Types/Interfaces: PascalCase
- Functions/variables: camelCase
- Constants: UPPER_SNAKE_CASE for truly constant primitives; camelCase for objects

### Module Design
- Services must be stateless (pure functions or classes with no mutable fields)
- Dependency injection preferred over direct imports of singletons
- No hidden coupling between packages — only explicit imports
- Packages export from a single `src/index.ts` barrel (math, slots-simulation-engine, shared-contracts) or from individual modules (slots-core)

### Hot Path Rules (evaluation + sampling)
- Use integer symbol IDs, never string comparisons in payline evaluation
- Use `AliasSampler` (O(1) Walker-Vose) for weighted reel sampling
- Use `Uint8Array` for reel strip data
- Avoid closures that capture large state inside tight loops

### Game Architecture
- All games implement the state machine pattern: base state ↔ feature states
- Game logic (sampling, evaluation) must be separated from state machine transitions
- Constants (symbols, reels, paytable) live in `constants.ts`
- Config-driven where possible (prefer JSON config)

### RNG Discipline (CRITICAL)
- **All randomness in game packages must go through `Sampler<T>` monads**
- Game logic functions NEVER accept `rng: Rng` as a parameter
- Every random process is expressed as a module-level `Sampler<T>` constant
- The ONLY valid sites for `rng` consumption are:
  1. `StateMachine.spin(rng)` — the simulation engine boundary
  2. `StateMachine.next(rng)` — the simulation engine boundary
  3. Future API spin handler (not yet implemented)
- Inside `spin`/`next`, only call `.sample(rng)` on pre-built Samplers — never pass `rng` into any other function
- Violation pattern to avoid: `private method(rng: Rng)` — move to `Sampler<T>` in `logic.ts` instead

### Simulation Metrics
- Keep `SpinResult` lean; do not add reporting-specific fields
- Record game-specific telemetry through `recordResultMetrics()` and `recordRoundMetrics()` collector hooks
- Prefer scoped generic metrics (`count`, `value`, `distribution`, `payout`, `rtp`) over ad hoc report fields
- **Metric kind discipline:** use `scope.rtp(name, amount)` for wager-normalized contributions; use `scope.payout(name, amount)` for aggregates. Never re-introduce a per-call denominator on either.
- **Canonical metric vocabulary** (all games use these names, no game-specific synonyms):

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

Engine auto-emits at root: `rounds` (count), `round-rtp` (rtp), `round-win-amount` (value), `spins-per-round` (value), `round-win-multiplier` (distribution).

### Comments
- Only when WHY is non-obvious (hidden constraint, subtle invariant, workaround)
- Never describe WHAT the code does — identifiers do that
- No multi-line comment blocks

### Error Handling
- Validate at system boundaries only (CLI args, external config files)
- Trust internal types — no defensive checks inside pure functions
- Use `Either<L, R>` from `@tgslots/math` for recoverable errors in library code

## Testing Guidelines

### Framework & Location
- **bun:test** (built into Bun runtime, Jest-compatible API)
- Tests live in `packages/<name>/src/__tests__/` with `*.test.ts` suffix
- Run: `bun test` (root) or `bun --filter @tgslots/<pkg> test` (single workspace)

### Coverage Targets
- **80%+** line coverage across all packages
- **100%** coverage for math primitives (RNG, Sampler, Distribution)
- **100%** coverage for payline evaluator (deterministic logic)

### Test Types
- **Unit tests**: `packages/<name>/src/__tests__/` — single function/class in isolation. Required for all `@tgslots/math`, `@tgslots/slots-core` modules
- **Integration tests**: `packages/<name>/src/__tests__/integration/` — game state machine full round-trip (spin → evaluate → collect). Required for each game package
- **Simulation tests**: `packages/<name>/src/__tests__/simulation/` — run N spins, assert RTP within ±0.5% of target at 1M spins. Required for each game as regression guard

### Seed Strategy
- Use fixed mt19937 seeds for deterministic unit/integration tests
- Statistical tests may use random seeds but must assert distributions, not exact values

### Priority Order
1. `@tgslots/slots-core` — payline/scatter evaluation, symbol registry, slot engine
2. `@tgslots/ancient-dragon` — sampler logic and state machine
3. `@tgslots/woodland-whisper` — sampler logic and state machine
4. `@tgslots/le-militare` — sampler logic and state machine
5. `@tgslots/slots-simulation-engine` — scoped metrics merge/finalize, comparisons, runner, CLI parsing
6. Expand property/statistical checks where math primitives already have baseline coverage

## Code Quality
Prettier enforces 2-space indentation, single quotes, trailing commas, no semicolons, `printWidth: 100`. ESLint (flat config at `eslint.config.js`) runs via `bun run eslint:lint`. Husky + lint-staged run `bun run eslint:fix` on staged files pre-commit.

## Subagent Automation
After a meaningful edit (new logic, config change, API route, test file), run the relevant subagent(s) in the background without waiting for the user to ask. Match the agent to the domain:
- Edited `logic.ts`, `samplers.ts`, or evaluation code → `perf-reviewer`
- Added exported functions/modules → `test-coverage-auditor`
- Changed metric collection or ran sim → `simulation-analyzer`
- Added/changed Elysia routes → `api-contract-auditor`
- Edited JSON configs or `constants.ts` → `config-validator`

## Commit & Pull Request Guidelines
Use Conventional Commits: `fix(games): ...`, `refactor(betting): ...`. Keep the type lowercase, scope focused. PRs should summarize the change, list affected packages, include `lint`, `typecheck`, test, or simulation results.
