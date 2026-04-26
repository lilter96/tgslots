# Repository Guidelines

## Project Structure & Module Organization
`tgslots` is a Bun-based TypeScript monorepo. Shared logic lives in `packages/`: `math`, `slots-core`, and `slots-simulation-engine`. Game packages live in `packages/games/ancient-dragon` and `packages/games/woodland-whisper`. CLI entrypoints and workers live in `apps/simulations`. Long-term project context lives in `memory/`.

## Memory-First Workflow
Before reading source for any non-trivial task, load `memory/index.md` and `memory/active_context.md`, then only the relevant component, rules, dependency, architecture, or decision docs. For larger changes, create or update a task file in `memory/tasks/`, keep `memory/active_context.md` current, and record completed work in `memory/progress.md`.

## Memory Update Rules
Treat memory as architectural truth and keep it synchronized with code. Update every affected memory file in the same change:

- `memory/tasks/*.md`: create or advance the task record, then add a summary at completion.
- `memory/active_context.md` and `memory/progress.md`: keep current task state and completion history accurate.
- `memory/components/*.md`: update any module whose responsibility, API, or behavior changed.
- `memory/architecture.md`, `memory/dependencies.md`, `memory/decisions/*.md`: update when structure, package relationships, or decisions change.
- `memory/coding_rules.md` and `memory/testing_strategy.md`: update when conventions, validation, or test policy changes.

## Obsidian Vault Conventions
`memory/` is an Obsidian vault, not plain Markdown notes. Preserve each note's YAML frontmatter, including `title`, `type`, `tags`, `aliases`, and `up`, plus note-specific fields such as `status`, `task_id`, `component`, `decision_id`, or `current_task`. Prefer `[[wikilinks]]` over plain file paths, keep note titles stable so backlinks and aliases stay intact, and update hub notes when adding or renaming memory files.

## Build, Test, and Development Commands
- `bun install`: install workspace dependencies.
- `bun run build`: runs each workspace `build` script and validates TypeScript compilation.
- `bun run typecheck`: checks the root TS graph with `tsc --noEmit`.
- `bun run lint`: runs ESLint across the repo.
- `bun test`: runs Bun tests across packages with test files.
- `bun --filter @tgslots/math test`: run tests for a single workspace.
- `bun --filter @tgslots/simulations run sim -- --game ancient-dragon`: run a simulation from the shared CLI.

## Coding Style & Naming Conventions
Use strict TypeScript. Prettier enforces 2-space indentation, single quotes, trailing commas, no semicolons, and `printWidth: 100`. Keep filenames lowercase and descriptive, for example `game-state-machine.ts`. Avoid `any`; prefix intentionally unused parameters with `_`. Follow `memory/coding_rules.md`: game randomness must flow through `Sampler<T>` abstractions, not ad hoc `rng` plumbing.

## Testing Guidelines
Tests use Bun’s built-in runner via `bun:test`. Existing tests live in `packages/*/src/__tests__/` and use the `*.test.ts` suffix. Add deterministic tests alongside the package you change, especially for math, betting, evaluation, and state-machine logic. Prefer fixed RNG seeds. When slot math changes, include a targeted simulation or verification run. Target 80%+ coverage, with especially strong coverage on deterministic core logic.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commit style such as `fix(games): ...` and `refactor(betting): ...`. Keep the type lowercase and use a focused scope when possible. Pull requests should summarize the change, list affected packages and memory files, link the relevant issue or task, and include `lint`, `typecheck`, test, or simulation results. UI screenshots are generally unnecessary for this repository.
