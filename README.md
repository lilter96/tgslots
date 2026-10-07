# TGSlots — Multi-game Slot Engineering Showcase

A personal TypeScript / Bun monorepo for slot-game mathematics, a browser game client, and reproducible Monte Carlo simulations. It complements my [.NET engineering portfolio](https://github.com/lilter96/portfolio) with hands-on iGaming domain work.

## What to review

- **Game mathematics:** shared RNG/sampler primitives, payline and cluster evaluation, cascades, free-spin and bonus mechanics.
- **Modular games:** Ancient Dragon, Woodland Whisper, and Le Militare implement a shared state-machine and serialization contract.
- **Simulation tooling:** seeded runs, worker-thread execution, RTP/feature metrics, and HTML reports.
- **Application delivery:** Elysia/Bun HTTP API, PixiJS 8 browser rendering, React marketing frontend, and shared TypeScript contracts.
- **Engineering process:** game test harnesses, [architecture decisions](memory/decisions), and [AI coding instructions](AGENTS.md).

## Architecture

```text
math → slots-core → simulation engine → game packages
                                      ↘ API / PixiJS client / simulation CLI
```

| Directory | Responsibility |
| --- | --- |
| `packages/math` | Randomness, sampling, and distributions |
| `packages/slots-core` | Shared gameplay primitives and evaluation |
| `packages/slots-simulation-engine` | State machines, metrics, test harnesses, and simulation runners |
| `packages/games` | Game-specific rules and configuration |
| `packages/shared-contracts` | Game manifests and serialized states |
| `apps/api` | Game-action HTTP API |
| `apps/web-client` | PixiJS browser client |
| `apps/marketing` | React game discovery frontend |
| `apps/simulations` | Monte Carlo CLI and reports |

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

**Local verification (2026-10-07, Bun 1.3.13):** `bun run validate` passed: all workspace typechecks, ESLint and 736 tests. Explicit Node.js typings resolve the simulation runner’s Node `Worker` event API. The full build and live deployment were not reverified for this publication.

Publication review checked the tracked source and complete available Git history for secrets and obvious commercial-code markers. It does not establish production readiness. No open-source license has been added; public visibility alone does not grant reuse rights.

Development includes AI-assisted implementation, with architecture, constraints, verification, and final review remaining my responsibility. Git history retains contributor attribution.
