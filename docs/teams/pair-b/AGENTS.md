# Pair B: Orchestration & Enforcement Layer
## IBM BOB Context File

## TL;DR for BOB
> You are implementing the **orchestration and enforcement layer** of the Architectural Pre-Flight engine. You consume `List[Finding]` from Pair A's specialist agents and produce the final `PreflightResponse` (`PASS` / `REVIEW` / `BLOCK`). You own `backend/agents/orchestrator.py`, `backend/decision/`, `backend/evidence/`, `backend/remediation/`, and `backend/api/`. You must never implement analysis logic — that belongs to Pair A.

---

## BOB IDE Usage Guide for Pair B

### How to start
```
1. Open the backend/ directory in BOB IDE
2. Run /init — BOB will load this AGENTS.md automatically
3. Use Plan mode for designing API contracts and orchestration patterns
4. Use Code mode for implementing routes, orchestrator, and decision engine
5. Use Ask mode to review shared.py before any changes to shared contracts
6. After each completed task, capture the Bob task session summary screenshot
   and save it to: docs/bob-sessions/pair-b/
```

### Recommended BOB task flow for Pair B

```
Task 1: Define shared contracts with Pair A (backend/schemas/shared.py)
  → Plan mode: agree on Finding, ChangeRequest, PolicySet, PreflightResponse
  → Code mode: finalize shared.py — get Pair A sign-off before merging
  → Screenshot: capture session summary

Task 2: Implement FastAPI routes (backend/api/)
  → Plan mode: design endpoint contracts (request/response schemas)
  → Code mode: implement POST /api/preflight, POST /api/ci (thin routes only)
  → Code mode: stub the orchestrator call — Pair A agents are injected
  → Screenshot: capture session summary

Task 3: Implement Orchestrator (backend/agents/orchestrator.py)
  → Ask mode: review ChangeRequest schema in shared.py before building parser
  → Code mode: implement parallel asyncio.gather dispatch to Pair A agents
  → Code mode: implement natural language → ChangeRequest intent parser
  → Screenshot: capture session summary

Task 4: Implement Decision Engine (backend/decision/)
  → Plan mode: design risk scoring formula and threshold config
  → Code mode: implement DecisionEngine.evaluate(findings) → PreflightResponse
  → Code mode: implement trust tier enforcement (deterministic vs AI inference)
  → Screenshot: capture session summary

Task 5: Implement Evidence Store + Remediation + remaining routes
  → Code mode: implement EvidenceStore (PostgreSQL write + read)
  → Code mode: implement RemediationPlanner (read-only graph queries)
  → Code mode: implement GET /api/findings/{id}, POST /api/remediate
  → Screenshot: capture session summary
```

---

## Your Ownership Boundary

### You OWN (implement freely):
```
backend/api/
├── routes/preflight.py    # POST /api/preflight
├── routes/graph.py        # GET /api/projects/{id}/graph
├── routes/findings.py     # GET /api/findings/{id}
├── routes/remediate.py    # POST /api/remediate
└── routes/ci.py           # POST /api/ci

backend/agents/
└── orchestrator.py        # ONLY this file — not the specialist agents

backend/decision/          # Risk scoring + PASS/REVIEW/BLOCK gating

backend/evidence/          # Finding persistence + audit trail

backend/remediation/       # Compliant refactoring plan generator
```

### You must NEVER touch:
- `analyzers/` — Pair A's parsers
- `backend/graph/` — Pair A's NetworkX engine
- `backend/contracts/` — Pair A's contract registry
- `backend/agents/architecture/` — Pair A's Architecture Agent
- `backend/agents/contracts/` — Pair A's Contract Agent
- `backend/agents/dependencies/` — Pair A's Dependency Guardian
- `backend/agents/impact/` — Pair A's Impact Agent
- `backend/agents/security/` — Pair A's Security Agent
- `policies/` — Pair A's YAML rule definitions

### Shared boundary (mutual sign-off required):
- `backend/schemas/shared.py` — ask Pair A before changing anything here

---

## FastAPI Route Specifications

### `POST /api/preflight`
```python
class PreflightRequest(BaseModel):
    project_id: str
    change: str              # Natural-language description (e.g. "Add Redis cache to PaymentService")
    branch: str = "main"
    changed_files: List[str] = []

# Response (from shared.py):
class PreflightResponse(BaseModel):
    request_id: str
    status: PreflightStatus  # PASS | REVIEW | BLOCK
    risk: str                # LOW | MEDIUM | HIGH | CRITICAL
    findings: List[Finding]
    affected_files_count: int
    recommendation: Optional[str] = None
    remediation_available: bool = False
```

**Implementation rule**: This route must be thin. All logic lives in `orchestrator.run_preflight()`.

### `POST /api/ci` — CI/CD Gate
```
HTTP 200 + exit_code: 0  →  PASS or REVIEW-with-approved
HTTP 422 + exit_code: 1  →  BLOCK
```
Designed for direct use in GitHub Actions / GitLab CI pipelines.

### `GET /api/projects/{project_id}/graph`
Returns NetworkX graph serialized as JSON adjacency list.
Pair B calls `graph_engine.serialize()` — **read-only, never mutate the graph**.

### `GET /api/findings/{finding_id}`
Returns full `Finding` with complete evidence chain from `EvidenceStore`.

### `POST /api/remediate`
```python
class RemediationRequest(BaseModel):
    finding_id: str
    context: Optional[str] = None  # Optional developer-provided context

class RemediationPlan(BaseModel):
    finding_id: str
    steps: List[str]
    compliant_alternative: Optional[str] = None
    estimated_effort: str    # LOW | MEDIUM | HIGH
    references: List[str]    # ADR links, policy rule IDs
```

---

## Orchestrator Design

The orchestrator dispatches Pair A agents in parallel and aggregates their findings:

```python
class Orchestrator:
    def __init__(
        self,
        agents: List[SpecialistAgent],    # Injected — implemented by Pair A
        graph_engine: GraphEngine,         # Injected — implemented by Pair A
        decision_engine: DecisionEngine,   # Your responsibility
        evidence_store: EvidenceStore,     # Your responsibility
    ): ...

    async def run_preflight(self, request: PreflightRequest) -> PreflightResponse:
        # Step 1: Parse natural language intent into structured ChangeRequest
        change_request = self._parse_intent(request.change)

        # Step 2: Get or build knowledge graph (Pair A's engine)
        graph = await self.graph_engine.get_or_build(request.project_id)
        policies = PolicyLoader.load(request.project_id)

        # Step 3: Dispatch ALL 5 agents in parallel (Pair A implements these)
        all_findings = await asyncio.gather(
            *[agent.analyze(change_request, graph, policies)
              for agent in self.agents]
        )
        findings = [f for sublist in all_findings for f in sublist]

        # Step 4: Your decision engine makes the call
        decision = self.decision_engine.evaluate(findings)

        # Step 5: Persist evidence (your responsibility)
        self.evidence_store.persist(findings, change_request.id)

        return decision
```

**Critical rule**: The orchestrator does **zero analysis**. It dispatches and aggregates only.

---

## Decision Engine Specification

### Risk Formula
```
Risk = w1 * architecture + w2 * contracts + w3 * dependencies
       + w4 * security + w5 * surface + w6 * uncertainty
```

Each component is derived from `Finding` inputs:
- `architecture` = sum(severity × confidence) for architecture findings
- `contracts` = sum(severity × confidence) for contract findings
- `dependencies` = sum(severity × confidence) for dependency findings
- `security` = sum(severity × confidence) for security findings
- `surface` = `blast_radius / total_components` (from Impact Agent findings)
- `uncertainty` = count of findings with confidence < 0.6

### Gate Classification (implement this exactly)
```python
class DecisionEngine:
    def evaluate(self, findings: List[Finding]) -> PreflightResponse:
        # 1. Hard block: any deterministic violation
        if any(f.blocking for f in findings):
            status = PreflightStatus.BLOCK

        # 2. Review: high risk or uncertain AI inference
        elif self._risk_score(findings) > REVIEW_THRESHOLD \
             or self._has_low_confidence(findings):
            status = PreflightStatus.REVIEW

        # 3. Pass: all clear
        else:
            status = PreflightStatus.PASS
```

**Critical rule**: You must NEVER set `status = BLOCK` based on AI inference. Only `Finding(blocking=True)` from Pair A deterministic checks can cause a BLOCK.

---

## Evidence Store Specification

```python
class EvidenceStore:
    def persist(self, findings: List[Finding], change_request_id: str) -> None:
        # Write to PostgreSQL: findings table
        # Index by: change_request_id, category, severity, file_path
        # Preserve evidence verbatim — never summarize Pair A's evidence strings

    def get_finding(self, finding_id: str) -> Finding:
        # Return full Finding with complete evidence chain

    def get_audit_trail(self, change_request_id: str) -> List[Finding]:
        # Full history for a pre-flight run
```

**Critical rule**: Persist evidence **verbatim**. Never paraphrase or summarize Pair A's evidence strings.

---

## Remediation Planner Specification

```python
class RemediationPlanner:
    def generate_plan(
        self,
        finding: Finding,
        graph: nx.MultiDiGraph,   # Read-only query from Pair A's graph
        policies: PolicySet,
    ) -> RemediationPlan:
        # For architecture violations: suggest existing services to extend
        # For broken contracts: suggest additive-only change strategies
        # For forbidden deps: point to internal abstractions that cover the need
```

**Critical rule**: The remediation planner **reads** the graph — it never writes to it.

---

## Coding Rules (BOB must enforce these for Pair B)

1. **API routes are thin** — validate input with Pydantic, delegate to orchestrator, serialize output. No business logic in routes.
2. **Orchestrator does zero analysis** — it dispatches and aggregates only.
3. **BLOCK only from deterministic violations** — never set `BLOCK` from AI inference `Finding`s.
4. **Preserve evidence verbatim** — never summarize or paraphrase Pair A's `Finding.evidence` strings.
5. **Remediation planner reads the graph, never writes** — use `nx.descendants`, `nx.shortest_path` in read-only mode.
6. **Inject Pair A agents as dependencies** — orchestrator never instantiates specialist agents directly.
