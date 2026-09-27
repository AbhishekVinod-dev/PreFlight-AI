# Backend Team Split Overview

## TL;DR
> **tl;dr**: The backend is split along its **natural data-flow seam**. Pair A owns everything that **produces data** (parsers, knowledge graph, 5 specialist agents). Pair B owns everything that **acts on data** (orchestrator, decision engine, evidence store, remediation, and the API layer). The team boundary is enforced through a shared [`backend/schemas/shared.py`](../backend/schemas/shared.py) contract file — neither pair may change it without joint sign-off.

---

## The Split Principle

The backend has a clear data pipeline:

```
[Pair A]                              [Pair B]
  │                                     │
  │  analyzers/          ─────────────► │  orchestrator.py
  │  backend/graph/      (List[Finding])│  backend/decision/
  │  backend/agents/*    ─────────────► │  backend/evidence/
  │  backend/contracts/  (MultiDiGraph) │  backend/remediation/
  │  policies/           ─────────────► │  backend/api/
  │                                     │
  └─────── PRODUCES ──────────────────► └─────── CONSUMES & DECIDES
```

**The team boundary is a single file**: [`backend/schemas/shared.py`](../backend/schemas/shared.py).

---

## Pair Assignments at a Glance

| Module | Owner | Role Summary |
| :--- | :---: | :--- |
| `analyzers/source/` | **Pair A** | Tree-sitter AST extractor |
| `analyzers/dependencies/` | **Pair A** | Manifest & lockfile parser |
| `analyzers/openapi/` | **Pair A** | OpenAPI 3.x parser |
| `analyzers/graphql/` | **Pair A** | GraphQL schema parser |
| `analyzers/database/` | **Pair A** | SQL DDL parser |
| `analyzers/git/` | **Pair A** | Git diff & history analyzer |
| `backend/graph/` | **Pair A** | NetworkX knowledge graph engine |
| `backend/contracts/` | **Pair A** | Contract registry & schema diff |
| `backend/agents/architecture/` | **Pair A** | Layer rules & circular deps |
| `backend/agents/contracts/` | **Pair A** | Schema & consumer validation |
| `backend/agents/dependencies/` | **Pair A** | Package policy enforcement |
| `backend/agents/impact/` | **Pair A** | Blast radius calculation |
| `backend/agents/security/` | **Pair A** | Auth boundaries & secrets |
| `policies/` | **Pair A** | YAML rule definitions |
| `backend/schemas/shared.py` | **Both** ⚠️ | Team boundary — joint sign-off required |
| `backend/agents/orchestrator.py` | **Pair B** | Parallel agent dispatcher |
| `backend/decision/` | **Pair B** | Risk scoring & PASS/REVIEW/BLOCK |
| `backend/evidence/` | **Pair B** | Audit trail & finding persistence |
| `backend/remediation/` | **Pair B** | Refactoring plan generator |
| `backend/api/` | **Pair B** | FastAPI REST & CI endpoints |

---

## The Handoff Contract

Pair A **outputs** → Pair B **inputs**:

| Type | Direction | Description |
| :--- | :--- | :--- |
| `List[Finding]` | A → B | Core output of all 5 specialist agents |
| `nx.MultiDiGraph` | A → B | Read-only: graph queried by orchestrator & remediation |
| `ChangeRequest` | B → A | Orchestrator parses NL intent → agents read it |
| `PolicySet` | A (authors YAML) → B (loads) → A (agents read) | Policy rules |

> [!IMPORTANT]
> Changes to `Finding`, `ChangeRequest`, `PolicySet`, or `PreflightResponse` in `backend/schemas/shared.py` require **a pull request reviewed and approved by both pairs** before merge.

---

## Integration Points

### How Pair A and Pair B connect at runtime

```python
# In orchestrator.py (Pair B):
all_findings: List[List[Finding]] = await asyncio.gather(
    arch_agent.analyze(change_request, graph, policies),     # Pair A
    contract_agent.analyze(change_request, graph, policies), # Pair A
    dep_agent.analyze(change_request, graph, policies),      # Pair A
    impact_agent.analyze(change_request, graph, policies),   # Pair A
    security_agent.analyze(change_request, graph, policies), # Pair A
)
findings = [f for sublist in all_findings for f in sublist]
decision = decision_engine.evaluate(findings)  # Pair B
```

Pair A agents are **injected** into the orchestrator via dependency injection — Pair B never instantiates analysis logic directly.

---

## Pair A Context File
→ [`teams/pair-a/GEMINI.md`](pair-a/GEMINI.md)

## Pair B Context File
→ [`teams/pair-b/GEMINI.md`](pair-b/GEMINI.md)

## Shared Contracts
→ [`backend/schemas/shared.py`](../backend/schemas/shared.py)
