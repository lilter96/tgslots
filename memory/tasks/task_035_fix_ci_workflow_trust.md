---
title: "Fix CI Workflow Trust"
type: "task"
tags: 
- "memory"
- "task"
- "ci"
status: "completed"
task_id: "035"
up: 
- "[[index]]"
---
# task_035_fix_ci_workflow_trust

## Objective
Fix the GitHub Actions hanging on interactive trust prompts by adding `trust_workspace` and `trust_extensions` flags to the `run-gemini-cli` action in all workflows.

## Key Files & Context
- `.github/workflows/gemini-review.yml`
- `.github/workflows/gemini-triage.yml`
- `.github/workflows/gemini-invoke.yml`
- `.github/workflows/gemini-plan-execute.yml`
- `.github/workflows/gemini-scheduled-triage.yml`

## Findings
- Gemini CLI v0.39.1+ requires explicit trust for workspaces and extensions in non-interactive (headless) environments.
- Workflows were hanging because the CLI was waiting for a "Yes" input on terminal that wasn't possible in CI.

## Completed Work
- [x] Added `trust_workspace: 'true'` to all five Gemini workflows.
- [x] Added `trust_extensions: 'true'` to `gemini-review.yml` (required for the code-review extension).
- [x] Updated memory bank with task documentation.

## Verification
- Monitor the next CI run to confirm the "Do you want to trust this workspace?" prompt is bypassed.
