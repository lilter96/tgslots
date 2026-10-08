# Nine Lives

Original comic horror cat slot. Independent development checkout: `tgslots-nine-lives`, branch `feat/nine-lives`. Based on TGSlots master `8644ab9`. Art reference: the supplied charcoal/ivory/red comic of a cat Reaper in a casino.

## Approved mechanics

The user selected 6×5 cluster cascades, nine free spins, a Reaper collector, high volatility and a mathematically priced bonus purchase.

Groups of five or more matching symbols connected orthogonally pay. The shared cluster evaluator uses exclusive Wild claiming: one Wild belongs to only one symbol's cluster in an evaluation. All-Wild groups alone do not pay. Paying symbols vanish and the common cascade engine applies gravity and refills. The multiplier begins at 1, increments after every winning cascade, and caps at 25. A paid-spin multiplier resets each round. Cascades end on a losing grid or after 30 winning steps.

Four or more hourglass scatters on the initial paid-spin grid award exactly nine free spins. Scatters do not appear in refill and there are no retriggers. The bonus starts at ×1 and retains its cascade multiplier across the nine lives. At the beginning of each free spin the Reaper collects all initially drawn paw chips once, at the multiplier carried into that life. The chips become consumable Wild for that spin. They do not remain pinned between lives, and base-game chips do not award credits.

Prizes are 1×, 2×, 5×, 10×, 50× or 250× original stake before the collector multiplier. All paytable values and awards are integer credits. The total round cap is 9,999× the original stake including any triggering paid-spin win. Reaching it ends the bonus immediately. Bonus purchase costs 240× the original stake; payouts retain that original stake.

The canonical configuration is `packages/games/nine-lives/config/config.json`. Measured RTP, uncertainty, seeds, actual cost denominators and configuration SHA-256 are stored alongside it in `math-audit.json`. The committed Node run contains 10 million base rounds and 1 million purchases: base 97.3574% (95% interval 96.0895–98.6253%), purchase 96.0103% (95% interval 95.6922–96.3284%). The target is 96%, with a 1.5 percentage point Monte Carlo comparison tolerance. A Monte Carlo estimate is not an analytical RTP proof. `nine-lives:check` refuses a stale audit.

## Shared architecture

- Math: module-level `Sampler` constants from `@tgslots/math`, common `createClusterSlotEngine`, `createCascadeSampler`, `BaseScatterEngine`, `Wager` and `BetConfiguration` from `slots-core`.
- Common cascade `captureGrids` option produces independent before/after snapshots through `snapshotGrid`. Existing games leave capture disabled. Both the sampler and synchronous cascade API support it.
- Generic `collectCashPrizes` belongs in `slots-core`; Nine Lives supplies the Reaper presentation and the feature rules.
- `NineLivesMachine` implements the existing `StateMachine` contract. Only its spin/next boundaries consume raw RNG. The same math runs under Node, Bun tests and the common simulation runner.
- Gameplay tests use `SlotsTestEngine`. CLI and parallel workers use the existing modern collector, metrics and runner. Purchase mode uses its actual 240× denominator without multiplying the original payout stake.
- Node HTTP transport is `apps/api/src/node.ts`. It reuses the existing dispatcher/modules for older games, handles Nine Lives directly, and can proxy X7's Go service. The Bun/Elysia entry also exposes Nine Lives.
- Generic `RevisionedSessionServer` lives in `packages/slots-server`. A synchronous boundary commits state, wallet, revision and cached response together. Per-session idempotency caches 256 exact requests; stale revisions or identity reuse with changed commands reject. Wallet, state and caches remain in memory, with one-hour idle expiry and a 5,000-session bound.
- Browser request identity/reload recovery uses shared `RevisionedGameApi`; X7's API class is now a thin adapter over the same implementation with unchanged storage keys and URL contracts.
- Art loads through `AssetRegistry`. Shared `createReelArt` normalizes logical textures at 3× density for native Pixi Reels pool resets; X7 also uses it. The complete texture map is registered for every identity.
- Pixi Reels performs spins, swaps, spotlight, winner destruction and native gravity refill. Server snapshots determine every target. The client draws no random winning outcome. Shared `WinOverlay` handles announcements and counters.
- Shared lobby, marketing hero/feature components and the typed game registry include Nine Lives. New CSS is scoped to the new game.

Node executes TypeScript via [tsx's registration API](https://tsx.is/dev-api/). The native Node worker bootstrap registers `tsx/esm/api` before importing the TypeScript simulation worker. Rendering follows [Pixi Reels' native cascade API](https://pixi-reels.schmooky.dev/guides/your-first-cascade/).

## Run and verify

```bash
bun install --frozen-lockfile
bun run dev:nine-lives
# Node API :3401; client :3402; marketing :3404
bun run nine-lives:smoke
bun run validate
bun run build
bun run nine-lives:check
bun run nine-lives:audit
bun run nine-lives:sim --spins 1000000 --workers 2
bun run nine-lives:sim --spins 1000000 --game-mode buy --workers 2
bun run nine-lives:sim --spins 1000 --visualize

# Container backend, alternative to the host Node process:
NINE_LIVES_API_PORT=3501 docker compose -p tgslots-nine-lives -f compose.nine-lives.yml up -d --build
```

Node runs the new server and mathematical core; Bun remains the monorepo's dependency manager/test runner. No Go, RabbitMQ or Kafka is required for Nine Lives. Its server evaluates the existing pure TypeScript math directly, avoiding a broker hop for this configuration.

## Visual direction and assets

Thick black contour ink, ivory skulls and bones, charcoal silhouettes, ember-red rim lighting and restrained comic grain. Original cat-Reaper mascot, black cat, fish bones, crossed bones, crimson yarn, midnight candle, hourglass Scatter and paw-chip prize. Transparent prize/cat art and charcoal comic plates for other reel symbols, with a red-moon casino backdrop and Reaper portrait. No purple/gold X7 repaint.

Final raster assets and prompts are recorded in `apps/web-client/public/assets/images/nine-lives/art-provenance.json`. All raster art was generated with the built-in imagegen tool, as authorized by the user; no paid CLI/API fallback was used. Marketing uses the same art. HUD, cabinet borders, particle embers and value labels are code-native presentation layers. Generated prize faces remain blank so authoritative values stay readable.

## Verification evidence

- `bun run validate`: 803 passing tests, zero failures, including shared math, session idempotency, captured cascades and packaged artwork.
- `bun run build` and `bun run x7:check` passed; the Node math audit matches the committed configuration.
- Native Node and the Node 22 Docker image both passed the complete purchase/9-life/wallet smoke test.
- Browser checks exercised native spins, coin-to-Wild swaps, cascades and all nine free spins. A lost purchase response was deliberately aborted after server commit, then recovered on reload with the same revision and a single charge.
- Layout checks at 390×844, 360×780, 320×740 and 1366×768 showed no horizontal overflow and visible spin controls. The shared lobby, marketing library and Nine Lives promo route render; the three older Node games load through the new transport. X7 also renders and completes a spin after the shared client extraction.
