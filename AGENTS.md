# Architectural Pre-Flight: Backend Project Context

## Project Purpose
This is the backend of the **Architectural Pre-Flight & Contract Enforcement Engine** — an autonomous governance system that validates whether a proposed software change should be built **before** an AI coding agent writes the code.

## How to Use This File with IBM BOB
Run `/init` in BOB IDE from the project root. BOB will read this file to understand the project architecture. Use **Plan mode** for design decisions, **Code mode** for implementation, and **Ask mode** to explore existing code before making changes.

> **Important**: Upload your Bob IDE **task session summary screenshots** to `docs/bob-sessions/` after each major task. This is required for hackathon submission.

---

## System Architecture Overview

```
[Developer proposes change]
        │
        ▼
[POST /api/preflight]          ← Pair B: backend/api/
        │
        ▼
[Orchestrator]                 ← Pair B: backend/agents/orchestrator.py
        │
        ├──────────────────────────────────────────┐
        ▼                                          ▼
[5 Parallel Specialist Agents] ← Pair A           [Graph Engine]  ← Pair A
  • Architecture Agent                            backend/graph/
  • Contract Agent                                (NetworkX MultiDiGraph)
  • Dependency Guardian                                │
  • Impact Analysis Agent                             feeds agents
  • Security Agent                                         │
        │                                                 │
        └──────────────┬───────────────────────────┘
                       │ List[Finding]
                       ▼
              [Decision Engine]          ← Pair B: backend/decision/
              Risk = arch + contract + dep + security + surface + uncertainty
                       │
                       ▼
              PASS | REVIEW | BLOCK      → Evidence stored ← Pair B: backend/evidence/
                       │
                       ▼ (if BLOCK/REVIEW)
              [Remediation Planner]      ← Pair B: backend/remediation/
```

---

## Technology Stack (Backend Only)
- **Language**: Python 3.11+
- **API Framework**: FastAPI
- **Validation**: Pydantic v2 (strict type-safety)
- **Graph Engine**: NetworkX (`MultiDiGraph`)
- **AST Parser**: Tree-sitter (Python, TypeScript, Go)
- **Schema Parsers**: OpenAPI 3.x, GraphQL, AsyncAPI, SQL DDL, Protobuf
- **Database**: PostgreSQL (metadata, contracts, findings)
- **Cache/Queue**: Redis (async jobs, graph cache)

---

## Directory Structure
```
backend/
├── api/              # Pair B — FastAPI routes
├── agents/
│   ├── orchestrator.py   # Pair B
│   ├── architecture/     # Pair A
│   ├── contracts/        # Pair A
│   ├── dependencies/     # Pair A
│   ├── impact/           # Pair A
│   └── security/         # Pair A
├── contracts/        # Pair A — contract registry & schema diff
├── graph/            # Pair A — NetworkX knowledge graph
├── policies/         # Pair A — YAML policy evaluator
├── decision/         # Pair B — risk scoring & gate decisions
├── evidence/         # Pair B — audit trail & finding store
└── remediation/      # Pair B — refactoring plan generator
analyzers/            # Pair A — all parsers (source, deps, openapi, graphql, db, git)
policies/             # Pair A — YAML rule definitions
backend/schemas/
└── shared.py         # BOTH PAIRS — joint ownership, mutual sign-off required
```

---

## Shared Contracts (Team Boundary)
`backend/schemas/shared.py` is the interface between Pair A and Pair B. **Neither pair may modify it without a PR approved by both pairs.**

### Core types (from shared.py):
- `Finding` — produced by Pair A agents, consumed by Pair B
- `ChangeRequest` — produced by Pair B orchestrator, read by Pair A agents
- `PolicySet` — authored as YAML by Pair A, loaded by Pair B, read by both
- `PreflightResponse` — produced by Pair B, returned via API

---

## Pre-Flight Decision Logic
```
Risk = architecture_impact + contract_impact + dependency_impact
       + security_impact + change_surface + uncertainty

BLOCK  → Any Finding(blocking=True) exists
REVIEW → No hard block, but risk > threshold OR confidence < 0.6
PASS   → No hard block AND risk within acceptable threshold
```

**Trust tiering:**
1. **Deterministic** (hard BLOCK): AST rule violations, forbidden deps, schema breakage
2. **Evidence-based AI inference** (REVIEW): Heuristics, structural coupling
3. **Unknown** (mandatory human REVIEW): Missing schemas, undocumented consumers

---

## Coding Rules (BOB must follow these)
1. **Backend only**: No React, HTML, CSS, or frontend code in this workspace.
2. **Type safety**: All Python must be fully type-hinted with Pydantic v2 validation.
3. **Evidence grounding**: Every `Finding` must include `evidence` (file:line), `confidence`, and `affected_files`.
4. **Deterministic hard blocks**: `Finding(blocking=True)` only from concrete AST/policy rule violations — never from probabilistic heuristics.
5. **Analyzers are pure functions**: `analyzers/` modules must be stateless — no DB writes, no Redis calls.
6. **Graph is read-only during analysis**: Agents query the graph; they do not mutate it during a pre-flight run.
7. **No deprecated packages**: Check `policies/dependencies.yaml` before adding any dependency.

---

## BOB IDE Skills Available
- `.bob/skills/architecture-preflight.md` — how to run a pre-flight analysis
- `.bob/skills/backend-coding-rules.md` — backend-specific coding conventions

---

## Pair Assignment Summary
| Work Area | Pair |
| :--- | :---: |
| `analyzers/` (all parsers) | **A** |
| `backend/graph/` | **A** |
| `backend/contracts/` | **A** |
| `backend/agents/architecture/` | **A** |
| `backend/agents/contracts/` | **A** |
| `backend/agents/dependencies/` | **A** |
| `backend/agents/impact/` | **A** |
| `backend/agents/security/` | **A** |
| `policies/` (YAML rules) | **A** |
| `backend/schemas/shared.py` | **Both ⚠️** |
| `backend/agents/orchestrator.py` | **B** |
| `backend/decision/` | **B** |
| `backend/evidence/` | **B** |
| `backend/remediation/` | **B** |
| `backend/api/` | **B** |
