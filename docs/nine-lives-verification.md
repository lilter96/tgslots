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


## High-resolution capture verification

Two complete bonus sessions were captured at normal speed with sound disabled,
using all available CPU threads (0–19) at normal process priority. Both sessions
completed nine free spins with zero API or browser errors.

| Capture | Resolution | Average native captured FPS | Frame-gap p95 | Export |
| --- | --- | ---: | ---: | --- |
| Detail | 3840×2160 | 52.44 | 24 ms | H.264, 60 fps |
| Motion | 2560×1440 | 76.97 | 18 ms | H.264, 120 fps |

Exports use NVIDIA NVENC with quality preset p7 / CQ 14. Export frame rates
include timestamp-preserving holds; they are not claims of 60 or 120 distinct
source frames every second. There is no optical-flow interpolation, time
compression or game audio. These are full-session averages, including idle
periods, not guaranteed minimum motion rates.

The high-resolution footage is awaiting the owner's quality approval before
promo montage. The earlier published four-game reel remains available.


## Published media

Source, music and montage approved by the owner on 2026-10-08.
[Portfolio player](https://lilter96.github.io/portfolio/#showreel) hosts a
30.25-second 2560×1440 / 120 FPS landscape promo, a 2160×2700 / 60 FPS
LinkedIn edit and a silent 100.367-second gameplay recording. Web copies use
constrained bitrate for loading; the [release](https://github.com/lilter96/tgslots/releases/tag/nine-lives-media-2026-10-08)
preserves the original capture and full-quality promo masters. Native captured
FPS is approximately 76.971; 120 FPS describes the export, with no interpolation
or retiming. The record completed all nine bonus spins with no captured API or
page errors. This is capture evidence, not a claim of exhaustive bug absence.

Promo audio is exclusively Deadly Roulette by Kevin MacLeod (incompetech.com),
CC BY 4.0, edited and faded. No game audio or added sound effects are included.
The overall five-game reel preserves the earlier four native 720p captures.
