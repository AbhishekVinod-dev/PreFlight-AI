# Stage 7: Parallel Development & Integration Plan

## TL;DR
> **tl;dr**: Yes — Pair A and Pair B can build completely independently and integrate later. The decoupling contract is `backend/schemas/shared.py`. Pair B uses **mock stub agents** (in `backend/agents/stubs/`) to develop and test the orchestrator, decision engine, and API without Pair A's real code. Pair A builds and unit-tests their analyzers and agents against the shared schemas. Integration happens in one clean step: swap stubs → real agents via dependency injection. An integration test harness (`tests/integration/test_integration.py`) verifies the wiring.

---

## 1. Why They Can Work Independently

The architecture was designed with a clean seam:

```
Pair A output:   List[Finding]  +  nx.MultiDiGraph
                        │
                 shared.py (the contract)
                        │
Pair B input:    List[Finding]  +  nx.MultiDiGraph (read-only)
```

Pair B never calls Pair A's code directly. The orchestrator receives agents as **injected dependencies**. This means:
- Pair B can inject **mock stub agents** during development
- Pair A can unit-test their agents independently using fake `ChangeRequest`/`PolicySet` objects
- Integration = swap stubs for real agents at the dependency injection site

---

## 2. Three-Phase Timeline

```
Phase 1: Contract Freeze (Day 1 — Both pairs together, 2–3 hours)
  └── Finalize backend/schemas/shared.py together
  └── Agree on Finding fields, ChangeRequest structure, PolicySet schema
  └── Merge to main — LOCKED. No unilateral changes after this.

Phase 2: Parallel Build (Days 2–N — Pairs work independently)
  ├── Pair A: analyzers/ → backend/graph/ → 5 specialist agents
  │   Tests: pytest tests/unit/pair-a/ (no Pair B code needed)
  │
  └── Pair B: backend/api/ → orchestrator → decision/ → evidence/ → remediation/
      Tests: pytest tests/unit/pair-b/ (using stub agents from backend/agents/stubs/)

Phase 3: Integration (Final day)
  └── Wire Pair A's real agents into Pair B's orchestrator via DI
  └── Run: pytest tests/integration/
  └── Fix any schema mismatches (should be zero if shared.py was followed)
```

---

## 3. Integration Checklist

### Before integration (Pair A confirms):
- [ ] All 5 agents implement the `SpecialistAgent` protocol from `backend/agents/protocols.py`
- [ ] Every `Finding` has non-empty `evidence`, `affected_files`, and a valid `confidence`
- [ ] `blocking=True` only on deterministic violations (never on heuristics)
- [ ] `backend/graph/engine.py` exports a `GraphEngine` class with `get_or_build()` and `serialize()`
- [ ] All analyzer functions are pure (stateless, no side effects)
- [ ] `pytest tests/unit/pair-a/` passes with 80%+ coverage

### Before integration (Pair B confirms):
- [ ] Orchestrator accepts `List[SpecialistAgent]` via constructor injection
- [ ] Decision engine only sets `BLOCK` when `any(f.blocking for f in findings)`
- [ ] All API routes are thin (no business logic)
- [ ] `pytest tests/unit/pair-b/` passes using stub agents
- [ ] Evidence store persists `Finding.evidence` verbatim (no summarization)

### Integration day:
- [ ] Run `python integration/wire.py` — replaces stubs with real agents
- [ ] Run `pytest tests/integration/` — end-to-end pre-flight verification
- [ ] Fix any runtime issues (type mismatches, missing fields)
- [ ] Final screenshot for Bob IDE task session — upload to `docs/bob-sessions/`

---

## 4. The Stub → Real Agent Swap (One Line of Code)

```python
# backend/main.py  ← Pair B owns this

# ── DEVELOPMENT (using stubs) ───────────────────────────────────────────────
from backend.agents.stubs import (
    StubArchitectureAgent, StubContractAgent,
    StubDependencyAgent, StubImpactAgent, StubSecurityAgent,
)

# ── PRODUCTION (using real Pair A agents) ───────────────────────────────────
# Uncomment for integration:
# from backend.agents.architecture.agent import ArchitectureAgent as StubArchitectureAgent
# from backend.agents.contracts.agent   import ContractAgent     as StubContractAgent
# from backend.agents.dependencies.agent import DependencyAgent  as StubDependencyAgent
# from backend.agents.impact.agent       import ImpactAgent      as StubImpactAgent
# from backend.agents.security.agent     import SecurityAgent    as StubSecurityAgent

agents = [
    StubArchitectureAgent(),
    StubContractAgent(),
    StubDependencyAgent(),
    StubImpactAgent(),
    StubSecurityAgent(),
]
```

That is the **entire integration** — one import swap.

---

## 5. Risk: What Could Go Wrong at Integration

| Risk | Likelihood | Mitigation |
| :--- | :---: | :--- |
| Agent returns `Finding` with missing required fields | Low | Pydantic v2 will raise `ValidationError` immediately — easy to fix |
| Agent sets `blocking=True` on probabilistic finding | Medium | Integration test `test_no_heuristic_blocks` catches this |
| Graph engine's `get_or_build()` signature changed | Low | `GraphEngine` protocol in `protocols.py` enforces the interface |
| `ChangeRequest` fields renamed | Very Low | Frozen in `shared.py` — caught immediately if either pair tried to change |
| Agent is not async-compatible | Medium | Protocol declares `async def analyze()` — mypy/pytest catches this |
