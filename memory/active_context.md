---
title: Active Context
type: active-context
tags: [memory, context]
up: "[[index]]"
---

# Active Context

## Current focus

Setting up Claude Code for the tgslots monorepo. Configured MCP servers (Playwright, context7, GitHub), project skills (`/gen-test`, `/run-sim`), subagents (code-reviewer, security-reviewer), and hooks (auto-lint on edit, block .env/lock edits).

## Next

- Boot `apps/api` + `apps/web-client` and smoke-test all three games end-to-end
- Expand test coverage in game packages (currently concentrated in math and slots-core)
- Implement Telegram bot integration layer
- Add CI pipeline (GitHub Actions)
