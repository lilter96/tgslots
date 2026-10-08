# Nine Lives

Original comic horror cat slot. Independent development checkout: `tgslots-nine-lives`, branch `feat/nine-lives`. Based on TGSlots master `8644ab9`. Art reference: the supplied charcoal/ivory/red comic of a cat Reaper in a casino.

## Approved mechanics

The user selected 6×5 cluster cascades, nine free spins, a Reaper collector, high volatility and a mathematically priced bonus purchase.

Groups of five or more matching symbols connected orthogonally pay. The shared cluster evaluator uses exclusive Wild claiming: one Wild belongs to only one symbol's cluster in an evaluation. All-Wild groups alone do not pay. Paying symbols vanish and the common cascade engine applies gravity and refills. The multiplier begins at 1, increments after every winning cascade, and caps at 25. A paid-spin multiplier resets each round. Cascades end on a losing grid or after 30 winning steps.

Four or more hourglass scatters on the initial paid-spin grid award exactly nine free spins. Scatters do not appear in refill and there are no retriggers. The bonus starts at ×1 and retains its cascade multiplier across the nine lives. At the beginning of each free spin the Reaper collects all initially drawn paw chips once, at the multiplier carried into that life. The chips become consumable Wild for that spin. They do not remain pinned between lives, and base-game chips do not award credits.

Prizes are 1×, 2×, 5×, 10×, 50× or 250× original stake before the collector multiplier. All paytable values and awards are integer credits. The total round cap is 9,999× the original stake including any triggering paid-spin win. Reaching it ends the bonus immediately. Bonus purchase costs 240× the original stake; payouts retain that original stake.

The canonical configuration is `packages/games/nine-lives/config/config.json`. Measured RTP, uncertainty, seeds, actual cost denominators and configuration SHA-256 are stored alongside it in `math-audit.json`. The committed Bun run contains 10 million base rounds and 1 million purchases: base 97.3574% (95% interval 96.0895–98.6253%), purchase 96.0103% (95% interval 95.6922–96.3284%). The target is 96%, with a 1.5 percentage point Monte Carlo comparison tolerance. A Monte Carlo estimate is not an analytical RTP proof. `nine-lives:check` refuses a stale audit.

## Shared architecture

- Math: module-level `Sampler` constants from `@tgslots/math`, common `createClusterSlotEngine`, `createCascadeSampler`, `BaseScatterEngine`, `Wager` and `BetConfiguration` from `slots-core`.
- Common cascade `captureGrids` option produces independent before/after snapshots through `snapshotGrid`. Existing games leave capture disabled. Both the sampler and synchronous cascade API support it.
- Generic `collectCashPrizes` belongs in `slots-core`; Nine Lives supplies the Reaper presentation and the feature rules.
- `NineLivesMachine` implements the existing `StateMachine` contract. Only its spin/next boundaries consume raw RNG. The same math runs in the Bun API, tests and the common simulation runner.
- Gameplay tests use `SlotsTestEngine`. CLI and parallel workers use the existing modern collector, metrics and runner. Purchase mode uses its actual 240× denominator without multiplying the original payout stake.
- `NineLivesModule` implements the existing `IGameModule` contract and is registered in `apps/api/src/index.ts`, alongside Woodland Whisper, Ancient Dragon and Le Militare. API and browser declarations extend the canonical shared `GameRegistry`.
- All Nine Lives actions use the existing `/game/:gameId/:action` route and the common `GameServer` / `InMemorySessionManager`. There is no separate Nine Lives HTTP server or session store.
- Modules can opt into a virtual-wallet policy on `IGameModule`. The common dispatcher synchronously commits math state, wallet, revision and cached reply together. Per-session caches retain 256 exact requests; identity reuse and stale revisions reject. State reads do not replay results. The common session manager applies its one-hour idle expiry.
- Browser request identity/reload recovery uses shared `RevisionedGameApi`; X7's API class is now a thin adapter over the same implementation with unchanged storage keys and URL contracts.
- Art loads through `AssetRegistry`. Shared `createReelArt` normalizes logical textures at 3× density for native Pixi Reels pool resets; X7 also uses it. The complete texture map is registered for every identity.
- Pixi Reels performs spins, swaps, spotlight, winner destruction and native gravity refill. Server snapshots determine every target. The client draws no random winning outcome. Shared `WinOverlay` handles announcements and counters.
- Shared lobby, marketing hero/feature components and the typed game registry include Nine Lives. New CSS is scoped to the new game.

Rendering follows [Pixi Reels' native cascade API](https://pixi-reels.schmooky.dev/guides/your-first-cascade/).

## Run and verify

```bash
bun install --frozen-lockfile
bun run dev:nine-lives
# Bun API :3401; client :3402; marketing :3404
bun run nine-lives:smoke
bun run validate
bun run build
bun run nine-lives:check
bun run nine-lives:audit
bun run nine-lives:sim --spins 1000000 --workers 2
bun run nine-lives:sim --spins 1000000 --game-mode buy --workers 2
bun run nine-lives:sim --spins 1000 --visualize

# Container backend using the standard Bun API Dockerfile:
NINE_LIVES_API_PORT=3501 docker compose -p tgslots-nine-lives -f compose.nine-lives.yml up -d --build
```

The standard Bun API evaluates the TypeScript math directly. The focused dev command only selects isolated ports; `dev:api` and `dev:all` expose the same registered module. The standard API Dockerfile and deployment entrypoint serve Nine Lives as well. Audit, smoke and simulation commands use Bun. No separate Node runtime or TypeScript loader is required.

## Visual direction and assets

Thick black contour ink, ivory skulls and bones, charcoal silhouettes, ember-red rim lighting and restrained comic grain. Original cat-Reaper mascot, black cat, fish bones, crossed bones, crimson yarn, midnight candle, hourglass Scatter and paw-chip prize. Transparent prize/cat art and charcoal comic plates for other reel symbols, with a red-moon casino backdrop and Reaper portrait. No purple/gold X7 repaint.

Final raster assets and prompts are recorded in `apps/web-client/public/assets/images/nine-lives/art-provenance.json`. All raster art was generated with the built-in imagegen tool, as authorized by the user; no paid CLI/API fallback was used. Marketing uses the same art. HUD, cabinet borders, particle embers and value labels are code-native presentation layers. Generated prize faces remain blank so authoritative values stay readable.

## Verification evidence

The Bun migration is covered through the generic Elysia route and common dispatcher: module registration and session ownership, original-stake bonus payouts, full nine-life wallet accounting, duplicate commands, stale revisions, insufficient funds, idle expiry, caller isolation and failed math without a partial commit. Verification passed: 805 workspace tests, typecheck/lint, production builds, the standard Bun API Docker image and complete bonus/wallet smoke. Browser checks completed all nine lives and recovered a lost purchase response without a second charge. A fresh Bun run of all 10 million base rounds and 1 million purchases reproduced the previous audit payouts exactly.
