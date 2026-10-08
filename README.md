# TGSlots — Slot Mathematics, Game Clients & Backend Engineering

Five playable slot games built around shared, testable mathematics: classic paylines,
interactive card picks, combat cascades with giant sticky WILDs, and Hold & Spin
with column boosters, plus Nine Lives with a cat Reaper collecting cash chips. A personal TypeScript/Bun monorepo covering game rules,
probability models, backend state transitions, browser presentation and independent
verification. X7 Club also demonstrates a **Go + RabbitMQ** backend using the same
seeded mathematical implementation as the lightweight Bun mode.

By [Terentiy Gatsukov](https://github.com/lilter96).
Part of my [.NET and backend engineering portfolio](https://github.com/lilter96/portfolio).

**[Watch the showcase](https://lilter96.github.io/portfolio/#showreel)** ·
**[Four-game promo](https://lilter96.github.io/portfolio/media/slots/tgslots-reel.mp4)** ·
**[Verification report](docs/x7-verification.md)** ·
**[Run locally](#run-locally)** ·
**[Architecture decisions](memory/decisions)**

| At a glance                   | Evidence                                                                 |
| ----------------------------- | ------------------------------------------------------------------------ |
| **5 games**                   | Distinct mechanics, shared math primitives and simulation infrastructure |
| **812 passing tests**         | Typechecks, ESLint and workspace tests verified on 2026-10-08            |
| **81.6M verification rounds** | Le Militare: complete paid rounds, bonuses, cascades and retriggers      |
| **2 X7 backend modes**        | In-process Bun or Go + RabbitMQ; one seeded math executor                |
| **Browser presentation**      | PixiJS 8, GSAP, raster artwork, responsive controls and in-game rules    |

## See the games

The images below link to published promos recorded from real gameplay. The
portfolio includes individual promos and uncut gameplay; the promos use music
only, without the games' sound effects. The hosted portfolio currently presents
videos; the interactive games run locally with the API.

| Ancient Dragon                                                                                                                                                       | Woodland Whisper                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [![Ancient Dragon: dragon-themed reels and free spins](docs/media/ancient-dragon.webp)](https://lilter96.github.io/portfolio/media/slots/ancient-dragon-promo.mp4)   | [![Woodland Whisper: forest reels and interactive card-pick bonus](docs/media/woodland-whisper.webp)](https://lilter96.github.io/portfolio/media/slots/woodland-whisper-promo.mp4) |
| **25 paylines · mystery symbols · free spins**                                                                                                                       | **30 paylines · card picks · ×2 free-spin awards**                                                                                                                                 |
| Le Militare                                                                                                                                                          | X7 Club                                                                                                                                                                            |
| [![Le Militare: combat cascades and locked giant WILD columns](docs/media/le-militare.webp)](https://lilter96.github.io/portfolio/media/slots/le-militare-promo.mp4) | [![X7 Club: neon capybara Hold and Spin with locked prizes](docs/media/x7-club.webp)](https://lilter96.github.io/portfolio/media/slots/x7-club-promo.mp4)                          |
| **Cluster pays · interceptions · sticky WILDs**                                                                                                                      | **20 paylines · Hold & Spin · column boosters**                                                                                                                                    |

[LinkedIn-format promo](https://lilter96.github.io/portfolio/media/slots/tgslots-linkedin.mp4) ·
[Recording and export verification](https://github.com/lilter96/portfolio/blob/main/frontend/public/media/slots/VERIFICATION.json) ·
[Promo music credits](https://github.com/lilter96/portfolio/blob/main/frontend/public/media/slots/MUSIC-CREDITS.md)

## What each game demonstrates

### Ancient Dragon — classic payline mathematics

A 5-reel, 3-row slot with **25 left-to-right paylines**, mystery-symbol replacement,
Gold Dragon WILD substitution and Yin-yang scatters. Three or more scatters award
10 free spins; retriggers preserve the original stake.

This game exercises line evaluation, symbol substitution, scatter evaluation and
serialization of a free-spin lifecycle in the shared platform.

[Game mathematics](packages/games/ancient-dragon/src) ·
[Configuration](packages/games/ancient-dragon/config/config.json) ·
[Parsheet benchmarks](packages/games/ancient-dragon/config/parsheet.json)

### Woodland Whisper — interactive bonus and analytical verification

A 5×3 slot with **30 paylines**. Coin scatters enter a card-pick feature: finding
two matching numbers awards free spins. Line and scatter awards are multiplied
by **2 during free spins**; retriggers retain the triggering stake. Buying the
feature costs **100× stake** and guarantees entry.

The game separates player interaction from mathematical probabilities: the
server samples awards, while card selection controls their reveal. The simulation
player resolves card picks before continuing all awarded spins, so a simulated
round includes the complete feature rather than stopping at the pick screen.

An independent analytical reference evaluates actual cyclic reel windows,
conditional mystery-symbol probabilities, scatter counts and weighted pick
outcomes. Conditional stop sampling guarantees purchased entry without retrying
natural spins until one happens to trigger.

[Game mathematics](packages/games/woodland-whisper/src) ·
[Current math notes](packages/games/woodland-whisper/config/MATH-NOTES.md) ·
[Independent Python reference](scripts/verify-woodland-math.py)

### Le Militare — combat cascades and persistent state

A **6×5 cluster-pays** game with a six-symbol minimum, cascades and three modes:
**Recon, Assault and Siege**. Launchers intercept aircraft; interceptions create
ordinary WILDs and add multipliers. The bonus preserves armed reels and the
accumulated multiplier between free spins.

An activated launcher column becomes **one giant sticky WILD**. Its five-row
footprint connects neighbours at every height, but contributes **one symbol** to
a paying cluster. It stays locked through every cascade and remaining free spin.
Ordinary interception WILDs clear when they win; their multiplier contributions
remain banked. This distinction is implemented in both evaluation and rendering.

Paid options include Recon Strike, Air Raid, Combat Op, Elite Op and Super Op.
The purchased free-spin tiers start with **9 / 17 / 21 spins**; Super Op starts
with multiplier 3. Prices and distributions are mode-specific. The complete-round
payout cap is **15,000× the triggering stake**.

[Playable specification](memory/le-militare-gdd.md) ·
[Game mathematics](packages/games/le-militare/src) ·
[Independent audit](packages/games/le-militare/config/math-audit.json) ·
[Audit implementation](packages/games/le-militare/scripts/math-audit.ts)

### X7 Club — Hold & Spin and retry-safe backend actions

A neon capybara slot with a **5×3 board and 20 paylines**. Six or more COIN symbols
enter Hold & Spin. Prizes remain locked; a new coin resets the counter to three
respins. A full column queues a booster: **+1× stake, +2× stake, ×7, or bank**.
Boosters do not consume respins and each completed column receives its booster once.

MINI / MAJOR / MEGA are fixed initial prizes of **10× / 50× / 250× stake**, rather
than progressive jackpots. Buying entry costs **77× stake**. The bonus pays once
at completion; the whole-round cap is **7,777× the original stake**.

Its backend contract handles request identity, session revisions, wallet costs,
duplicate responses and retry recovery. The client stores pending request identity
before sending and exposes retry/reset controls after ambiguous failures.

[Playable specification](memory/x7-club-gdd.md) ·
[Shared seeded executor](packages/games/x7-club/src/execute.ts) ·
[Held-prize and booster primitives](packages/slots-core/src/hold-spin/hold-spin.ts) ·
[Go server](apps/x7-server) ·
[Integration evidence](docs/x7-verification.md)

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
Shared probability and evaluation layer
  math → slots-core → simulation infrastructure → game packages
                                                   ├─ API execution
                                                   ├─ seeded simulation workers
                                                   └─ browser contracts / presentation

Browser client → shared Bun / Elysia API
                   ├─ Ancient Dragon / Woodland Whisper / Le Militare / Nine Lives
                   └─ X7_BACKEND
                        ├─ bun       → local session + wallet → seeded X7 executor
                        └─ go-rabbit → Go session + wallet → RabbitMQ RPC
                                                              → TS worker
                                                              → same X7 executor
```

- **Mathematics and presentation are separate.** State machines generate results;
  the browser animates their grids, awards and feature events.
- **Randomness is explicit and reproducible.** Module-level weighted samplers
  consume RNG through state-machine entry points. Seeded runs can be replayed.
- **Wagers and states have contracts.** Shared betting primitives and serialized
  states preserve the triggering stake, bonus progression and round budgets.
- **Games reuse infrastructure.** Payline evaluation, clusters, cascades, held
  prizes, column boosts, collectors and simulation workers live in shared packages.
- **X7 has one math implementation.** Bun executes it in-process; the RabbitMQ
  worker executes the same versioned, seeded commands. The worker never owns the wallet.

### X7 request correctness

Each mutation carries `sessionId`, `requestId`, `expectedRevision` and its payload.
A successful action advances the revision once and updates the balance once.
Repeated requests return the cached response; conflicting identities or stale
revisions are rejected. Cache eviction does not make an old debit executable again.

In Go mode, a pending command retains its seed after a timeout, and a new command
cannot overtake it. RabbitMQ RPC uses correlation IDs, publisher confirms and
exclusive reply queues. The worker confirms its reply before acknowledging the
request. In Bun mode, calculation and wallet commit run synchronously in-process.
Neither deployment automatically switches to another backend after a failure.

These guarantees apply to the lifetime of an in-memory demo session. They do not
provide durable accounting across a process restart.

### Repository map

| Path                                                                   | Responsibility                                                             |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [`packages/math`](packages/math)                                       | RNG, weighted samplers and probability primitives                          |
| [`packages/slots-core`](packages/slots-core)                           | Betting, paylines, clusters, cascades, held prizes and column boosts       |
| [`packages/slots-simulation-engine`](packages/slots-simulation-engine) | State-machine contracts, test harness, metrics, worker runner and reports  |
| [`packages/shared-contracts`](packages/shared-contracts)               | Game registries, manifests, actions and serialized states                  |
| [`packages/games`](packages/games)                                     | Five game implementations, configurations and mathematical evidence        |
| [`apps/api`](apps/api)                                                 | Elysia API, serialized sessions, game dispatch and selectable X7 backend   |
| [`apps/x7-server`](apps/x7-server)                                     | Go session authority, demo wallet, revisions, idempotency and RabbitMQ RPC |
| [`apps/x7-math-worker`](apps/x7-math-worker)                           | Stateless, seeded TypeScript command execution over RabbitMQ               |
| [`apps/web-client`](apps/web-client)                                   | PixiJS 8 / GSAP client, game registry, UI, audio and in-game rules         |
| [`apps/marketing`](apps/marketing)                                     | React 18 / Vite / Tailwind discovery frontend                              |
| [`apps/simulations`](apps/simulations)                                 | Unified simulation CLI and per-game worker entry points                    |

## Mathematics and verification

The mathematical layer is implemented in **TypeScript**, using the repository's
`math`, `slots-core` and `slots-simulation-engine` packages. Bun runs the API and
simulation entry points; Go handles X7 sessions and RPC when selected. The Go
backend does not reimplement the probability model, and PixiJS/GSAP animate
results without choosing their awards.

**[Detailed mathematical walkthrough: algorithms, formulas and tradeoffs](docs/mathematics.md)**

### From probability configuration to a paid result

```text
configuration + prior state + wager + RNG
  → sampled stops / feature events
  → line or cluster evaluation
  → bonus state transition + remaining round cap
  → payable result + serialized state
  → API response / browser animation / simulation metrics
```

| Mathematical responsibility | How it is implemented                                                                              | Why this approach                                                                       |
| --------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Weighted random events      | Composable `Sampler<T>` processes; linear selection for ≤32 entries, alias tables for larger pools | Reuse explicit distributions across symbols, prizes, multipliers and dependent features |
| Probability composition     | `SamplingPlan<T>` nodes, iterative interpreter and direct-sampling paths                           | Compose dependent draws while keeping the interpreter stack-safe                        |
| Reproducible execution      | Seeded RNG in tests/simulations; seed retained in X7 commands                                      | Replay an outcome and retry it without drawing a different result                       |
| Classic reel windows        | Cyclic strips and shared mystery-symbol replacement                                                | Preserve adjacent-row probabilities and replacement-dependent outcomes                  |
| Paylines                    | Prefix-sharing trie, iterative DFS and indexed typed-array paytables                               | Prepare evaluation structures once and share work across overlapping lines              |
| Scatters                    | Precomputed visible-window counts at each strip stop                                               | Replace repeated window scans with per-reel lookups                                     |
| Clusters                    | Four-connected BFS with WILD-claim rules and optional position weights                             | Separate physical connectivity from the effective payable symbol count                  |
| Cascades                    | Combat events, clearing, gravity and contiguous strip refills                                      | Preserve the probability model while resolving multiple wins in one spin                |
| Hold & Spin                 | Sampled arrivals / boosters plus deterministic held-prize state updates                            | Test locking, respin resets and column progression independently of rare draws          |
| Accounting                  | Explicit per-line / total wagers, triggering stake and persistent round budgets                    | Prevent wrong payout scaling, changed bonus stakes and cap resets after restoration     |
| Verification                | Whole-round collectors, seeded workers and independent references                                  | Measure the complete model and detect defects shared by the runtime evaluator           |

The RNG boundary is an integer draw over `[lo, hi)`. The seeded implementation
uses rejection before modulo reduction to avoid unequal bucket sizes. The
ordinary Bun API currently uses `Math.random` through `jsRng`; X7 draws a
cryptographic seed and executes the same seeded math in either backend mode.
This is not a commit/reveal provably-fair implementation.

The alias sampler uses fixed-point thresholds at `2^20` precision. Its speed
comes with finite probability quantization; it should not be described as exact
rational sampling. The [walkthrough](docs/mathematics.md#2-rng-and-composable-probability-models)
explains the strategy selection and its limits.

### Wager basis, persistent features and caps

For the classic games, line awards scale with **credits per line**, whereas
scatter awards scale with **total stake**. Woodland free-spin awards additionally
use its ×2 factor. A bonus retains the triggering wager, even if the UI's bet
selection changes later.

Le Militare sums cluster awards across cascades, then applies the accumulated
combat multiplier and wager multiplier. Its five-row giant WILD contributes
one unit of payable size while connecting neighbours along all five rows.
Pinned columns survive clearing/gravity; ordinary interception WILDs can clear.
The final paid result is bounded by the remaining complete-round budget.

X7 preserves coin values and queues each completed column's booster once.
With `m` empty positions and per-cell arrival probability 0.085,
`P(at least one new coin) = 1 - (1 - 0.085)^m`. New coins reset respins, while
boosters leave respins unchanged. Bonus completion pays the held prizes once,
subject to the round cap and any preceding base win.

### Woodland: an independently derived expectation

The Python reference conditions line probabilities on the shared replacement,
convolves scatter counts from actual cyclic reel windows, and evaluates the
**first repeated weighted pick** over all 1,024 seen-value subsets. Averaging a
single pick would give the wrong number of awarded free spins.

Let `b` be expected base return per stake, `p` the trigger probability, and `a`
the mean awarded free spins. Retriggers produce an expected `p × a` additional
spins per free spin. With Woodland's ×2 free-spin factor:

```text
expected total free spins after entry = a / (1 - p × a)
normal-round RTP = b + p × expected total free spins × 2b
```

For the current configuration, the mean entry award is approximately **12.7459**
spins and the mean including retriggers is **14.0408**. The calculation yields
**79.7884% base contribution + 16.2122% feature contribution = 96.0006%**.
The [full derivation](docs/mathematics.md#7-woodland-whisper-deriving-the-full-round-expectation)
explains the assumptions and conditional bonus-buy sampler.

### What the simulation actually measures

One observation is a **complete paid round**: entry plus all bonus continuations,
card picks, cascades, respins and retriggers. `runCycle` closes the round only
when the machine has no continuation. The collector calculates
`RTP = total paid winnings / total paid wager`, separately from raw payout sums.

Purchase return uses the **purchase cost** as denominator. X7's 77× buy at the
base 20-credit stake costs 1,540 credits; its prizes still use the original
20-credit stake. Normalizing those winnings by 20 would overstate buy return
77-fold. Separate simulation adapters preserve these two wager bases.

Workers use deterministic seed streams and merge round metrics; warmup outcomes
are excluded. Stored reports include configuration hashes and modes. For fixed
paid cost, the audits use normalized round returns and report approximate 95%
intervals as `mean ± 1.96 × stdDev / sqrt(rounds)`. Rare large awards widen the
uncertainty. Matching a target in a sample does not replace an analytical
calculation or establish every tail event.

### Balancing return and feature progression

RTP is a long-run expectation of the configured model, not a per-session payout
schedule. Symbol weights, reel strips, integer awards, feature frequency, booster
weights and purchase prices control different parts of that expectation and its
volatility. Le Militare's modes deliberately use different multiplier tails and
feature frequencies; X7's occupied cells and completed columns change which
state transitions remain possible.

The configuration is fixed for a verified run. There is no player-history-based
RNG adjustment to compensate for recent wins or losses. Calibration changes the
configuration, then a separate audit measures complete-round returns, bonus
cadence, empty bonuses, distribution tails and accounting invariants. Audits
record the configuration hash so the evidence can be tied to that model.

### Recorded mathematical evidence

| Game             | Evidence                                                                                                                                            | Interpretation                                                                                      |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Woodland Whisper | Independent analytical RTP: **96.0006093%**; [calculation](packages/games/woodland-whisper/config/MATH-NOTES.md)                                    | Normal paid rounds including picks, free spins and retriggers; target 96%                           |
| Le Militare      | **81.6M complete verification rounds**: 60M ordinary rounds and 21.6M feature purchases; [audit](packages/games/le-militare/config/math-audit.json) | Target 98.4%; reported 95% confidence intervals cover the targets across the verified modes/options |
| X7 Club, base    | **5M complete rounds**, observed RTP **95.8016%**, 95% interval **95.3948–96.2083%**; [audit](packages/games/x7-club/config/math-audit.json)        | The 96% normal-round target is inside this sample's confidence interval                             |
| X7 Club, buy     | **1M purchased rounds**, observed return **95.8357% of purchase cost**; [audit](packages/games/x7-club/config/math-audit.json)                      | Separate purchase distribution and cost normalization; not a claim of exactly 96% buy return        |
| Ancient Dragon   | Configured [parsheet comparisons](packages/games/ancient-dragon/config/parsheet.json) and shared simulation runner                                  | Reference benchmarks; not presented here as an independently established exact RTP                  |

Le Militare's audit uses the actual game engine on verification seeds separate
from calibration; it is not a second evaluator implementation. It checks
complete-round accounting, safe integer awards,
payout caps, sticky-WILD behaviour and cascade integrity. Its maximum observed
cascade depth was **78**, below the defensive 100-step limit. The audit records
seeds, configuration hash, trigger/hit rates and payout statistics.

**Latest local verification — 2026-10-08, Bun 1.3.13 and Go 1.26.4:**

- `bun run validate`: workspace typechecks, ESLint and **812 passing tests, 0 failures**.
- `bun run x7:check`: generated Go cost consistency and **7 Go tests under the race detector**.
- Web-client production build passed.
- Live X7 smoke checks passed through the complete API in both backend modes;
  duplicate requests preserved the result, wallet and revision.
- Ancient Dragon, Woodland Whisper and Le Militare passed state + spin HTTP
  checks on both API instances.

[Detailed verification](docs/x7-verification.md) ·
[GitHub Actions](https://github.com/lilter96/tgslots/actions/workflows/verify.yml) ·
[Testing strategy](memory/testing_strategy.md)

## Browser experience

The client includes responsive layouts, game discovery, normal / fast / turbo
speeds, autoplay controls and visible feature progression. Each game provides
rules and a paytable through its UI; X7 supplies its own Hold & Spin rules panel.
Raster artwork, character poses and atlases support themed scenes, win highlights,
bonus transitions, interceptions, locked columns and column-booster animation.

The shared [`GameClient` contract](apps/web-client/src/engine/game-client.ts)
supports the common spin/free-spin orchestrator and standalone launchers. X7 uses
the latter to preserve its server-owned wallet and HOLD / BOOST lifecycle.
In-game audio and published promo audio have separate attribution records.

[Shared in-game rules](apps/web-client/src/app/game-rules.ts) ·
[Client modules](apps/web-client/src/games) ·
[Game audio provenance](apps/web-client/public/assets/sounds/original/provenance.json) ·
[X7 artwork provenance](apps/web-client/public/assets/images/x7-club/art-provenance.json)

## Run locally

### All five games with Bun

Requires **Bun 1.3.13**. Go, Docker and RabbitMQ are optional for this mode.

```bash
git clone https://github.com/lilter96/tgslots.git
cd tgslots
bun install --frozen-lockfile
bun run dev:all
```

| Service               | Local URL                     |
| --------------------- | ----------------------------- |
| Game client / library | http://localhost:3002         |
| Marketing frontend    | http://localhost:3004         |
| Shared API            | http://localhost:3001         |
| API documentation     | http://localhost:3001/swagger |

Open an individual game with `http://localhost:3002/?game=<id>`, using
`ancient-dragon`, `woodland-whisper`, `le-militare` or `x7-club`.
The shared API defaults to `X7_BACKEND=bun`.

To run services separately, use `bun run dev:api`, `bun run dev:client` and
`bun run dev:marketing` in separate terminals.

### X7 with Go + RabbitMQ

Also requires **Go 1.26.4**, **Docker** and **Docker Compose**.

```bash
bun run dev:x7
```

This starts RabbitMQ, the Go server, the TypeScript math worker, the shared API,
the game client and the marketing frontend. The Go server defaults to
`127.0.0.1:3003`; the browser URLs stay the same.

To connect the shared API to an already running Go/worker/broker stack:

```bash
X7_BACKEND=go-rabbit \
X7_SERVER_URL=http://127.0.0.1:3003 \
bun run dev:api
```

### Environment settings

| Variable               | Read by                 | Purpose / default                                                   |
| ---------------------- | ----------------------- | ------------------------------------------------------------------- |
| `X7_BACKEND`           | Shared API              | `bun` (default) or `go-rabbit`; invalid values fail startup         |
| `X7_SERVER_URL`        | Shared API              | Go upstream URL; default `http://127.0.0.1:3003`                    |
| `PORT`                 | Shared API              | HTTP port; default `3001`                                           |
| `VITE_API_URL`         | Client build / dev      | Public API base URL; empty uses same-origin `/game` requests        |
| `API_PROXY_URL`        | Vite dev server         | Shared API target; default `http://localhost:3001`                  |
| `X7_PROXY_URL`         | Vite dev server         | Optional X7-specific override; otherwise uses the shared API target |
| `VITE_GAME_CLIENT_URL` | Marketing build / dev   | Client URL for game launch; default `http://localhost:3002`         |
| `RABBITMQ_URL`         | Go server + math worker | Broker URL; standalone default `amqp://x7:x7-demo@127.0.0.1:5672`   |
| `X7_MATH_QUEUE`        | Go server + math worker | RPC queue; default `x7.math.v1`                                     |
| `X7_LISTEN_ADDR`       | Go server               | HTTP bind address; standalone default `127.0.0.1:3003`              |

`dev:x7` also supports `X7_HTTP_PORT`, `X7_AMQP_PORT`, `X7_MANAGEMENT_PORT`,
`X7_API_PORT`, `X7_CLIENT_PORT` and `X7_MARKETING_PORT` for port overrides.
Backend selection happens on the shared API; a client pointing to that API does
not need rebuilding to switch modes. Restarting or switching backends expires its
in-memory sessions.

### Verification and builds

```bash
bun run validate
bun run build
bun run x7:check

# With the simple Bun API running:
X7_SMOKE_URL=http://127.0.0.1:3001 bun run x7:smoke

# With the Go stack running:
bun run x7:smoke
```

### Reproduce simulations

Use the unified CLI from `apps/simulations`. Small runs are useful for inspecting
feature lifecycles; statistical verification needs substantially larger samples.

```bash
cd apps/simulations

# Seeded ordinary rounds and an HTML report
bun run main.ts --game woodland-whisper --spins 1000 --workers 1 --seed 777 --visualize

# Le Militare mode comparison
bun run main.ts --game le-militare --game-mode siege --spins 1000 --workers 1 --seed 777

# X7: normal rounds and purchased features are measured separately
bun run main.ts --game x7-club --spins 1000 --workers 1 --seed 777
bun run main.ts --game x7-club --game-mode buy --spins 1000 --workers 1 --seed 777
```

Independent analytical verification, from the repository root:

```bash
python3 scripts/verify-woodland-math.py
```

The [`X7 audit script`](scripts/x7-audit.ts) reproduces its stored large-sample
report. The [`Le Militare audit`](packages/games/le-militare/scripts/math-audit.ts)
runs the actual game engine on held-out seeds with per-mode purchase and accounting checks.
Both are longer-running verification jobs, separate from the small examples above.

## Engineering decisions and authorship

The repository records decisions about the
[type-safe dispatcher](memory/decisions/decision_006_api_dispatcher_architecture.md),
[client plugin architecture](memory/decisions/decision_007_web_client_plugin_architecture.md),
[cluster and cascade evaluation](memory/decisions/decision_005_cluster_pays_and_super_cascades.md),
and [integer payouts / Air Raid](memory/decisions/decision_009_le_militare_air_raid_and_integer_payouts.md).
[Contributor instructions](AGENTS.md) document RNG discipline, serialization,
test harness usage and verification requirements.

Development includes AI-assisted implementation. Architecture, constraints,
verification and final review remain my responsibility. Git history retains
contributor attribution; asset provenance is recorded alongside the assets.

## Scope

A personal portfolio project with virtual credits and in-memory sessions.
Durable wallet accounting, multi-instance shared state and real-money operator
integration are not implemented. Mathematical checks and recorded gameplay
establish the documented demo behaviour, not regulatory certification or a
production guarantee.

The portfolio can host video on GitHub Pages. The interactive client currently
requires a running Bun API, with the optional Go/RabbitMQ services for X7;
static hosting alone does not run either backend. Browser-only play on Pages is
not implemented yet.

No open-source license has been added; public visibility alone does not grant
reuse rights.
