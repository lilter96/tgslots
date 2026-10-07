# X7 Club verification — 2026-10-08

Verified against commit `8644ab9`, with Go 1.26.4 and Bun 1.3.13.

X7 uses a Go HTTP server for demo sessions, wallet accounting, revisions and idempotent actions. Seeded game mathematics run in a TypeScript worker through RabbitMQ request/reply. The PixiJS client renders the authoritative results.

## Checks performed

- `bun run validate`: typechecking and lint passed; **785 tests passed, 0 failed**.
- `go test -race -count=1 -v ./...` in `apps/x7-server`: **7 tests passed**, no races reported. Covered concurrent duplicate requests, ambiguous/lost replies, pending-operation resolution, stale revisions, invalid input/replies and bonus boundaries.
- `bun scripts/x7-config.ts --check`: generated Go costs match the game configuration.
- `X7_SMOKE_URL=http://127.0.0.1:3303 bun scripts/x7-smoke.ts`: real Go/RabbitMQ/worker integration passed; a repeated request returned the same result with one wallet debit.
- An additional local API check used **8 concurrent sessions**, **160 paid base rounds**, **8 bought bonuses**, **292 unique commands** and simultaneous duplicates of every command. All balances and revision increments matched; **33 booster actions** were exercised. Bonuses terminated; stale revisions returned HTTP 409 without changing the wallet. Observed paired-request median was 6.23 ms, p95 8.55 ms on this local setup. These timings are not a production load benchmark.
- A complete real browser bonus was recorded at normal speed with no API or browser errors.

## Scope

This establishes a working portfolio/demo integration, not production readiness. Sessions, wallet balances and idempotency history are in memory and are lost when the Go process restarts. Durable accounting and multi-instance shared state are not implemented. Race checks and the bounded integration run do not establish behavior for every possible load or outage.
