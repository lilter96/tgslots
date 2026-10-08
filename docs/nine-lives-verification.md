# Nine Lives — verification and review guide

Verified locally on 2026-10-08 against integration commit `1585b1f`, with a
compact-desktop CSS adjustment and a corrected Bun dev-command ordering.

## Runtime and visual contract

Nine Lives is registered in the common Bun/Elysia GameServer. Shared cluster,
cascade and cash-prize primitives generate the results; the client animates
server snapshots using native Pixi Reels. It uses the shared revisioned session
client, one-hour idle session manager and demo-wallet mutation policy.

For a quick review, read the [game specification](../memory/nine-lives-gdd.md),
trace [machine.ts](../packages/games/nine-lives/src/machine.ts), then compare
[launch.ts](../apps/web-client/src/games/nine-lives/launch.ts) with the result
snapshots. Bonus chips become consumable WILDs, not persistent locked symbols.

## Checks performed

- `bun run validate`: typechecks, ESLint, **812 passing workspace tests**, no failures.
- `nine-lives:smoke` against the common API: 240× purchase, complete nine-spin
  bonus, wallet accounting and exact replay without a second purchase debit.
- `nine-lives:check`: stored configuration SHA-256 matches; sampled RTP is
  inside the configured comparison tolerance.
- Browser layout at 1440×900, 1280×720, 390×844 and 320×740: no horizontal
  overflow or page errors; reachable spin controls, normal speed, sound off.
  A compact desktop layout keeps the Reaper visible at 720px height.

## Mathematics: sampled estimates and limits

Stored audit: [math-audit.json](../packages/games/nine-lives/config/math-audit.json).
Configuration SHA-256:
`315b8589749359b42ecc2b91c56c72dbeb61703f1fd3e495a6987c55c34dcce4`.

| Sample | Complete rounds | Estimated RTP | Approximate 95% interval |
| --- | ---: | ---: | --- |
| Normal paid rounds | 10,000,000 | 97.357373% | 96.089493–98.625253% |
| Purchased bonuses | 1,000,000 | 96.010293% | 95.6922–96.3284% |

The purchase denominator is its **240× entry cost**, while awards use the
original stake. Workers use deterministic seeds and exclude warmup. The audit
executes the shared mathematical engine; it is not an independent evaluator.
The normal-round 95% interval excludes the 96% design target. A passing
1.5-percentage-point tolerance check does not resolve that discrepancy,
guarantee exact target return or establish rare-event probabilities.

The API uses ephemeral demo balances and sessions, not durable financial
accounting. Game footage is prepared for visual approval before promo montage;
the earlier published four-game film does not contain Nine Lives.
