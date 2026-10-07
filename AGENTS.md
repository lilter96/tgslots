# AGENTS.md — TGSlots Developer Guide

## Project

Bun-based TypeScript monorepo for multi-game slot machine platform (API + PixiJS client + React marketing site + Monte Carlo simulation engine).

## Essential Commands

```bash
bun run setup          # bun install && bun run build
bun run validate       # typecheck → lint → test (run this before committing)
bun run build          # build all workspaces
bun run typecheck      # tsc --noEmit across all workspaces
bun run eslint:lint    # lint (also runs on pre-commit via husky)
bun run eslint:fix     # lint + auto-fix
bun test               # run all tests (Bun's built-in runner)

# Filter a single workspace:
bun --filter @tgslots/slots-core test
bun --filter @tgslots/le-militare test

# Dev servers:
bun run dev:api        # API on :3001
bun run dev:client     # PixiJS client on :3002
bun run dev:marketing  # Marketing on :3004
bun run dev:all        # all three concurrently

# Simulations:
cd apps/simulations
bun run main.ts --game le-militare --spins 1000000                  # full sim (assault)
bun run main.ts --game le-militare --mode sample                    # 10 sample spins
bun run main.ts --game le-militare --spins 1000 --visualize         # HTML report
bun run main.ts --game le-militare --spins 1000000 --game-mode siege  # per-mode sim
```

## Monorepo Layout

```
apps/api/           → @tgslots/api         (Elysia HTTP server)
apps/web-client/    → @tgslots/web-client  (PixiJS 8 browser client)
apps/marketing/     → @tgslots/marketing   (React 18 + Vite + Tailwind)
apps/simulations/   → @tgslots/simulations (CLI for Monte Carlo sims)
packages/math/      → @tgslots/math        (RNG, Sampler<T>, Either)
packages/slots-core/ → @tgslots/slots-core (paylines, clusters, cascades, betting)
packages/slots-simulation-engine/ → (StateMachine, metrics, test harness, parallel runner)
packages/shared-contracts/ → (type registries, manifests, serialized states)
packages/games/ancient-dragon/   → payline slot (5×3, 25 lines)
packages/games/woodland-whisper/ → payline slot (5×3, 30 lines) + pick bonus
packages/games/le-militare/      → cluster pays (6×5) + combat cascade
```

Dependency chain: `math` (foundation) → `slots-core` → `slots-simulation-engine` → game packages. API, web-client, and simulations depend on game packages.

## RNG Discipline (Non-Negotiable)

- **Never** pass `rng: Rng` as a parameter to game logic functions.
- All randomness must be module-level `Sampler<T>` constants.
- Only `StateMachine.spin(rng)` and `.next(rng)` consume the raw RNG.
- Breaking this breaks simulation reproducibility.

## Test Rules

- **All slot gameplay/state-machine tests must use `SlotsTestEngine`** from `@tgslots/slots-simulation-engine/testing/slots-test-engine`.
- No direct `mt19937()` imports in game tests — use `engine.rng(seed)`.
- No direct `new Wager()` — use `engine.wager(betLevel)`.
- No direct `new StateMachine()` — use `engine.createMachine()`.
- Low-level math/sampler unit tests may stay direct (not gameplay tests).
- **Per-mode tests**: `createSlotsTestEngine(MachineClass, betConfig, [mode])` accepts constructor args. Le Militare exposes `createLeMilitareTestEngine(mode)` in its test-engine for cross-mode testing.

## Prettier / Lint

```yaml
semi: false, singleQuote: true, trailingComma: "all", printWidth: 100
```
ESLint flat config enforces: `@typescript-eslint/no-explicit-any` (error), no `unknown`/`never` types, `_` prefix for unused args. Pre-commit: lint-staged runs `bun run eslint:fix` on staged `*.{js,ts,jsx,tsx}`.

## Key Conventions

- **Integer wagers**: `Wager` validates `totalLineWager + totalSideBet === totalWager` at construction. All paytable entries and awards are whole numbers.
- **State serialization**: `Wager` is a class — game modules must hydrate/dehydrate. Serialize `triggeringMultiplier` (number), not the `Wager` instance.
- **Metrics**: `rtp(name, amount)` is wager-normalized; `payout(name, amount)` is aggregate. Use canonical metric names.
- **Module system**: `verbatimModuleSyntax: true`, `moduleResolution: "bundler"`, `allowImportingTsExtensions: true`. No runtime emit — all `build` scripts are `tsc --noEmit` (except web-client and marketing which use Vite).
- **No database**: API sessions are `InMemorySessionManager` (ephemeral `Map`). Game config lives in `config/*.json` files.
- **Type registry**: `GameRegistry` in `shared-contracts` is extended per-game via TypeScript declaration merging.

## Important Constraints

- Never edit `.env` files or `bun.lock` directly (pre-commit tooling blocks this).
- `@typescript-eslint/no-explicit-any` is an error — use specific types.
- `unknown` and `never` types are banned by lint (use `void` for absent sides of Either/Result).
- Web-client tests may need `happy-dom` (configured as devDependency in root).
- **`ParsheetConfig` import**: import from `@tgslots/slots-simulation-engine/cli/comparison`, NOT from `@tgslots/slots-simulation-engine/cli`. The latter pulls `runner/index.ts` → `node:worker_threads` into the web-client build, which breaks the CI Docker build.
- For additional context, see `memory/` (ADRs, testing strategy) and `codebase-analysis-docs/CODEBASE_KNOWLEDGE.md`.
