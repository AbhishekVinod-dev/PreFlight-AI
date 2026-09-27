# Antigravity Context: Architectural Pre-Flight (Backend Subsystem)

> **Workspace Boundary**: This context file applies **exclusively to the Backend, Analyzers, Policies, and Backend Agents** of Architectural Pre-Flight. It governs Python/FastAPI development, NetworkX knowledge graph operations, Tree-sitter code analysis, Pydantic data modeling, and deterministic policy gating. Do not introduce frontend or non-backend dependencies.

## 1. System Vision & Purpose
Architectural Pre-Flight is an autonomous engineering governance engine that sits **before implementation**. It validates whether a proposed software change should be built before an AI coding agent writes the code.
The backend is the brain and deterministic execution engine of the system, responsible for:
1. Ingesting repository source code and parsing ASTs into an in-memory NetworkX knowledge graph.
2. Ingesting natural-language change intent and deconstructing it into structured change requests.
3. Orchestrating 5 parallel specialist agents (Architecture, Contracts, Dependencies, Impact, Security).
4. Enforcing Architecture-as-Code policies deterministically.
5. Calculating risk scores and producing the final pre-flight decision: `PASS`, `REVIEW`, or `BLOCK`.
6. Generating evidence-backed remediation refactoring plans.

---

## 2. Core Backend Technology Stack
- **Runtime & Language**: Python 3.11+
- **API Framework**: FastAPI
- **Data Modeling & Validation**: Pydantic v2
- **Knowledge Graph Engine**: NetworkX (Directed Multi-Graph for AST & Dependency topology)
- **AST Parsing Engine**: Tree-sitter (Multi-language grammar support)
- **Contract & Schema Parsers**:
  - OpenAPI 3.x / Swagger
  - JSON Schema
  - GraphQL Schema (graphql-core)
  - AsyncAPI / Event Schemas
  - Protobuf Descriptors
  - SQL DDL / Schema Parser (sqlglot / sqlalchemy)
- **Persistent Storage**: PostgreSQL (Project metadata, contracts, rules, findings)
- **Task Queue & Caching**: Redis (Async job queues, graph cache)

---

## 3. Directory Layout & Subsystem Responsibilities
Every backend file must reside in its designated domain boundary:
```
backend/
├── api/              # FastAPI endpoints (preflight, graph, findings, remediate, ci)
├── agents/           # Orchestrator & 5 parallel specialist subagents
│   ├── orchestrator.py
│   ├── architecture/ # Layer invariants, circular dependencies, duplicate abstractions
│   ├── contracts/    # API, Type, Event, and DB contract validation
│   ├── dependencies/ # Manifest analysis, deprecation prevention, internal alternatives
│   ├── impact/       # Graph traversal, blast radius, test surface calculation
│   └── security/     # Auth boundaries, direct DB access bypasses, secrets
├── graph/            # NetworkX Repository Knowledge Graph engine
├── contracts/        # Discovered contract registry and schema diff engine
├── policies/         # Architecture-as-Code YAML parser and deterministic evaluator
├── decision/         # Risk equation and PASS/REVIEW/BLOCK decision engine
├── evidence/         # Evidence explorer (file, line, AST symbol, confidence)
└── remediation/      # Step-by-step refactoring proposal generator
analyzers/            # Independent parsing engines (Tree-sitter, OpenAPI, DB, Git)
policies/             # Declarative rules (architecture.yaml, dependencies.yaml, contracts.yaml)
```

### `backend/api/`
- **Purpose**: FastAPI routing layer exposing REST APIs and WebSocket streams for Pre-Flight operations.
- **Key Responsibilities**:
  - POST /api/preflight: Orchestrate pre-flight check on change intent
  - GET /api/projects/{id}/graph: Serve serialized repository knowledge graph
  - GET /api/findings/{id}: Deliver finding details with full evidence chain
  - POST /api/remediate: Generate structured remediation plans
  - POST /api/ci: CI/CD exit-code compatible enforcement endpoint
- **Allowed Dependencies**: `backend/agents/orchestrator, backend/decision, backend/graph`

### `backend/agents/`
- **Purpose**: Parallel specialist AI subagents and orchestrator engine.
- **Key Responsibilities**:
  - Orchestrator: Deconstruct natural language change intent into structured change request
  - Parallel dispatch to 5 specialist subagents
  - Collect structured findings, calculate blast radius, enforce deterministic policies
- **Allowed Dependencies**: `backend/graph, backend/policies, backend/contracts, backend/evidence`

### `backend/agents/architecture/`
- **Purpose**: Architecture Agent verifying structural and layer invariants.
- **Key Responsibilities**:
  - Check layer access violations (e.g., frontend -> database forbidden)
  - Detect circular imports and unwanted module coupling
  - Detect duplicate abstractions and recommend extending existing services
  - Validate service boundary adherence
- **Allowed Dependencies**: `backend/graph, backend/policies`

### `backend/agents/contracts/`
- **Purpose**: Contract Agent validating interface, schema, and consumer contracts.
- **Key Responsibilities**:
  - Discover API, Type, Event, Database, and Configuration contracts
  - Map consumer/provider relationships
  - Detect breaking changes to public/internal contracts before implementation
- **Allowed Dependencies**: `backend/graph, backend/contracts`

### `backend/agents/dependencies/`
- **Purpose**: Dependency Guardian preventing supply-chain and architectural package decay.
- **Key Responsibilities**:
  - Inspect proposed package additions against manifests and lockfiles
  - Verify deprecation status, license compatibility, and policy compliance
  - Detect if an existing internal abstraction already provides requested capability
  - Prevent adoption of deprecated heuristic packages (Zero-decay KPI)
- **Allowed Dependencies**: `backend/policies, analyzers/dependencies`

### `backend/agents/impact/`
- **Purpose**: Impact Analysis Agent calculating blast radius and downstream consumers.
- **Key Responsibilities**:
  - Traverse knowledge graph from proposed modification points
  - Compute affected files, services, endpoints, tables, and consumers
  - Classify change blast radius and quantify blast radius uncertainty
- **Allowed Dependencies**: `backend/graph`

### `backend/agents/security/`
- **Purpose**: Security Agent inspecting safety boundaries.
- **Key Responsibilities**:
  - Check authentication and authorization boundary modifications
  - Detect hardcoded secrets, unsafe direct database connections, and credential exposure
  - Verify sensitive data flows and privilege escalation risks
- **Allowed Dependencies**: `backend/graph, backend/policies`

### `backend/graph/`
- **Purpose**: Repository Knowledge Graph engine powered by NetworkX.
- **Key Responsibilities**:
  - Store and index Code Modules, Symbols, Imports, Calls, Endpoints, DB tables, and Events
  - Support typed edge relationships: imports, calls, depends_on, consumes, provides, writes, reads, publishes, subscribes
  - Provide topological sorting, cycle detection, and reachable subgraph extraction
- **Allowed Dependencies**: `analyzers/`

### `backend/policies/`
- **Purpose**: Architecture-as-Code engine for deterministic enforcement.
- **Key Responsibilities**:
  - Parse YAML policies (architecture.yaml, dependencies.yaml, contracts.yaml)
  - Provide deterministic boolean evaluation functions for AST relationships
  - Act as non-bypassable hard gate for forbidden dependencies or layer hops

### `backend/decision/`
- **Purpose**: Pre-Flight Decision Engine implementing transparent risk scoring.
- **Key Responsibilities**:
  - Compute Risk = architecture + contract + dependency + security + surface + uncertainty
  - Classify final state: PASS (cleared), REVIEW (uncertain/high impact), BLOCK (policy/contract violation)
  - Separate deterministic hard blocks from evidence-based AI inference
- **Allowed Dependencies**: `backend/policies, backend/agents`

### `backend/evidence/`
- **Purpose**: Evidence Explorer and audit trail engine.
- **Key Responsibilities**:
  - Attach exact file paths, line numbers, symbols, consumers, and rule IDs to every finding
  - Record confidence ratings (0.0 to 1.0) and severity categorizations

### `backend/remediation/`
- **Purpose**: Remediation Planner generating compliant alternatives.
- **Key Responsibilities**:
  - Generate ordered step-by-step refactoring guides when changes are BLOCKED
  - Map compliant paths (e.g., extending existing service instead of creating duplicate)
- **Allowed Dependencies**: `backend/graph, backend/policies`

### `analyzers/`
- **Purpose**: Multi-format static and schema extraction engines.
- **Key Responsibilities**:
  - analyzers/source: Tree-sitter AST extraction for symbols, calls, imports
  - analyzers/dependencies: Manifest & lockfile parser
  - analyzers/openapi: OpenAPI 3.x parser
  - analyzers/graphql: GraphQL schema parser
  - analyzers/database: SQL DDL and migration parser
  - analyzers/git: Git diff and history analyzer

---

## 4. Specialist Subagent Protocols
The orchestrator dispatches analysis in parallel to 5 specialist agents:
### Architecture Agent
- **Role**: Enforces architectural layering, boundaries, and abstraction reuse.
- **Responsibilities**:
  - Evaluate layer boundary rules (e.g., frontend -> DB = forbidden)
  - Detect circular dependencies across modules
  - Detect duplicate abstractions (e.g., NewPaymentService when PaymentService exists)
  - Verify architectural design records (ADRs) compatibility
- **Inputs**: `Proposed change AST delta, Repository Knowledge Graph, architecture.yaml`
- **Outputs**: `List[Finding] (Category: architecture, severity: HIGH/CRITICAL/MEDIUM)`
- **Hard Blocking Triggers**: `Explicit layer rule violation, Unapproved circular coupling`

### Contract Agent
- **Role**: Discovers and validates interface contracts across APIs, events, and databases.
- **Responsibilities**:
  - Track consumer/provider dependencies for REST endpoints, GraphQL, and events
  - Detect breaking changes to types, parameters, fields, or database tables
  - Identify affected downstream consumers
- **Inputs**: `Proposed interface modification, Discovered Contracts Registry, Consumer mappings`
- **Outputs**: `List[Finding] (Category: contract, severity: CRITICAL/HIGH/MEDIUM)`
- **Hard Blocking Triggers**: `Breaking change with active downstream consumers, Schema incompatibility`

### Dependency Guardian
- **Role**: Enforces package policies, deprecation checks, and internal abstraction preference.
- **Responsibilities**:
  - Check proposed libraries against policies/dependencies.yaml
  - Verify package deprecation via package manager metadata
  - Check if an existing internal library/adapter already handles the requested function
  - Flag unnecessary third-party packages
- **Inputs**: `Requested package manifests, dependencies.yaml, Existing project dependencies`
- **Outputs**: `List[Finding] (Category: dependency, severity: CRITICAL/HIGH/LOW)`
- **Hard Blocking Triggers**: `Forbidden dependency listed in policy, Deprecated package adoption`

### Impact Analysis Agent
- **Role**: Quantifies downstream blast radius and topological reachability.
- **Responsibilities**:
  - Calculate total affected files, services, endpoints, and database tables
  - Identify affected unit/integration tests
  - Compute change surface score and uncertainty score
- **Inputs**: `Proposed change target symbols, Repository Knowledge Graph`
- **Outputs**: `List[Finding] (Category: impact, risk_metric: RiskScore, blast_radius: int)`
- **Hard Blocking Triggers**: `High impact accompanied by unverified critical consumers (triggers REVIEW)`

### Security Agent
- **Role**: Inspects security boundaries, authorization bypasses, and data exposure.
- **Responsibilities**:
  - Detect bypasses of authentication or authorization gateways
  - Prevent direct database connections from untrusted client tiers
  - Detect leaked credentials, secrets, or improper environment variable exposures
- **Inputs**: `Proposed change diff, Security boundary rules, Data flow graph`
- **Outputs**: `List[Finding] (Category: security, severity: CRITICAL/HIGH)`
- **Hard Blocking Triggers**: `Direct database exposure to frontend, Authorization bypass`

---

## 5. Domain Data Models (Pydantic v2)
All backend services, APIs, and agents communicate using these standardized Pydantic schemas:
### `Project`
```python
class Project(BaseModel):
    id: str = Field(..., description="Unique project identifier")
    name: str = Field(..., description="Human-readable project name")
    repository: str = Field(..., description="VCS repository URL or local path")
    default_branch: str = Field(default="main")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_indexed_at: Optional[datetime] = None
```

### `Component`
```python
class Component(BaseModel):
    id: str = Field(..., description="Unique component identifier")
    project_id: str
    name: str
    type: str = Field(..., description="service | repository | controller | endpoint | model | table | event")
    path: str = Field(..., description="File path within the repository")
    owner: Optional[str] = None
```

### `Relationship`
```python
class RelationshipType(str, Enum):
    IMPORTS = "imports"
    CALLS = "calls"
    DEPENDS_ON = "depends_on"
    CONSUMES = "consumes"
    PROVIDES = "provides"
    WRITES = "writes"
    READS = "reads"
    PUBLISHES = "publishes"
    SUBSCRIBES = "subscribes"

class Relationship(BaseModel):
    source: str = Field(..., description="Source component ID")
    target: str = Field(..., description="Target component ID")
    type: RelationshipType
    evidence: str = Field(..., description="Code snippet, import statement, or file:line citation")
```

### `Contract`
```python
class ContractType(str, Enum):
    API = "api"
    TYPE = "type"
    EVENT = "event"
    DATABASE = "database"
    CONFIGURATION = "configuration"

class Contract(BaseModel):
    id: str
    project_id: str
    type: ContractType
    source: str = Field(..., description="Source file defining the contract (e.g. openapi.yaml, schema.sql)")
    version: str = Field(default="1.0.0")
    consumers: List[str] = Field(default_factory=list)
    providers: List[str] = Field(default_factory=list)
```

### `ArchitectureRule`
```python
class EnforcementAction(str, Enum):
    BLOCK = "block"
    REVIEW = "review"
    WARN = "warn"

class ArchitectureRule(BaseModel):
    id: str = Field(..., description="Rule ID e.g. ARCH-001")
    project_id: str
    rule_type: str = Field(..., description="layer_boundary | forbidden_dependency | circular_dependency | contract_compatibility")
    expression: str = Field(..., description="Specification expression e.g. 'frontend -> database'")
    severity: str = Field(default="high", description="low | medium | high | critical")
    enforcement: EnforcementAction = EnforcementAction.BLOCK
```

### `Finding`
```python
class FindingCategory(str, Enum):
    ARCHITECTURE = "architecture"
    CONTRACT = "contract"
    DEPENDENCY = "dependency"
    SECURITY = "security"
    IMPACT = "impact"

class FindingSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class Finding(BaseModel):
    id: str
    change_request_id: str
    category: FindingCategory
    severity: FindingSeverity
    confidence: float = Field(..., ge=0.0, le=1.0)
    title: str
    explanation: str
    evidence: List[str] = Field(default_factory=list)
    affected_files: List[str] = Field(default_factory=list)
    remediation: Optional[str] = None
    blocking: bool = False
```

### `PreflightDecision`
```python
class PreflightStatus(str, Enum):
    PASS = "PASS"
    REVIEW = "REVIEW"
    BLOCK = "BLOCK"

class PreflightResponse(BaseModel):
    status: PreflightStatus
    risk: str = Field(..., description="LOW | MEDIUM | HIGH | CRITICAL")
    findings: List[Finding]
    affected_files_count: int
    recommendation: Optional[str] = None
```

---

## 6. Repository Knowledge Graph Specification
The backend maintains an in-memory NetworkX directed multigraph (`MultiDiGraph`):
- **Nodes**: Represent `Component` entities:
  - Attributes: `id`, `name`, `type`, `path`, `owner`, `ast_metadata`.
- **Edges**: Represent `Relationship` entities:
  - Types: `imports`, `calls`, `depends_on`, `consumes`, `provides`, `writes`, `reads`, `publishes`, `subscribes`.
  - Attributes: `evidence` (file:line, snippet), `weight`, `is_transitive`.
- **Operations**:
  - Topological cycle detection (`nx.simple_cycles`)
  - Reachable downstream consumers (`nx.descendants`)
  - Shortest dependency path (`nx.shortest_path`)

---

## 7. Decision Engine & Risk Model
The decision engine determines whether a change can proceed:
```
Risk = architecture_impact + contract_impact + dependency_impact + security_impact + change_surface + uncertainty
```
### Trust Tiering Architecture
1. **Deterministic Tier**:
   - Concrete AST imports, forbidden YAML dependency matching, schema diff breaking changes, explicit layer rules
   - Outcome: Hard BLOCK if violated. Zero false-negatives allowed for explicit rules.
2. **Evidence-based AI Inference Tier**:
   - Duplicate abstraction heuristics, high structural coupling, pattern inconsistencies
   - Outcome: REVIEW status with human approval recommendation. Never hard block solely on probabilistic heuristic.
3. **Unknown Tier**:
   - Undocumented external consumers or missing schemas
   - Outcome: Flag as UNKNOWN, mandate human review rather than assuming safety.

### Final Gate Decision Rules
- **BLOCK**: Triggered when 1+ blocking findings exist (from deterministic rule violations or breaking contract changes).
- **REVIEW**: Triggered when no hard blocking findings exist, but high risk or AI inference uncertainty requires human sign-off.
- **PASS**: Triggered when no blocking findings exist and risk score is within acceptable threshold.

---

## 8. Backend Coding Conventions & Strict Guardrails
When implementing or modifying code in this backend workspace, Antigravity agents MUST follow these strict rules:
1. **No Frontend Drift**: Do not write React, HTML, CSS, Vite, or client-side UI code in this workspace.
2. **Strict Type Safety**: All Python code must be fully type-hinted and validate with Pydantic v2.
3. **Deterministic Separation**: Always separate deterministic rule checks (regex, AST traversal, YAML policies) from LLM reasoning.
4. **Evidence Grounding**: Never create a `Finding` without concrete evidence (file path, line number, or AST node citation).
5. **Zero Deprecated Dependencies**: Never adopt or allow deprecated libraries; enforce `policies/dependencies.yaml` strictly.
6. **Non-blocking Unknowns**: Never convert lack of information into an assumed pass or an unsubstantiated hard block; use `REVIEW` with clear explanations.
