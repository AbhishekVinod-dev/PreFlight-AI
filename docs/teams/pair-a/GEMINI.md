# Pair A: Data Ingestion & Analysis Layer

## TL;DR
> **tl;dr**: Pair A owns everything that **feeds data into the system** — the multi-format parsers (`analyzers/`), the NetworkX repository knowledge graph (`backend/graph/`), and the 5 parallel specialist analysis agents (`backend/agents/`). Their output is a clean `List[Finding]` handed off to Pair B via the shared Pydantic contracts. Pair A must never touch the API layer, decision engine, or remediation planner.

---

## Ownership Boundary

```
analyzers/                        ← Pair A owns entirely
├── source/                       # Tree-sitter AST parser (Python, TS, etc.)
├── dependencies/                 # pyproject.toml / package.json lockfile parser
├── openapi/                      # OpenAPI 3.x spec parser
├── graphql/                      # GraphQL schema parser
├── database/                     # SQL DDL / migration parser
└── git/                          # Git diff & history analyzer

backend/graph/                    ← Pair A owns entirely
└── (NetworkX MultiDiGraph engine)

backend/agents/                   ← Pair A owns entirely
├── architecture/                 # Layer invariants, circular deps, duplicate abstractions
├── contracts/                    # API, Type, Event, DB contract validation
├── dependencies/                 # Package policy, deprecation, internal alternatives
├── impact/                       # Blast radius, topological reachability
└── security/                     # Auth boundaries, secrets, direct DB bypasses

backend/contracts/                ← Pair A owns (contract registry & schema diff)
policies/                         ← Pair A owns (YAML rule definitions)
```

**Pair A does NOT touch:**
- `backend/api/` (FastAPI endpoints)
- `backend/agents/orchestrator.py`
- `backend/decision/`
- `backend/evidence/`
- `backend/remediation/`

---

## Responsibilities

### 1. `analyzers/` — Multi-Format Parser Suite
Pair A builds all static analysis parsers that extract raw data from the repository:

| Sub-module | Technology | Output |
| :--- | :--- | :--- |
| `analyzers/source/` | Tree-sitter | `List[ASTNode]` — symbols, imports, calls |
| `analyzers/dependencies/` | stdlib / tomli | `List[Dependency]` — name, version, lockfile hash |
| `analyzers/openapi/` | pyyaml + jsonschema | `OpenAPISchema` — routes, parameters, responses |
| `analyzers/graphql/` | graphql-core | `GraphQLSchema` — types, fields, mutations |
| `analyzers/database/` | sqlglot / sqlalchemy | `List[TableDefinition]` — columns, constraints |
| `analyzers/git/` | pygit2 / GitPython | `GitDiff` — added/removed lines per file |

**Key Rule**: Analyzers are stateless, side-effect-free functions. They accept file paths or content strings and return structured Pydantic models. They **must not** import from `backend/agents/` or `backend/api/`.

---

### 2. `backend/graph/` — Repository Knowledge Graph

**Technology**: NetworkX `MultiDiGraph`

**Node Schema** (each node is a `Component`):
```
id         → str   (e.g. "backend.api.routes.preflight")
name       → str
type       → "service" | "endpoint" | "model" | "table" | "event" | "module"
path       → str   (relative file path)
ast_metadata → dict (line numbers, symbol names, docstrings)
```

**Edge Schema** (each edge is a `Relationship`):
```
type       → imports | calls | depends_on | consumes | provides | writes | reads | publishes | subscribes
evidence   → "file.py:42 → import PaymentService"
weight     → float (confidence 0.0–1.0)
is_transitive → bool
```

**Graph Operations Pair A Must Implement**:
| Operation | NetworkX API | Purpose |
| :--- | :--- | :--- |
| Cycle detection | `nx.simple_cycles(G)` | Architecture Agent: circular dependency |
| Downstream consumers | `nx.descendants(G, node)` | Impact Agent: blast radius |
| Shortest dep path | `nx.shortest_path(G, src, tgt)` | Evidence: dependency chain |
| Topological sort | `nx.topological_sort(G)` | Policy: layer ordering |
| Subgraph extraction | `G.subgraph(nodes)` | Impact: scoped blast view |

---

### 3. `backend/agents/` — 5 Specialist Subagents

Pair A implements all 5 specialist agents. Each agent follows this interface contract:

```python
class SpecialistAgent(Protocol):
    async def analyze(
        self,
        change_request: ChangeRequest,
        graph: nx.MultiDiGraph,
        policies: PolicySet,
    ) -> List[Finding]: ...
```

Each agent returns `List[Finding]` — nothing more. The orchestrator (Pair B) collects these.

#### Architecture Agent (`backend/agents/architecture/`)
- Evaluate layer boundary rules from `architecture.yaml`
- Detect cycles via `nx.simple_cycles`
- Flag duplicate abstractions by name similarity + import graph overlap
- **Hard Block**: Any explicit layer rule violation → `Finding(blocking=True)`

#### Contract Agent (`backend/agents/contracts/`)
- Diff proposed schema against `ContractRegistry`
- Map consumers via graph `CONSUMES` / `PROVIDES` edges
- **Hard Block**: Breaking field removal or type change with active consumers

#### Dependency Guardian (`backend/agents/dependencies/`)
- Parse proposed `requirements.txt` / `pyproject.toml` against `dependencies.yaml`
- Check deprecation status via PyPI metadata
- Detect if internal adapters already exist in the graph
- **Hard Block**: Forbidden package or deprecated library adoption

#### Impact Analysis Agent (`backend/agents/impact/`)
- Traverse `nx.descendants` from modified symbols
- Count affected files, endpoints, tables, events, and test files
- Compute `blast_radius: int` and `uncertainty: float`
- **Triggers REVIEW** (not BLOCK) when blast_radius > threshold and consumers are undocumented

#### Security Agent (`backend/agents/security/`)
- Check graph for `frontend → database` direct edges (immediate BLOCK)
- Scan AST for hardcoded credential patterns
- Verify auth middleware presence on sensitive routes
- **Hard Block**: Direct DB exposure or authorization bypass

---

### 4. `backend/contracts/` — Contract Registry & Schema Diff Engine
- Maintains an indexed store of all discovered contracts by type and version
- Implements breaking-change diff: field removal, type widening/narrowing, parameter addition (required vs optional)

### 5. `policies/` — YAML Rule Definitions
Pair A authors and maintains:
- `policies/architecture.yaml` — layer rules, forbidden relationships
- `policies/dependencies.yaml` — blocked packages, license allowlist
- `policies/contracts.yaml` — compatibility thresholds

---

## Shared Contracts with Pair B (The Handoff)

Pair A's agents **output** these Pydantic models. Pair B **consumes** them. These schemas are the team boundary:

```python
# What Pair A produces → what Pair B reads
List[Finding]           # Core output of every specialist agent
nx.MultiDiGraph         # Passed to orchestrator (read-only for Pair B)
ChangeRequest           # Shared input — defined in backend/schemas/
PolicySet               # Shared — loaded from policies/ YAML
```

**Both pairs must agree on `backend/schemas/shared.py`** before coding begins. Changes to shared schemas require sign-off from both pairs.

---

## Sprint Milestones for Pair A

| Milestone | Deliverable |
| :--- | :--- |
| **M1** | `analyzers/source/` Tree-sitter AST extractor for Python + TypeScript |
| **M2** | `backend/graph/` graph engine: node/edge ingestion + cycle detection |
| **M3** | Architecture Agent + Dependency Guardian (deterministic, policy-driven) |
| **M4** | Contract Agent + Impact Agent |
| **M5** | Security Agent + full `List[Finding]` test suite |

---

## Coding Guardrails (Pair A Specific)
1. **Analyzers are pure functions** — no side effects, no DB writes, no Redis calls.
2. **Graph is read-only during agent execution** — agents query the graph, they do not mutate it.
3. **Every `Finding` must include**: `evidence` (file:line), `confidence` (0.0–1.0), `affected_files`.
4. **Deterministic hard blocks** — Architecture, Contract, Dependency, Security hard blocks are boolean AST/policy evaluations only. No LLM guesswork.
5. **Impact Agent triggers `REVIEW`, never `BLOCK`** — it is an informational scoring agent.
