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

Never treat the codebase as the primary source of truth.

**Memory is the authoritative knowledge system.**

---

# 2. Session Startup Protocol (MANDATORY)

At the beginning of EVERY session you MUST read:

memory/index.md
memory/active_context.md

If additional context is required read:

memory/architecture.md
memory/progress.md
memory/dependencies.md

Never scan the entire repository unless absolutely necessary.

The Memory Bank exists to:

- minimize token usage
- maintain architectural clarity
- prevent chaotic development

---

# 3. Development Lifecycle

Every feature must follow the **Task Lifecycle**.

## Step 1 — Create Task

Create a new file:

memory/tasks/task_XXX_name.md

Example:

memory/tasks/task_014_bonus_engine.md

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

---

## Step 2 — Activate Task

Update:

memory/active_context.md

Content must contain only:

    Current Task:
    [[task_XXX_name]]

---

## Step 3 — Planning Phase

Before coding:

1. Review relevant components in `memory/components`
2. Review dependency graph
3. Identify architectural constraints
4. Update memory if design changes

---

## Step 4 — Implementation

Implement production-ready code following:

- TypeScript strict mode
- modular architecture
- dependency isolation
- explicit interfaces

If architecture changes:

UPDATE MEMORY FIRST.

---

## Step 5 — Testing

All logic must be tested.

Testing types:

• unit tests  
• integration tests  
• simulation tests (for slot math)

Testing framework:

bun:test

Coverage target:

80%+

---

## Step 6 — Completion

When finished:

1. Mark task as completed
2. Write summary in task file
3. Add task to progress.md

Example:

    ## Completed Tasks

    * [[task_001_project_setup]]
    * [[task_002_database_schema]]

Task files are NEVER deleted.

They form a **permanent development journal**.

---

# 4. Memory Bank Structure

memory/

index.md
architecture.md
active_context.md
progress.md
dependencies.md
coding_rules.md
testing_strategy.md

tasks/
components/
decisions/
planning/

---

# 4.1 Context Sharding (Critical Optimization)

Large documentation files must be split into smaller focused documents.

Do NOT create large monolithic files such as:

architecture.md (3000+ lines)

Instead use **context sharding**:

memory/architecture/

system.md  
database.md  
telegram_bot.md  
slot_engine.md  
wallet_service.md

Each document must focus on a **single subsystem**.

Benefits:

• reduces token usage  
• improves reasoning accuracy  
• allows the AI to load only the required context  
• prevents unnecessary context pollution

Rule:

The AI must only load the **minimal required shard**.

Example workflow:

1. Read `memory/index.md`
2. Identify relevant subsystem
3. Load only the corresponding shard

Never load all architecture shards unless absolutely necessary.

---

# 5. Project Dashboard (index.md)

Example:

    # TgSlots Project Map

    ## Architecture
    [[architecture]]

    ## Core Components
    [[slot_engine]]
    [[telegram_bot]]
    [[wallet_service]]

    ## Development
    [[active_context]]
    [[progress]]

---

# 6. Architecture Document

architecture.md must describe:

• technology stack  
• system boundaries  
• module structure  
• folder layout

Example structure:

    src/
    bot/
    engine/
    slots/
    services/
    database/
    utils/

---

# 7. Dependency Graph

dependencies.md must represent the system graph.

Example:

    Telegram Bot
    ↓
    Game Controller
    ↓
    Slot Engine
    ↓
    RNG System
    ↓
    Slot Math Model

Understanding dependencies is critical before modifying code.

---

# 8. Component Documentation

Each major module must have documentation.

Location:

memory/components/

Example:

slot_engine.md  
telegram_bot.md  
wallet_service.md

Component template:

    # Component: Slot Engine

    ## Responsibility
    Handles slot game logic.

    ## Public API

    spin()
    calculateWins()
    applyBonus()

    ## Dependencies

    [[rng_system]]
    [[slot_math]]

---

# 9. Decision Log

Architectural decisions must be recorded.

Location:

memory/decisions/

Example:

decision_001_rng_library.md

Decision template:

    # Decision: RNG Library

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

# 10. Coding Rules

TypeScript guidelines:

• strict mode enabled  
• avoid `any`  
• prefer interfaces  
• services must be stateless  
• async/await only  
• dependency injection preferred

Never introduce hidden coupling between modules.

---

# 11. AI Planning Layer

Complex tasks must include a planning stage.

Planning files are stored in:

memory/planning/

Example:

planning_bonus_engine.md

Planning must include:

• architecture sketch  
• affected components  
• migration strategy  
• potential risks

---

# 12. Self-Review Loop

Before completing a task the AI must perform a self-review.

Checklist:

Architecture respected?  
Memory updated?  
Dependencies unchanged?  
Tests written?  
Documentation added?

If not — fix before completion.

---

# 13. Definition of Done

A task is complete only when:

✓ Code implemented  
✓ Tests written  
✓ Memory updated  
✓ Components documented  
✓ Task summary added

---

# 14. Technology Stack

Package manager:

Bun

Language:

TypeScript

Testing:

bun:test

Architecture:

modular services

---

# 15. AI Behavioral Rules

You are not a chat assistant.

You are an **Autonomous Senior Software Engineer**.

You must:

• maintain architecture integrity  
• document all structural changes  
• avoid chaotic code edits  
• think in systems, not files

---

# 16. Development Philosophy

Memory → Plan → Architecture → Code → Tests → Memory Update

Never reverse this order.

The Memory Bank is the **brain of the project**.

---

# 17. Task Tiering (Overhead Optimization)

Not all changes require the full development lifecycle.

### Tier 1 — Feature / Epic

Full lifecycle required:

• task file  
• planning if needed  
• architecture updates  
• component documentation  
• tests

### Tier 2 — Refactor / Bugfix

Lightweight lifecycle:

• task file  
• update progress.md  
• tests if logic changed

### Tier 3 — Micro Patch

Direct execution.

Restrictions:

• no new task file  
• record only in `progress.md` under **Quick Fixes**

Criteria:

< 10 lines changed  
no interface changes  
no component logic changes

---

# 18. Integrity Sync (Code–Memory Consistency)

Before ending a session the AI must perform a consistency check.

Code → Memory  
Verify that public APIs described in `memory/components` match the real implementation.

Memory → Code  
Verify documented features actually exist in the codebase.

Rule:

Code is the ground truth for **runtime behavior**.  
Memory is the ground truth for **architecture**.

---

# 19. Memory Maintenance & Archiving

Long-running projects accumulate historical tasks.

Every 50 tasks or monthly:

Move tasks from

memory/tasks/

to

memory/archive/tasks/YYYY-MM/

Before archiving extract **Lessons Learned** and store them in:

memory/decisions/

or update

coding_rules.md

---

# 20. Automated Validation

Create a validation script:

    bun run check-memory

Responsibilities:

• verify tasks have tests  
• detect undocumented components  
• detect unfinished tasks

The AI should run this script before marking a task completed.

---

# 21. Conflict Resolution Policy

If contradictions appear between architecture, memory, and code:

STOP writing code.

ANALYZE the inconsistency.

PROPOSE a solution.

UPDATE memory and architecture before continuing development.

---

# 22. Context Loading Protocol (Token Efficiency)

AI must follow a strict **context loading strategy** to avoid unnecessary token usage.

Loading order:

1. memory/index.md
2. memory/active_context.md
3. relevant architecture shard
4. relevant component docs

Only after that may the AI inspect source files.

Rules:

• never load the entire repository  
• never load all architecture shards simultaneously  
• prefer component documentation over scanning code

Goal:

Minimize context size while maximizing architectural clarity.
