# Pair A: Data Ingestion & Analysis Layer
## IBM BOB Context File

## TL;DR for BOB
> You are implementing the **data ingestion and analysis layer** of the Architectural Pre-Flight engine. Your work produces `List[Finding]` and a populated `nx.MultiDiGraph` — these are handed off to Pair B. You own `analyzers/`, `backend/graph/`, `backend/contracts/`, `backend/agents/` (all 5 specialist agents), and `policies/`. You must never touch `backend/api/`, `backend/agents/orchestrator.py`, `backend/decision/`, `backend/evidence/`, or `backend/remediation/`.

---

## BOB IDE Usage Guide for Pair A

### How to start
```
1. Open the backend/ directory in BOB IDE
2. Run /init — BOB will load this AGENTS.md automatically
3. Use Plan mode for designing module interfaces before implementing
4. Use Code mode for implementing parsers, graph operations, and agent logic
5. Use Ask mode to explore existing code before modifying it
6. After each completed task, capture the Bob task session summary screenshot
   and save it to: docs/bob-sessions/pair-a/
```

### Recommended BOB task flow for Pair A
```
Task 1: Implement analyzers/source/ (Tree-sitter AST extractor)
  → Plan mode: design ASTNode schema, extraction interface
  → Code mode: implement Python + TypeScript grammar parsers
  → Screenshot: capture session summary

Task 2: Implement backend/graph/ (NetworkX knowledge graph)
  → Plan mode: define node/edge schema, graph operations
  → Code mode: build ingestion pipeline from AST → MultiDiGraph
  → Screenshot: capture session summary

Task 3: Implement Architecture Agent + Dependency Guardian (deterministic)
  → Ask mode: review architecture.yaml and dependencies.yaml policies first
  → Code mode: implement evaluate() returning List[Finding]
  → Screenshot: capture session summary

Task 4: Implement Contract Agent + Impact Analysis Agent
  → Ask mode: review shared.py Finding schema before implementing
  → Code mode: implement analyze() for each agent
  → Screenshot: capture session summary

Task 5: Implement Security Agent + full test suite
  → Code mode: implement security boundary checks
  → Code mode: write pytest unit tests for all agents
  → Screenshot: capture session summary
```

---

## Your Ownership Boundary

### You OWN (implement freely):
```
analyzers/
├── source/          # Tree-sitter AST parser
├── dependencies/    # pyproject.toml / package.json parser
├── openapi/         # OpenAPI 3.x spec parser
├── graphql/         # GraphQL schema parser
├── database/        # SQL DDL parser
└── git/             # Git diff & history analyzer

backend/graph/       # NetworkX MultiDiGraph engine

backend/agents/
├── architecture/    # Layer rules, circular deps, duplicate abstractions
├── contracts/       # Schema breaking-change detection
├── dependencies/    # Package policy enforcement
├── impact/          # Blast radius calculation
└── security/        # Auth boundaries, secrets, privilege escalation

backend/contracts/   # Contract registry & schema diff engine
policies/            # YAML policy definitions (architecture, deps, contracts)
```

### You must NEVER touch:
- `backend/api/` — that is Pair B's FastAPI layer
- `backend/agents/orchestrator.py` — that is Pair B's dispatcher
- `backend/decision/` — that is Pair B's risk engine
- `backend/evidence/` — that is Pair B's audit store
- `backend/remediation/` — that is Pair B's planner

### Shared boundary (mutual sign-off required):
- `backend/schemas/shared.py` — ask Pair B before changing anything here

---

## Analyzer Module Specifications

### `analyzers/source/` — Tree-sitter AST Extractor
**Input**: File path or source code string
**Output**: `List[ASTNode]`
```python
class ASTNode(BaseModel):
    node_type: str          # "import", "function_def", "call", "class_def"
    name: str               # Symbol name
    file_path: str          # Relative to repo root
    line: int               # Line number (1-indexed)
    calls: List[str]        # Symbols this node calls
    imports: List[str]      # Symbols this node imports
```
**Rule**: Stateless pure function — takes source, returns nodes. No side effects.

### `analyzers/dependencies/` — Manifest Parser
**Input**: Path to `pyproject.toml`, `requirements.txt`, or `package.json`
**Output**: `List[Dependency]`
```python
class Dependency(BaseModel):
    name: str
    version: str
    is_direct: bool
    source_file: str        # Which manifest declared it
```

### `analyzers/openapi/` — OpenAPI Parser
**Output**: Extracted endpoints, parameters, response schemas as structured Pydantic models.

### `analyzers/database/` — SQL DDL Parser
**Output**: `List[TableDefinition]` with columns, types, constraints, FK relationships.

---

## Knowledge Graph Specification

### NetworkX `MultiDiGraph` Schema

**Nodes** (each is a `Component`):
```
id          → unique string, e.g. "backend.agents.architecture.agent"
name        → human-readable name
type        → "service" | "endpoint" | "model" | "table" | "event" | "module"
path        → relative file path
```

**Edges** (each is a `Relationship`):
```
type        → imports | calls | depends_on | consumes | provides
              writes | reads | publishes | subscribes
evidence    → "file.py:42 → import PaymentService"
weight      → float confidence 0.0–1.0
```

**Graph operations you must implement**:
```python
# Cycle detection (Architecture Agent)
nx.simple_cycles(G)

# Blast radius (Impact Agent)
nx.descendants(G, node_id)

# Dependency chain evidence (Evidence Explorer)
nx.shortest_path(G, source, target)

# Layer ordering (Policy Engine)
nx.topological_sort(G)
```

---

## Specialist Agent Interface Contract

Every agent must implement exactly this protocol (from `backend/schemas/shared.py`):
```python
class SpecialistAgent(Protocol):
    async def analyze(
        self,
        change_request: ChangeRequest,   # What the developer wants to change
        graph: nx.MultiDiGraph,          # Read-only repository knowledge graph
        policies: PolicySet,             # Loaded from policies/*.yaml
    ) -> List[Finding]: ...
```

**Finding rules**:
- `blocking=True` ONLY for deterministic rule violations (layer rules, forbidden deps, schema breaks)
- `blocking=False` for heuristic or probabilistic findings (use REVIEW instead)
- Always include non-empty `evidence` and `affected_files`
- Always include a `confidence` score (0.0–1.0)

---

## Agent Blocking Conditions

| Agent | Hard BLOCK conditions |
| :--- | :--- |
| **Architecture** | Explicit layer rule violation (e.g. frontend→database import) |
| **Architecture** | Unapproved circular dependency |
| **Contract** | Breaking field removal with active consumers |
| **Contract** | Type-incompatible change with documented consumers |
| **Dependency Guardian** | Package in `forbidden_packages` list |
| **Dependency Guardian** | Deprecated package adoption |
| **Impact** | Never blocks — triggers REVIEW via orchestrator |
| **Security** | Direct DB connection from frontend tier |
| **Security** | Authorization gateway bypass |

---

## Policy YAML Schema

### `policies/architecture.yaml`
```yaml
rules:
  - id: ARCH-001
    description: "Frontend modules may not directly import database models"
    type: layer_boundary
    expression: "frontend -> database"
    severity: critical
    enforcement: block

  - id: ARCH-002
    description: "API layer must not directly access database — use services"
    type: layer_boundary
    expression: "api -> database"
    severity: high
    enforcement: block
```

### `policies/dependencies.yaml`
```yaml
forbidden_packages:
  - requests          # use httpx instead (async-native)
  - flask             # use fastapi
  - django            # use fastapi

allowed_licenses:
  - MIT
  - Apache-2.0
  - BSD-3-Clause
```

---

## Coding Rules (BOB must enforce these for Pair A)

1. **Analyzers are pure functions** — no DB writes, no Redis calls, no side effects.
2. **Graph is read-only during agent execution** — agents query, never mutate.
3. **Every Finding must include**: `evidence` (file:line citation), `confidence`, `affected_files`.
4. **Hard blocks only from deterministic rules** — no `blocking=True` for heuristic findings.
5. **Impact Agent triggers REVIEW, never BLOCK** — it is a scoring agent only.
6. **No deprecated packages** — verify against `policies/dependencies.yaml` first.
