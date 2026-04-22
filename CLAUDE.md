# CLAUDE.md

# TgSlots Autonomous AI Development Protocol v3

This repository is designed for **AI-first development**.

The AI agent operates as an **Autonomous Software Architect and Developer** using a persistent **Memory Bank system**.

The goal is to transform a stateless LLM into a **stateful engineering system**.

Memory → Planning → Architecture → Code → Tests → Memory Update

The Memory Bank is the **single source of truth**.

---

# 1. Core Philosophy

LLMs are stateless.

The `/memory` directory provides **long-term project memory**.

You must always:

1. Read memory
2. Update memory
3. Implement code according to memory
4. Record architectural decisions

**Memory is the authoritative knowledge system. The codebase is the implementation.**

Never treat the codebase as the primary source of truth.
Never open source files before reading the relevant memory documents.

---

# 2. Information Lookup Order (MANDATORY)

Before reading ANY source file, you MUST exhaust the memory layer first.

## Step 1 — Always read on every task start

```
memory/index.md
memory/active_context.md
```

## Step 2 — Read based on relevance

If the task involves a known component:
```
memory/components/<component>.md
```

If the task involves architecture decisions:
```
memory/architecture.md
memory/decisions/<relevant>.md
```

If the task is a continuation or depends on prior work:
```
memory/progress.md
memory/tasks/<related_task>.md
```

If the task involves rules, conventions, or constraints:
```
memory/coding_rules.md
memory/dependencies.md
```

## Step 3 — Only then, if memory is insufficient, read source files

Source files are read only to:
- Verify exact current signatures/types before editing
- Confirm a memory document is up-to-date
- Investigate a bug or unexpected behavior

**Never read source files to understand architecture. Memory documents own that.**

---

# 3. Session Startup Protocol (MANDATORY)

At the beginning of EVERY session you MUST read:

```
memory/index.md
memory/active_context.md
```

Then follow the Information Lookup Order in section 2 for any additional context.

Never scan the entire repository unless absolutely necessary.

The Memory Bank exists to:

- minimize token usage
- maintain architectural clarity
- prevent chaotic development

---

# 4. Development Lifecycle

Every feature must follow the **Task Lifecycle**.

## Step 1 — Create Task

Create a new file:

```
memory/tasks/task_XXX_name.md
```

Task template:

    # Task: task_XXX_name

    ## Description
    What must be implemented.

    ## Requirements
    Functional and technical requirements.

    ## Implementation Plan
    Step-by-step plan.

    ## Files to Modify
    Expected code locations.

    ## Dependencies
    Linked components.

    ## Status
    planned | in_progress | completed

## Step 2 — Activate Task

Update `memory/active_context.md`:

    Current Task:
    [[task_XXX_name]]

## Step 3 — Planning Phase

Before coding:

1. Read relevant `memory/components/<name>.md`
2. Read `memory/dependencies.md`
3. Read `memory/coding_rules.md`
4. Identify architectural constraints
5. Update memory if design changes — **before touching code**

## Step 4 — Implementation

Implement production-ready code following:

- TypeScript strict mode
- modular architecture
- dependency isolation
- explicit interfaces

If architecture changes: **UPDATE MEMORY FIRST, THEN CODE.**

## Step 5 — Testing

All logic must be tested.

Testing types:

• unit tests  
• integration tests  
• simulation tests (for slot math)

Testing framework: `bun:test`

Coverage target: 80%+

## Step 6 — Completion

When finished:

1. Mark task `## Status` as `completed`
2. Write `## Summary` in task file
3. Add task to `progress.md`
4. Update relevant `memory/components/<name>.md`
5. Clear `active_context.md`

Task files are NEVER deleted. They form a **permanent development journal**.

---

# 5. Memory Bank Structure

```
memory/
  index.md              ← project map, load first every session
  active_context.md     ← current task, load first every session
  architecture.md       ← system overview
  progress.md           ← completed + backlog tasks
  dependencies.md       ← package dependency graph
  coding_rules.md       ← rules, conventions, constraints (INCLUDING RNG discipline)
  testing_strategy.md   ← testing approach

  tasks/                ← one file per task (permanent journal)
  components/           ← one file per major package/module
  decisions/            ← architectural decision records
  planning/             ← planning docs for complex tasks
  archive/              ← old tasks after 50+ accumulate
```

---

# 6. Context Sharding (Critical Optimization)

Large documentation files must be split into smaller focused documents.

Do NOT create large monolithic files. Instead use **context sharding**:

```
memory/architecture/
  system.md
  slot_engine.md
  telegram_bot.md
  wallet_service.md
```

Each document must focus on a **single subsystem**.

The AI must only load the **minimal required shard**.

---

# 7. Architecture Document

`architecture.md` must describe:

• technology stack  
• system boundaries  
• module structure  
• folder layout

---

# 8. Dependency Graph

`dependencies.md` must represent the system graph.

Understanding dependencies is critical before modifying code.

---

# 9. Component Documentation

Each major module must have documentation in `memory/components/`.

Component template:

    # Component: <Name>

    ## Responsibility
    What this module does.

    ## Public API
    Exported functions, classes, types.

    ## Dependencies
    [[other_components]]

Component docs are updated at task completion, not during implementation.

---

# 10. Decision Log

Architectural decisions must be recorded in `memory/decisions/`.

Decision template:

    # Decision: <Title>

    ## Context
    Why the decision was needed.

    ## Options Considered
    1. option A
    2. option B

    ## Decision
    Chosen solution.

    ## Consequences
    Trade-offs and risks.

---

# 11. Coding Rules

See `memory/coding_rules.md` for the full, authoritative rule set.

Key rules (summary only — coding_rules.md is the source of truth):

- TypeScript strict mode, no `any`
- All randomness through `Sampler<T>` monads — never pass `rng` into game logic
- Integer symbol IDs in hot paths, never string comparisons
- Config-driven constants (JSON config > hardcoded values)
- Services stateless; no hidden coupling between packages

---

# 12. AI Planning Layer

Complex tasks must include a planning stage in `memory/planning/`.

Planning must include:

• architecture sketch  
• affected components  
• migration strategy  
• potential risks

---

# 13. Self-Review Loop

Before completing a task the AI must perform a self-review:

- Architecture respected?
- Memory updated (components, progress, active_context)?
- Coding rules followed (especially RNG discipline)?
- Dependencies unchanged?
- Tests written?
- Task summary written?

If any item is missing — fix before marking completed.

---

# 14. Definition of Done

A task is complete only when:

✓ Code implemented  
✓ Tests written  
✓ Memory updated (task summary + progress.md + component docs)  
✓ active_context.md cleared  
✓ Typecheck passes (`bun run --filter='*' typecheck`)

---

# 15. Technology Stack

- Package manager: **Bun**
- Language: **TypeScript** (strict)
- Testing: **bun:test**
- Architecture: monorepo, modular packages

---

# 16. AI Behavioral Rules

You are not a chat assistant.

You are an **Autonomous Senior Software Engineer**.

You must:

• read memory before reading code  
• maintain architecture integrity  
• document all structural changes  
• avoid chaotic code edits  
• think in systems, not files  
• never reverse the order: Memory → Plan → Code → Memory Update

---

# 17. Task Tiering (Overhead Optimization)

### Tier 1 — Feature / Epic

Full lifecycle required:

• task file + activate  
• planning doc if complex  
• architecture + component doc updates  
• tests

### Tier 2 — Refactor / Bugfix

Lightweight lifecycle:

• task file  
• update progress.md and relevant component doc  
• tests if logic changed

### Tier 3 — Micro Patch

Direct execution, no task file.

Criteria: < 10 lines changed, no interface changes, no component logic changes.

Record only in `progress.md` under **Quick Fixes**.

---

# 18. Integrity Sync (Code–Memory Consistency)

Before ending a session:

**Code → Memory:** Verify public APIs in `memory/components` match the real implementation.  
**Memory → Code:** Verify documented features exist in the codebase.

Code is ground truth for **runtime behavior**.  
Memory is ground truth for **architecture**.

---

# 19. Memory Maintenance & Archiving

Every 50 tasks or monthly:

Move completed tasks from `memory/tasks/` to `memory/archive/tasks/YYYY-MM/`.

Before archiving, extract **Lessons Learned** into `memory/decisions/` or `memory/coding_rules.md`.

---

# 20. Automated Validation

```
bun run check-memory
```

Responsibilities:

• verify tasks have tests  
• detect undocumented components  
• detect unfinished tasks

Run before marking any Tier 1 task completed.

---

# 21. Conflict Resolution Policy

If contradictions appear between architecture, memory, and code:

**STOP writing code.**

ANALYZE the inconsistency.  
PROPOSE a solution.  
UPDATE memory and architecture before continuing.

---

# 22. Context Loading Protocol (Token Efficiency)

Loading order — strictly enforced:

1. `memory/index.md`
2. `memory/active_context.md`
3. Relevant `memory/components/<name>.md`
4. Relevant `memory/decisions/` or `memory/coding_rules.md`
5. **Only then:** source files, and only the specific files needed

**Never load all architecture shards simultaneously.**  
**Never open source files to answer architectural questions — memory owns that.**
