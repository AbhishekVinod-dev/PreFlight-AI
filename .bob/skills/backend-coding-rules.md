# Skill: Backend Coding Rules

## When to activate this skill
Activate this skill whenever writing or modifying any Python file in:
- `backend/`
- `analyzers/`
- `policies/`
- `backend/schemas/`

---

## Non-Negotiable Rules

### 1. Python 3.11+ and Pydantic v2
```python
# Always use: from __future__ import annotations
# Always use: from pydantic import BaseModel, Field
# Always use type hints on every function signature
# Never use dict, list, or Any without explicit type parameters

# Good:
async def analyze(
    self,
    change_request: ChangeRequest,
    graph: nx.MultiDiGraph,
    policies: PolicySet,
) -> List[Finding]: ...

# Bad:
def analyze(self, change_request, graph, policies):
    return []
```

### 2. Every Finding must have evidence
```python
# CORRECT — always include evidence and affected_files:
Finding(
    id=str(uuid4()),
    change_request_id=change_request.id,
    category=FindingCategory.ARCHITECTURE,
    severity=FindingSeverity.CRITICAL,
    confidence=1.0,
    title="Layer boundary violation: frontend → database",
    explanation="Module frontend/checkout.py directly imports UserRepository",
    evidence=["frontend/checkout.py:14 → from backend.db.repositories import UserRepository"],
    affected_files=["frontend/checkout.py"],
    rule_id="ARCH-001",
    blocking=True,
)

# WRONG — no evidence, no affected_files:
Finding(
    category=FindingCategory.ARCHITECTURE,
    title="Possible violation",
    confidence=0.5,
    blocking=True,  # NEVER block without concrete evidence!
)
```

### 3. Hard blocks only from deterministic checks
```python
# CORRECT — blocking=True only for concrete rule violations:
if "database" in import_path and source_layer == "frontend":
    return [Finding(..., blocking=True, confidence=1.0)]

# WRONG — blocking=True on a heuristic:
if similarity_score > 0.7:  # heuristic!
    return [Finding(..., blocking=True)]  # Should be blocking=False, REVIEW

# CORRECT — heuristic findings use blocking=False:
if similarity_score > 0.7:
    return [Finding(..., blocking=False, confidence=similarity_score)]
```

### 4. Analyzers are pure functions
```python
# CORRECT — stateless, no imports from backend/:
def extract_ast_nodes(source_code: str, file_path: str) -> List[ASTNode]:
    # Parse, return nodes. No side effects.
    ...

# WRONG — analyzers must not import from backend agents or API:
from backend.agents.architecture import ArchitectureAgent  # FORBIDDEN in analyzers/
```

### 5. Agents are read-only on the graph
```python
# CORRECT — query the graph, never mutate during analysis:
async def analyze(self, ...) -> List[Finding]:
    consumers = list(nx.descendants(graph, modified_node_id))
    ...

# WRONG — mutating the graph during agent execution:
async def analyze(self, ...) -> List[Finding]:
    graph.add_node("new_node", ...)  # FORBIDDEN during analysis
```

### 6. Orchestrator does zero analysis
```python
# CORRECT — orchestrator dispatches only:
async def run_preflight(self, request):
    findings = await asyncio.gather(
        *[agent.analyze(cr, graph, policies) for agent in self.agents]
    )
    return self.decision_engine.evaluate(...)

# WRONG — orchestrator contains analysis logic:
async def run_preflight(self, request):
    if "database" in request.change:  # Analysis logic! Move to an agent.
        ...
```

### 7. API routes are thin
```python
# CORRECT — thin route, delegates immediately:
@router.post("/preflight")
async def preflight(request: PreflightRequest) -> PreflightResponse:
    return await orchestrator.run_preflight(request)

# WRONG — business logic in route:
@router.post("/preflight")
async def preflight(request: PreflightRequest) -> PreflightResponse:
    if "database" in request.change:  # Move to orchestrator/agent!
        ...
```

---

## FastAPI Conventions
```python
# Always use async route handlers
@router.post("/endpoint")
async def handler(request: RequestModel) -> ResponseModel:
    ...

# Always return typed Pydantic models
# Always use dependency injection for orchestrator, evidence store, etc.
# Never use global state — use FastAPI Depends()
```

## Testing Requirements
- Every analyzer function must have unit tests in `tests/unit/analyzers/`
- Every specialist agent must have unit tests using mock graphs and policies
- Every API route must have integration tests in `tests/integration/api/`
- Target: 80%+ code coverage on all `backend/` and `analyzers/` modules

## Import Order (follow black/isort conventions)
```python
# 1. Standard library
from __future__ import annotations
import asyncio
from datetime import datetime
from typing import List, Optional

# 2. Third-party
import networkx as nx
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

# 3. Project imports
from backend.schemas.shared import Finding, ChangeRequest
```
