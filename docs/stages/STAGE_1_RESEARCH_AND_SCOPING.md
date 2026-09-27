# Stage 1: Research & Scope Extraction (Backend Only)

## TL;DR
> **tl;dr**: We extracted and mapped all backend-specific requirements directly from the Architectural Pre-Flight PRD without drifting into frontend aspects. This includes defining the FastAPI runtime, NetworkX repository knowledge graph, Tree-sitter and multi-format AST analyzers, the 5 specialist subagents (Architecture, Contracts, Dependencies, Impact, Security), deterministic policy evaluation engine, Pydantic data schemas, and the 3-state (PASS, REVIEW, BLOCK) decision pipeline.

---

## 1. Objective of this Stage
The objective of Stage 1 is to strictly isolate, research, and decompose the backend architecture defined in the Product Requirements Document (PRD) for the **Architectural Pre-Flight & Contract Enforcement Engine**.

Per instructions:
1. **Zero drift** from the provided PRD markdown file.
2. Focus **only on the backend** of the project (`backend/`, `analyzers/`, `policies/`, `contracts/`, `graph/`, and backend agent orchestration).
3. Document what is being performed at each stage using a clear `tl;dr`.

---

## 2. PRD Backend Extraction Matrix

Based on Sections 9, 11, 12, 13, 14, 15, 31, 32, 33, 34, and 36 of the PRD, the backend architecture encompasses:

### A. Core Backend Runtime & Libraries
- **Framework**: Python 3.11+, FastAPI (REST endpoints for analysis, validation, remediation).
- **Validation & Serialization**: Pydantic v2 (Strict type-safe schemas).
- **Graph Engine**: NetworkX (In-memory directed multi-graph for dependency, call, and consumer topological modeling).
- **Code & Contract Parsing**: Tree-sitter (AST for Python, TypeScript, etc.), OpenAPI 3.x parser, JSON Schema parser, AsyncAPI parser, GraphQL schema parser, Protobuf descriptor parser, SQL DDL parser.
- **Persistence**: PostgreSQL (Projects, components, contracts, rules, change requests, findings, audit trails).
- **Task & Cache Layer**: Redis (Job state management, cached repository indexes, asynchronous pre-flight task execution).

### B. Backend Subsystems (`backend/`)
1. **`backend/api/`**:
   - `POST /api/preflight`: Accepts `{ projectId, change, branch }`, triggers orchestrator, returns `{ status, risk, findings, affectedFiles, recommendation }`.
   - `GET /api/projects/{id}/graph`: Exposes repository knowledge graph topology.
   - `GET /api/findings/{id}`: Detailed finding inspection with evidence trail.
   - `POST /api/remediate`: Generates actionable remediation plans for blocked or review findings.
   - `POST /api/ci`: CI/CD gate evaluation endpoint returning exit codes (0 for PASS/reviewed, 1 for BLOCKED).
2. **`backend/graph/` (Repository Knowledge Graph Engine)**:
   - Ingests AST and metadata from analyzers.
   - Builds directed multigraph of Components, Symbols, Files, Endpoints, Database Tables, Events.
   - Edge relationships: `imports`, `calls`, `depends_on`, `consumes`, `provides`, `writes`, `reads`, `publishes`, `subscribes`.
   - Calculates blast radiuses, cyclic dependencies, and reachability.
3. **`backend/agents/` (Parallel Specialist Subagents & Orchestrator)**:
   - **Pre-Flight Orchestrator (`orchestrator.py`)**: Natural-language change intent parser, coordinates subagents, evaluates deterministic policies, aggregates evidence, queries decision engine.
   - **Architecture Agent (`agents/architecture/`)**: Verifies layer boundaries (e.g. frontend $\to$ DB forbidden), circular imports, duplicate abstractions, pattern inconsistency, and internal coupling.
   - **Contract Agent (`agents/contracts/`)**: Discovers and validates API contracts (OpenAPI/REST), Type contracts (TypeScript/Pydantic), Event schemas (AsyncAPI/Kafka/Redis Streams), Database contracts (SQL DDL), and consumer/provider compatibility.
   - **Dependency Guardian (`agents/dependencies/`)**: Validates package manifests and lockfiles, blocks deprecated libraries, checks approved licenses, verifies version compatibility, detects existing internal replacements.
   - **Impact Analysis Agent (`agents/impact/`)**: Quantifies affected files, services, endpoints, tables, event consumers, and downstream dependencies.
   - **Security Agent (`agents/security/`)**: Detects authentication/authorization boundary changes, secrets exposure, sensitive data flows, direct DB bypasses, and privilege escalation risks.
4. **`backend/policies/` (Architecture-as-Code Engine)**:
   - Parses YAML policy specifications (`architecture.yaml`, `dependencies.yaml`, `contracts.yaml`).
   - Implements deterministic rule evaluation without LLM hallucination.
5. **`backend/decision/` (Pre-Flight Decision Engine)**:
   - Applies the transparent risk scoring formula:
     $$\text{Risk} = \text{architecture} + \text{contracts} + \text{dependencies} + \text{security} + \text{surface} + \text{uncertainty}$$
   - Outputs: `PASS`, `REVIEW`, or `BLOCK`.
   - Enforces trust tiering: Deterministic (Hard block) vs Evidence-based AI inference (Review) vs Unknown (Human Review).
6. **`backend/evidence/` (Evidence Explorer Engine)**:
   - Binds every finding to exact file paths, line numbers, AST symbols, rule IDs, and confidence scores ($0.0 - 1.0$).
7. **`backend/remediation/` (Remediation Planner)**:
   - Generates compliant step-by-step refactoring proposals when a change is blocked or flagged for review.

### C. Analyzers Subsystem (`analyzers/`)
- `analyzers/source/`: Tree-sitter grammar parsers for AST extraction.
- `analyzers/dependencies/`: Package manager manifest parsers (`package.json`, `requirements.txt`, `poetry.lock`, etc.).
- `analyzers/openapi/`: OpenAPI specification and route parser.
- `analyzers/graphql/`: GraphQL schema definitions parser.
- `analyzers/database/`: SQL DDL schema parser.
- `analyzers/git/`: Git diff and historical regression analyzer.

### D. Data Model Specifications (Section 13 of PRD)
- `Project`, `Component`, `Relationship`, `Contract`, `ArchitectureRule`, `ChangeRequest`, `Finding`.

---

## 3. Next Steps
In Stage 2, we will design and construct the **Backend Research Agent** (`backend_research_agent.py`), equipping it with the exact domain models, rules extraction logic, and synthesis pipeline necessary to generate the authoritative Antigravity context file for the backend.
