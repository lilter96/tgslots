# TGSlots — Multi-game Slot Engineering Showcase

A personal TypeScript / Bun monorepo for slot-game mathematics, a browser game client, and reproducible Monte Carlo simulations. It complements my [.NET engineering portfolio](https://github.com/lilter96/portfolio) with hands-on iGaming domain work.

## What to review

- **Game mathematics:** shared RNG/sampler primitives, payline and cluster evaluation, cascades, free-spin and bonus mechanics.
- **Modular games:** Ancient Dragon, Woodland Whisper, Le Militare, X7 Club, and Nine Lives implement a shared state-machine and serialization contract.
- **Simulation tooling:** seeded runs, worker-thread execution, RTP/feature metrics, and HTML reports.
- **Application delivery:** Elysia/Bun HTTP API, PixiJS 8 browser rendering, React marketing frontend, and shared TypeScript contracts.
- **Engineering process:** game test harnesses, [architecture decisions](memory/decisions), and [AI coding instructions](AGENTS.md).

## Verified sticky-WILD mathematics

Le Militare v2 uses a five-row giant sticky WILD that counts as one symbol in a
cluster and remains locked through every cascade until the bonus ends. Ordinary
interception WILDs are consumable; their multiplier contributions remain banked.

The [independent math audit](packages/games/le-militare/config/math-audit.json)
contains **81.6 million complete rounds**: 60 million ordinary rounds and 21.6
million feature purchases across all three modes. It reports RTP confidence
intervals, hit/trigger rates, bonus progression, payout quantiles, the round cap
and cascade integrity. The RTP target is 98.4%; this is a reproducible portfolio
audit, not an exact analytical result or production certification.

See the [playable specification](memory/le-militare-gdd.md) and
[reproduction script](packages/games/le-militare/scripts/math-audit.ts).

## X7 Club — Go + TypeScript + Pixi Reels

X7 Club adds a neon capybara Hold & Spin slot: locked credit prizes, fixed MINI /
MAJOR / MEGA awards, full-column boosters and a rare ×7. It reuses the shared
samplers, payline evaluator, state-machine contract and simulation runner;
generic held-prize and column-boost mechanics live in `slots-core`.

Go owns its demo wallet, session revisions and idempotent actions. A stateless
TypeScript math worker calculates seeded results through RabbitMQ request/reply.
The game is registered in the existing client library and marketing site.

```bash
bun run dev:x7       # starts RabbitMQ, Go, math worker, API, client, marketing
bun run x7:smoke     # complete rounds and duplicate-request checks
bun run x7:check     # generated-cost consistency + Go race tests
bun run x7:sim --spins 1000000 --warmup 1000
bun run x7:sim --spins 1000000 --game-mode buy --warmup 1000
```

Requires Go 1.26.4 and Docker in addition to Bun. See the
[playable specification and architecture](memory/x7-club-gdd.md),
[reproducible math audit](packages/games/x7-club/config/math-audit.json), and
[container stack](compose.x7.yml). Sessions and credits are ephemeral demo data.

## Nine Lives — Bun + TypeScript + Pixi Reels

A charcoal/ivory/red comic slot with a cat Reaper: 6×5 cluster cascades,
nine free spins, a persistent bonus multiplier and cash chips that the Reaper
collects before turning them into consumable Wild. Bonus entry costs 240×
the original stake; the full-round cap is 9,999×.

Nine Lives registers `NineLivesModule` in the common Bun/Elysia `GameServer`,
just like the other TypeScript games, and uses the generic game-action route.
The common dispatcher and `InMemorySessionManager` manage its virtual wallet,
revisions and request deduplication. Clusters, cascades and cash-prize collection
reuse `slots-core`; gameplay tests use `SlotsTestEngine`.

```bash
bun run dev:nine-lives    # Bun API :3401, client :3402, marketing :3404
bun run nine-lives:smoke  # common API wallet + complete bonus + retry check
bun run nine-lives:check  # audit/config SHA-256 + RTP tolerance
bun run nine-lives:audit  # shared Bun worker runner; 10m base + 1m purchases
```

The game also works with the standard `dev:api` / `dev:all` commands.
See the [game specification](memory/nine-lives-gdd.md),
[math audit](packages/games/nine-lives/config/math-audit.json), and
[Bun container stack](compose.nine-lives.yml), which uses the standard API Dockerfile.

## Architecture

```text
math → slots-core → simulation engine → game packages
                                      ↘ API / PixiJS client / simulation CLI
```

| Directory                          | Responsibility                                                  |
| ---------------------------------- | --------------------------------------------------------------- |
| `packages/math`                    | Randomness, sampling, and distributions                         |
| `packages/slots-core`              | Shared gameplay primitives and evaluation                       |
| `packages/slots-simulation-engine` | State machines, metrics, test harnesses, and simulation runners |
| `packages/games`                   | Game-specific rules and configuration                           |
| `packages/shared-contracts`        | Game manifests and serialized states                            |
| `apps/api`                         | Game-action HTTP API                                            |
| `apps/web-client`                  | PixiJS browser client                                           |
| `apps/marketing`                   | React game discovery frontend                                   |
| `apps/simulations`                 | Monte Carlo CLI and reports                                     |

[Detailed codebase walkthrough](codebase-analysis-docs/CODEBASE_KNOWLEDGE.md) · [Testing strategy](memory/testing_strategy.md)

## Local development

Requires **Bun 1.3.13**. From the repository root:

```bash
bun install --frozen-lockfile
bun run build
bun run dev:api       # localhost:3001
bun run dev:client    # localhost:3002, in another terminal
bun run dev:marketing # localhost:3004, optional
```

Verify the workspace:

```bash
bun run validate     # typecheck → lint → tests
```

Example simulation:

```bash
cd apps/simulations
bun run main.ts --game le-militare --spins 1000 --visualize
```

## Scope and limits

This is a personal engineering showcase, not a certified real-money gambling platform. API sessions use an **ephemeral in-memory store**; durability, operator accounting, production security, and gambling certification are outside this repository's demonstrated scope. Simulation results are engineering checks, not regulatory approval.

**Local verification (2026-10-07, Bun 1.3.13):** `bun run validate` passed: all workspace typechecks, ESLint and **753 tests**. The web-client production build passed. Independent reference checks cover 30,520 payline combinations and 4,050 cluster combinations. Woodland Whisper's normal-round target is 96%: the analytical result is 96.0006%, with 96.1487% measured over 20 million complete rounds including card picks and free spins. See [the calculation and calibration notes](packages/games/woodland-whisper/config/MATH-NOTES.md).

The browser client includes [in-game rules and paytables](apps/web-client/src/app/game-rules.ts), raster character poses, actual-cell win trails, bonus entry and completion scenes, and visible missile/aircraft action. Original synthesized music and effects are reproducible with `scripts/compose-game-audio.py`; asset provenance is recorded beside the audio files. Desktop and phone feature flows are reviewed through uncut browser recordings against the live local API. Visual review and promo publication remain pending.

Publication review checked the tracked source and complete available Git history for secrets and obvious commercial-code markers. It does not establish production readiness. No open-source license has been added; public visibility alone does not grant reuse rights.

Development includes AI-assisted implementation, with architecture, constraints, verification, and final review remaining my responsibility. Git history retains contributor attribution.
