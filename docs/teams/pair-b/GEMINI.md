# Pair B: Orchestration & Enforcement Layer

## TL;DR
> **tl;dr**: Pair B owns everything that **takes findings and makes decisions** — the FastAPI API endpoints (`backend/api/`), the Pre-Flight Orchestrator (`backend/agents/orchestrator.py`), the Decision Engine (`backend/decision/`), the Evidence Explorer (`backend/evidence/`), and the Remediation Planner (`backend/remediation/`). Pair B consumes `List[Finding]` from Pair A and produces the final `PreflightResponse` (`PASS` / `REVIEW` / `BLOCK`) back to callers. Pair B must never implement analysis logic — that belongs to Pair A.

---

## Ownership Boundary

```
backend/api/                      ← Pair B owns entirely
├── routes/preflight.py           # POST /api/preflight
├── routes/graph.py               # GET /api/projects/{id}/graph
├── routes/findings.py            # GET /api/findings/{id}
├── routes/remediate.py           # POST /api/remediate
└── routes/ci.py                  # POST /api/ci (exit-code gate)

backend/agents/
└── orchestrator.py               ← Pair B owns (only this file in agents/)

backend/decision/                 ← Pair B owns entirely
└── (Risk scoring + PASS/REVIEW/BLOCK gating)

backend/evidence/                 ← Pair B owns entirely
└── (Evidence trail, audit log, finding storage)

backend/remediation/              ← Pair B owns entirely
└── (Remediation plan generator)
```

**Pair B does NOT touch:**
- `analyzers/` (any parser)
- `backend/graph/` (NetworkX engine)
- `backend/agents/architecture/`
- `backend/agents/contracts/`
- `backend/agents/dependencies/`
- `backend/agents/impact/`
- `backend/agents/security/`
- `policies/` (YAML rule definitions)
- `backend/contracts/` (contract registry)

---

## Responsibilities

### 1. `backend/api/` — FastAPI REST Endpoints

Pair B implements all public-facing routes. Each route is thin — it validates input, delegates to the orchestrator, and serializes the response.

#### `POST /api/preflight`
```python
class PreflightRequest(BaseModel):
    project_id: str
    change: str              # Natural-language description of the change
    branch: str = "main"
    changed_files: List[str] = []

# Returns:
class PreflightResponse(BaseModel):
    status: PreflightStatus  # PASS | REVIEW | BLOCK
    risk: str                # LOW | MEDIUM | HIGH | CRITICAL
    findings: List[Finding]
    affected_files_count: int
    recommendation: Optional[str] = None
```
- Delegates entirely to `orchestrator.run_preflight(request)`
- Streams partial results via Server-Sent Events (SSE) while agents run in parallel

#### `GET /api/projects/{project_id}/graph`
- Calls `graph_engine.serialize()` → returns NetworkX graph as JSON adjacency list
- Paginated by component type (service, endpoint, table, event)

#### `GET /api/findings/{finding_id}`
- Fetches a `Finding` from `evidence_store` with full audit trail
- Returns evidence chain: file path, line number, AST symbol, rule ID, confidence

#### `POST /api/remediate`
```python
class RemediationRequest(BaseModel):
    finding_id: str
    context: Optional[str] = None   # Additional developer context

# Returns:
class RemediationPlan(BaseModel):
    steps: List[str]
    compliant_alternative: Optional[str]
    estimated_effort: str           # "LOW" | "MEDIUM" | "HIGH"
```

#### `POST /api/ci`
- Runs a full pre-flight check
- Returns HTTP 200 + exit code `0` if `PASS` or `REVIEW` with approved findings
- Returns HTTP 422 + exit code `1` if `BLOCK`
- Designed for direct integration into GitHub Actions / GitLab CI pipelines

---

### 2. `backend/agents/orchestrator.py` — Pre-Flight Orchestrator

The orchestrator is the **conductor** of the system. It:
1. Parses the natural-language `change` intent into a structured `ChangeRequest`.
2. Loads the repository knowledge graph from cache or triggers a re-index.
3. Dispatches all 5 Pair A agents **in parallel** using `asyncio.gather`.
4. Collects `List[Finding]` from all agents.
5. Passes findings to the Decision Engine.
6. Returns the final `PreflightResponse`.

```python
class Orchestrator:
    def __init__(
        self,
        agents: List[SpecialistAgent],    # Injected — implemented by Pair A
        graph_engine: GraphEngine,         # Injected — implemented by Pair A
        decision_engine: DecisionEngine,   # Local — Pair B implements
        evidence_store: EvidenceStore,     # Local — Pair B implements
    ): ...

    async def run_preflight(self, request: PreflightRequest) -> PreflightResponse:
        change_request = self._parse_intent(request.change)
        graph = await self.graph_engine.get_or_build(request.project_id)
        policies = PolicyLoader.load(request.project_id)

        # Parallel dispatch to Pair A agents
        all_findings = await asyncio.gather(
            *[agent.analyze(change_request, graph, policies) for agent in self.agents]
        )
        findings = [f for sublist in all_findings for f in sublist]

        # Pair B's responsibility: make the decision
        decision = self.decision_engine.evaluate(findings)
        self.evidence_store.persist(findings, change_request.id)

        return decision
```

**Key Rule**: The orchestrator does **zero analysis**. It is purely a dispatcher and aggregator. All domain logic lives in Pair A agents.

---

### 3. `backend/decision/` — Pre-Flight Decision Engine

Pair B implements the full risk scoring and gate classification logic.

#### Risk Formula
$$\text{Risk} = w_1 \cdot \text{architecture} + w_2 \cdot \text{contracts} + w_3 \cdot \text{dependencies} + w_4 \cdot \text{security} + w_5 \cdot \text{surface} + w_6 \cdot \text{uncertainty}$$

Where each component is derived from Pair A's `Finding` outputs:
- `architecture` = sum of architecture finding severities × confidence
- `contracts` = sum of contract finding severities × confidence
- `dependencies` = sum of dependency finding severities × confidence
- `security` = sum of security finding severities × confidence
- `surface` = `blast_radius / total_components` (from Impact agent)
- `uncertainty` = count of UNKNOWN-tier findings

#### Gate Classification Rules

| Condition | Decision |
| :--- | :--- |
| Any `Finding(blocking=True)` exists | **BLOCK** |
| No blocking findings AND `risk_score > HIGH_THRESHOLD` | **REVIEW** |
| Any `Finding(confidence < 0.6)` from AI inference tier | **REVIEW** |
| No blocking findings AND risk within threshold | **PASS** |

#### Trust Tier Enforcement (Pair B's Responsibility)
Pair B must **never elevate** an evidence-based AI inference finding (e.g., duplicate abstraction heuristic) into a `BLOCK`. Only deterministic Pair A findings with `blocking=True` can cause a `BLOCK`.

```python
class DecisionEngine:
    def evaluate(self, findings: List[Finding]) -> PreflightResponse:
        if any(f.blocking for f in findings):
            status = PreflightStatus.BLOCK
        elif self._has_high_uncertainty(findings) or self._risk_score(findings) > REVIEW_THRESHOLD:
            status = PreflightStatus.REVIEW
        else:
            status = PreflightStatus.PASS
        ...
```

---

### 4. `backend/evidence/` — Evidence Explorer & Audit Trail

Pair B implements the evidence store that persists and retrieves findings:

```python
class EvidenceStore:
    def persist(self, findings: List[Finding], change_request_id: str) -> None:
        # Write to PostgreSQL: findings table
        # Index by: change_request_id, category, severity, file path
        ...

    def get_finding(self, finding_id: str) -> Finding:
        # Returns full Finding with evidence chain
        ...

    def get_audit_trail(self, change_request_id: str) -> List[Finding]:
        # Full history for a given pre-flight run
        ...
```

**Every persisted Finding must include**:
- `evidence: List[str]` — `["backend/api/routes.py:42 → calls PaymentService directly"]`
- `confidence: float` — sourced verbatim from Pair A agents
- `rule_id: Optional[str]` — tracing back to the YAML policy that triggered it

---

### 5. `backend/remediation/` — Remediation Planner

When a change is `BLOCK`ed or flagged for `REVIEW`, the remediation planner generates compliant alternatives:

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
        # For forbidden deps: suggest the internal abstraction that satisfies the need
        ...
```

**Output `RemediationPlan`**:
```python
class RemediationPlan(BaseModel):
    finding_id: str
    steps: List[str]                     # Ordered, actionable refactoring steps
    compliant_alternative: Optional[str] # e.g. "Use PaymentGatewayAdapter in backend/adapters/"
    estimated_effort: str                # LOW | MEDIUM | HIGH
    references: List[str]               # Links to ADRs, policy rules, or internal docs
```

---

## Shared Contracts with Pair A (The Handoff)

Pair B **consumes** these models from Pair A. Pair B does not define them:

```python
# What Pair A produces → what Pair B reads
List[Finding]           # Input to DecisionEngine and EvidenceStore
nx.MultiDiGraph         # Read-only: used by orchestrator + remediation planner
ChangeRequest           # Shared — orchestrator produces it from natural language
PolicySet               # Shared — read from policies/ YAML (Pair A authors these)
```

**Both pairs must agree on `backend/schemas/shared.py`** before coding begins. Neither pair may change shared schemas unilaterally.

---

## Sprint Milestones for Pair B

| Milestone | Deliverable |
| :--- | :--- |
| **M1** | `backend/schemas/shared.py` — define `ChangeRequest`, `PolicySet`, `Finding` with Pair A |
| **M2** | `backend/api/` routes — `POST /api/preflight` + `POST /api/ci` (stub orchestrator) |
| **M3** | `backend/agents/orchestrator.py` — parallel dispatch + finding aggregation |
| **M4** | `backend/decision/` — risk scoring + PASS/REVIEW/BLOCK gating |
| **M5** | `backend/evidence/` + `backend/remediation/` + `POST /api/findings/{id}` + `POST /api/remediate` |

---

## Coding Guardrails (Pair B Specific)
1. **The orchestrator does zero analysis** — all domain intelligence lives in Pair A agents. The orchestrator only dispatches and aggregates.
2. **Decision engine is deterministic first** — BLOCK decisions must be based solely on `Finding(blocking=True)`. Do not add LLM-based BLOCK logic.
3. **Evidence must be preserved verbatim** — never summarize or paraphrase evidence from Pair A findings. Persist them as-is.
4. **API routes are thin** — they validate input with Pydantic, delegate to the orchestrator, and serialize output. No business logic in routes.
5. **Remediation planner reads the graph, never writes it** — it queries Pair A's graph read-only for compliant alternatives.
