# X7 Club verification — 2026-10-08

The original Go integration checks below were verified against commit `8644ab9`,
with Go 1.26.4 and Bun 1.3.13. Checks for the subsequent selectable backend are
recorded separately in the final section.

X7 supports `X7_BACKEND=bun` (default, in-process execution in the shared API) and `X7_BACKEND=go-rabbit` (Go HTTP sessions and wallet, TypeScript mathematics over RabbitMQ). Both modes use the same seeded math executor and HTTP contract. The PixiJS client renders authoritative results from the selected server. Backend selection never changes the mathematical configuration or automatically falls back after a service failure.

## Checks performed

- `bun run validate`: typechecking and lint passed; **785 tests passed, 0 failed**.
- `go test -race -count=1 -v ./...` in `apps/x7-server`: **7 tests passed**, no races reported. Covered concurrent duplicate requests, ambiguous/lost replies, pending-operation resolution, stale revisions, invalid input/replies and bonus boundaries.
- `bun scripts/x7-config.ts --check`: generated Go costs match the game configuration.
- `X7_SMOKE_URL=http://127.0.0.1:3303 bun scripts/x7-smoke.ts`: real Go/RabbitMQ/worker integration passed; a repeated request returned the same result with one wallet debit.
- An additional local API check used **8 concurrent sessions**, **160 paid base rounds**, **8 bought bonuses**, **292 unique commands** and simultaneous duplicates of every command. All balances and revision increments matched; **33 booster actions** were exercised. Bonuses terminated; stale revisions returned HTTP 409 without changing the wallet. Observed paired-request median was 6.23 ms, p95 8.55 ms on this local setup. These timings are not a production load benchmark.
- A complete real browser bonus was recorded at normal speed with no API or browser errors.

## Scope

This establishes a working portfolio/demo integration, not production readiness. Sessions, wallet balances and idempotency history are in memory and are lost when the selected API process restarts. Durable accounting and multi-instance shared state are not implemented. Race checks and the bounded integration run do not establish behavior for every possible load or outage.

## Backend selection verification

Validation of the selectable backend on 2026-10-08:

- `bun run validate`: typechecking and lint passed; **792 tests passed, 0 failed**.
- `bun run x7:check`: generated Go configuration matched; Go race checks passed.
- The web-client production build passed with the shared API proxy configuration.
- The live smoke script passed through two temporary instances of the complete
  Bun API, one with `X7_BACKEND=bun` and one with `X7_BACKEND=go-rabbit` connected
  to the running Go/RabbitMQ stack. Both finished bonuses and verified duplicate
  responses, wallet accounting and revisions.
- Ancient Dragon, Woodland Whisper and Le Militare each passed state + spin HTTP
  checks on both complete API instances.

The HTTP integration tests in `apps/api/src/__tests__/x7-club.test.ts` cover:

- A seeded local spin matches the shared game state machine exactly.
- Eight concurrent duplicate requests return an identical snapshot and one debit.
- A complete bought bonus matches seeded transitions, including column boosters,
  preserves the triggering stake and credits the final award once.
- Invalid payloads, insufficient credits and stale revisions leave balances unchanged.
- Cached snapshots cannot mutate state; expired sessions return 404.
- Replays outside the 256-command cache cannot execute again.
- The Go proxy preserves request identities and upstream error statuses; an
  unavailable Go server returns 503 rather than silently creating a local session.

Run `bun test apps/api/src/__tests__/x7-club.test.ts` for this coverage. Both modes
retain in-memory demo sessions only. A backend restart or switch expires sessions;
this is not a durable wallet or production persistence implementation.
