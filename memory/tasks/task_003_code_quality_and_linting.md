# Task: task_003_code_quality_and_linting

## Description

Set up ESLint and Prettier for the project, and fix all existing TypeScript errors and linting issues across all packages and apps.

## Requirements

- ESLint (Flat Config) with TypeScript support.
- Prettier for consistent formatting.
- Fix all `tsc --noEmit` errors.
- Adhere to the project's `coding_rules.md` (no `any`, strict mode).

## Implementation Plan

### Step 1 — Setup Linting and Formatting

- [x] Install devDependencies at the root: `eslint`, `prettier`, `typescript-eslint`, `eslint-config-prettier`, `eslint-plugin-prettier`.
- [x] Create `eslint.config.js` in the root directory.
- [x] Create `.prettierrc.json` in the root directory.
- [x] Add `lint`, `format`, and `typecheck` scripts to the root `package.json`.

### Step 2 — Identify Issues

- [x] Run `tsc --noEmit` from the root to find all TS errors.
- [x] Run `eslint .` to find all linting issues.

### Step 3 — Fix TypeScript Errors

- [x] Fix identified errors in `@tgslots/math`.
- [x] Fix identified errors in `@tgslots/slots-core`.
- [x] Fix identified errors in `@tgslots/slots-simulation-engine`.
- [x] Fix identified errors in `@tgslots/ancient-dragon`.
- [x] Fix identified errors in `@tgslots/woodland-whisper`.
- [x] Fix identified errors in `apps/simulations`.

### Step 4 — Fix Linting and Format

- [x] Fix identified linting errors.
- [x] Run `prettier --write .` to format all files.

### Step 5 — Verification

- [x] Ensure `tsc --noEmit` passes across the entire project.
- [x] Ensure `eslint .` passes across the entire project.

## Summary
ESLint and Prettier have been configured project-wide. All TypeScript and linting issues were resolved, with specific ignores configured for compiled artifacts. The project now passes all linting and typechecking checks.

## Status

completed

