"""
Backend Research & Context Agent for Architectural Pre-Flight.

This agent autonomously researches backend-specific architectural specifications,
data models, agent protocols, graph schemas, and policy definitions from the PRD,
and generates the authoritative Antigravity context file (`GEMINI.md`) and rules
solely for the backend of the Architectural Pre-Flight project.
"""

import os
import sys
import json
from pathlib import Path
from dataclasses import dataclass, field
from typing import Dict, List, Any


@dataclass
class BackendModuleSpec:
    path: str
    purpose: str
    key_responsibilities: List[str]
    dependencies: List[str]


@dataclass
class SpecialistAgentSpec:
    name: str
    role: str
    responsibilities: List[str]
    inputs: List[str]
    outputs: List[str]
    blocking_conditions: List[str]


class BackendResearchAgent:
    """Autonomous agent that researches backend requirements and builds Antigravity context files."""

    def __init__(self, root_dir: Path):
        self.root_dir = root_dir
        self.context_data: Dict[str, Any] = {}

    def step_1_research_runtime_and_stack(self) -> Dict[str, Any]:
        """Researches and standardizes backend runtime, frameworks, and core engines."""
        return {
            "language": "Python 3.11+",
            "web_framework": "FastAPI",
            "validation_engine": "Pydantic v2",
            "graph_analysis_engine": "NetworkX (Directed Multi-Graph for AST & Dependency topology)",
            "ast_parsing": "Tree-sitter (Multi-language grammar support)",
            "schema_parsers": [
                "OpenAPI 3.x / Swagger",
                "JSON Schema",
                "GraphQL Schema (graphql-core)",
                "AsyncAPI / Event Schemas",
                "Protobuf Descriptors",
                "SQL DDL / Schema Parser (sqlglot / sqlalchemy)"
            ],
            "primary_database": "PostgreSQL (Project metadata, contracts, rules, findings)",
            "caching_and_jobs": "Redis (Async job queues, graph cache)",
            "ai_reasoning_orchestrator": "Antigravity Agent Framework / IBM Bob Subagents"
        }

    def step_2_research_directory_structure(self) -> List[BackendModuleSpec]:
        """Researches the exact module layout of the backend and analyzer subsystems."""
        return [
            BackendModuleSpec(
                path="backend/api/",
                purpose="FastAPI routing layer exposing REST APIs and WebSocket streams for Pre-Flight operations.",
                key_responsibilities=[
                    "POST /api/preflight: Orchestrate pre-flight check on change intent",
                    "GET /api/projects/{id}/graph: Serve serialized repository knowledge graph",
                    "GET /api/findings/{id}: Deliver finding details with full evidence chain",
                    "POST /api/remediate: Generate structured remediation plans",
                    "POST /api/ci: CI/CD exit-code compatible enforcement endpoint"
                ],
                dependencies=["backend/agents/orchestrator", "backend/decision", "backend/graph"]
            ),
            BackendModuleSpec(
                path="backend/agents/",
                purpose="Parallel specialist AI subagents and orchestrator engine.",
                key_responsibilities=[
                    "Orchestrator: Deconstruct natural language change intent into structured change request",
                    "Parallel dispatch to 5 specialist subagents",
                    "Collect structured findings, calculate blast radius, enforce deterministic policies"
                ],
                dependencies=["backend/graph", "backend/policies", "backend/contracts", "backend/evidence"]
            ),
            BackendModuleSpec(
                path="backend/agents/architecture/",
                purpose="Architecture Agent verifying structural and layer invariants.",
                key_responsibilities=[
                    "Check layer access violations (e.g., frontend -> database forbidden)",
                    "Detect circular imports and unwanted module coupling",
                    "Detect duplicate abstractions and recommend extending existing services",
                    "Validate service boundary adherence"
                ],
                dependencies=["backend/graph", "backend/policies"]
            ),
            BackendModuleSpec(
                path="backend/agents/contracts/",
                purpose="Contract Agent validating interface, schema, and consumer contracts.",
                key_responsibilities=[
                    "Discover API, Type, Event, Database, and Configuration contracts",
                    "Map consumer/provider relationships",
                    "Detect breaking changes to public/internal contracts before implementation"
                ],
                dependencies=["backend/graph", "backend/contracts"]
            ),
            BackendModuleSpec(
                path="backend/agents/dependencies/",
                purpose="Dependency Guardian preventing supply-chain and architectural package decay.",
                key_responsibilities=[
                    "Inspect proposed package additions against manifests and lockfiles",
                    "Verify deprecation status, license compatibility, and policy compliance",
                    "Detect if an existing internal abstraction already provides requested capability",
                    "Prevent adoption of deprecated heuristic packages (Zero-decay KPI)"
                ],
                dependencies=["backend/policies", "analyzers/dependencies"]
            ),
            BackendModuleSpec(
                path="backend/agents/impact/",
                purpose="Impact Analysis Agent calculating blast radius and downstream consumers.",
                key_responsibilities=[
                    "Traverse knowledge graph from proposed modification points",
                    "Compute affected files, services, endpoints, tables, and consumers",
                    "Classify change blast radius and quantify blast radius uncertainty"
                ],
                dependencies=["backend/graph"]
            ),
            BackendModuleSpec(
                path="backend/agents/security/",
                purpose="Security Agent inspecting safety boundaries.",
                key_responsibilities=[
                    "Check authentication and authorization boundary modifications",
                    "Detect hardcoded secrets, unsafe direct database connections, and credential exposure",
                    "Verify sensitive data flows and privilege escalation risks"
                ],
                dependencies=["backend/graph", "backend/policies"]
            ),
            BackendModuleSpec(
                path="backend/graph/",
                purpose="Repository Knowledge Graph engine powered by NetworkX.",
                key_responsibilities=[
                    "Store and index Code Modules, Symbols, Imports, Calls, Endpoints, DB tables, and Events",
                    "Support typed edge relationships: imports, calls, depends_on, consumes, provides, writes, reads, publishes, subscribes",
                    "Provide topological sorting, cycle detection, and reachable subgraph extraction"
                ],
                dependencies=["analyzers/"]
            ),
            BackendModuleSpec(
                path="backend/policies/",
                purpose="Architecture-as-Code engine for deterministic enforcement.",
                key_responsibilities=[
                    "Parse YAML policies (architecture.yaml, dependencies.yaml, contracts.yaml)",
                    "Provide deterministic boolean evaluation functions for AST relationships",
                    "Act as non-bypassable hard gate for forbidden dependencies or layer hops"
                ],
                dependencies=[]
            ),
            BackendModuleSpec(
                path="backend/decision/",
                purpose="Pre-Flight Decision Engine implementing transparent risk scoring.",
                key_responsibilities=[
                    "Compute Risk = architecture + contract + dependency + security + surface + uncertainty",
                    "Classify final state: PASS (cleared), REVIEW (uncertain/high impact), BLOCK (policy/contract violation)",
                    "Separate deterministic hard blocks from evidence-based AI inference"
                ],
                dependencies=["backend/policies", "backend/agents"]
            ),
            BackendModuleSpec(
                path="backend/evidence/",
                purpose="Evidence Explorer and audit trail engine.",
                key_responsibilities=[
                    "Attach exact file paths, line numbers, symbols, consumers, and rule IDs to every finding",
                    "Record confidence ratings (0.0 to 1.0) and severity categorizations"
                ],
                dependencies=[]
            ),
            BackendModuleSpec(
                path="backend/remediation/",
                purpose="Remediation Planner generating compliant alternatives.",
                key_responsibilities=[
                    "Generate ordered step-by-step refactoring guides when changes are BLOCKED",
                    "Map compliant paths (e.g., extending existing service instead of creating duplicate)"
                ],
                dependencies=["backend/graph", "backend/policies"]
            ),
            BackendModuleSpec(
                path="analyzers/",
                purpose="Multi-format static and schema extraction engines.",
                key_responsibilities=[
                    "analyzers/source: Tree-sitter AST extraction for symbols, calls, imports",
                    "analyzers/dependencies: Manifest & lockfile parser",
                    "analyzers/openapi: OpenAPI 3.x parser",
                    "analyzers/graphql: GraphQL schema parser",
                    "analyzers/database: SQL DDL and migration parser",
                    "analyzers/git: Git diff and history analyzer"
                ],
                dependencies=[]
            )
        ]

    def step_3_research_specialist_agents(self) -> List[SpecialistAgentSpec]:
        """Researches the exact operational contracts of the 5 specialist subagents."""
        return [
            SpecialistAgentSpec(
                name="Architecture Agent",
                role="Enforces architectural layering, boundaries, and abstraction reuse.",
                responsibilities=[
                    "Evaluate layer boundary rules (e.g., frontend -> DB = forbidden)",
                    "Detect circular dependencies across modules",
                    "Detect duplicate abstractions (e.g., NewPaymentService when PaymentService exists)",
                    "Verify architectural design records (ADRs) compatibility"
                ],
                inputs=["Proposed change AST delta", "Repository Knowledge Graph", "architecture.yaml"],
                outputs=["List[Finding] (Category: architecture, severity: HIGH/CRITICAL/MEDIUM)"],
                blocking_conditions=["Explicit layer rule violation", "Unapproved circular coupling"]
            ),
            SpecialistAgentSpec(
                name="Contract Agent",
                role="Discovers and validates interface contracts across APIs, events, and databases.",
                responsibilities=[
                    "Track consumer/provider dependencies for REST endpoints, GraphQL, and events",
                    "Detect breaking changes to types, parameters, fields, or database tables",
                    "Identify affected downstream consumers"
                ],
                inputs=["Proposed interface modification", "Discovered Contracts Registry", "Consumer mappings"],
                outputs=["List[Finding] (Category: contract, severity: CRITICAL/HIGH/MEDIUM)"],
                blocking_conditions=["Breaking change with active downstream consumers", "Schema incompatibility"]
            ),
            SpecialistAgentSpec(
                name="Dependency Guardian",
                role="Enforces package policies, deprecation checks, and internal abstraction preference.",
                responsibilities=[
                    "Check proposed libraries against policies/dependencies.yaml",
                    "Verify package deprecation via package manager metadata",
                    "Check if an existing internal library/adapter already handles the requested function",
                    "Flag unnecessary third-party packages"
                ],
                inputs=["Requested package manifests", "dependencies.yaml", "Existing project dependencies"],
                outputs=["List[Finding] (Category: dependency, severity: CRITICAL/HIGH/LOW)"],
                blocking_conditions=["Forbidden dependency listed in policy", "Deprecated package adoption"]
            ),
            SpecialistAgentSpec(
                name="Impact Analysis Agent",
                role="Quantifies downstream blast radius and topological reachability.",
                responsibilities=[
                    "Calculate total affected files, services, endpoints, and database tables",
                    "Identify affected unit/integration tests",
                    "Compute change surface score and uncertainty score"
                ],
                inputs=["Proposed change target symbols", "Repository Knowledge Graph"],
                outputs=["List[Finding] (Category: impact, risk_metric: RiskScore, blast_radius: int)"],
                blocking_conditions=["High impact accompanied by unverified critical consumers (triggers REVIEW)"]
            ),
            SpecialistAgentSpec(
                name="Security Agent",
                role="Inspects security boundaries, authorization bypasses, and data exposure.",
                responsibilities=[
                    "Detect bypasses of authentication or authorization gateways",
                    "Prevent direct database connections from untrusted client tiers",
                    "Detect leaked credentials, secrets, or improper environment variable exposures"
                ],
                inputs=["Proposed change diff", "Security boundary rules", "Data flow graph"],
                outputs=["List[Finding] (Category: security, severity: CRITICAL/HIGH)"],
                blocking_conditions=["Direct database exposure to frontend", "Authorization bypass"]
            )
        ]

    def step_4_research_data_models(self) -> Dict[str, str]:
        """Researches and provides exact Pydantic v2 data models for backend domain objects."""
        return {
            "Project": """class Project(BaseModel):
    id: str = Field(..., description="Unique project identifier")
    name: str = Field(..., description="Human-readable project name")
    repository: str = Field(..., description="VCS repository URL or local path")
    default_branch: str = Field(default="main")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_indexed_at: Optional[datetime] = None""",

            "Component": """class Component(BaseModel):
    id: str = Field(..., description="Unique component identifier")
    project_id: str
    name: str
    type: str = Field(..., description="service | repository | controller | endpoint | model | table | event")
    path: str = Field(..., description="File path within the repository")
    owner: Optional[str] = None""",

            "Relationship": """class RelationshipType(str, Enum):
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
    evidence: str = Field(..., description="Code snippet, import statement, or file:line citation")""",

            "Contract": """class ContractType(str, Enum):
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
    providers: List[str] = Field(default_factory=list)""",

            "ArchitectureRule": """class EnforcementAction(str, Enum):
    BLOCK = "block"
    REVIEW = "review"
    WARN = "warn"

class ArchitectureRule(BaseModel):
    id: str = Field(..., description="Rule ID e.g. ARCH-001")
    project_id: str
    rule_type: str = Field(..., description="layer_boundary | forbidden_dependency | circular_dependency | contract_compatibility")
    expression: str = Field(..., description="Specification expression e.g. 'frontend -> database'")
    severity: str = Field(default="high", description="low | medium | high | critical")
    enforcement: EnforcementAction = EnforcementAction.BLOCK""",

            "Finding": """class FindingCategory(str, Enum):
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
    blocking: bool = False""",

            "PreflightDecision": """class PreflightStatus(str, Enum):
    PASS = "PASS"
    REVIEW = "REVIEW"
    BLOCK = "BLOCK"

class PreflightResponse(BaseModel):
    status: PreflightStatus
    risk: str = Field(..., description="LOW | MEDIUM | HIGH | CRITICAL")
    findings: List[Finding]
    affected_files_count: int
    recommendation: Optional[str] = None"""
        }

    def step_5_research_decision_engine(self) -> Dict[str, Any]:
        """Researches the risk model, trust tiers, and decision pipeline."""
        return {
            "risk_formula": "Risk = architecture_impact + contract_impact + dependency_impact + security_impact + change_surface + uncertainty",
            "trust_tiers": {
                "deterministic": {
                    "basis": "Concrete AST imports, forbidden YAML dependency matching, schema diff breaking changes, explicit layer rules",
                    "action": "Hard BLOCK if violated. Zero false-negatives allowed for explicit rules."
                },
                "evidence_based_ai_inference": {
                    "basis": "Duplicate abstraction heuristics, high structural coupling, pattern inconsistencies",
                    "action": "REVIEW status with human approval recommendation. Never hard block solely on probabilistic heuristic."
                },
                "unknown": {
                    "basis": "Undocumented external consumers or missing schemas",
                    "action": "Flag as UNKNOWN, mandate human review rather than assuming safety."
                }
            },
            "status_rules": {
                "BLOCK": "Triggered when 1+ blocking findings exist (from deterministic rule violations or breaking contract changes).",
                "REVIEW": "Triggered when no hard blocking findings exist, but high risk or AI inference uncertainty requires human sign-off.",
                "PASS": "Triggered when no blocking findings exist and risk score is within acceptable threshold."
            }
        }

    def compile_antigravity_context(self) -> str:
        """Synthesizes all backend research into an authoritative Antigravity context file."""
        runtime = self.step_1_research_runtime_and_stack()
        modules = self.step_2_research_directory_structure()
        agents = self.step_3_research_specialist_agents()
        models = self.step_4_research_data_models()
        decision = self.step_5_research_decision_engine()

        content = []
        content.append("# Antigravity Context: Architectural Pre-Flight (Backend Subsystem)")
        content.append("")
        content.append("> **Workspace Boundary**: This context file applies **exclusively to the Backend, Analyzers, Policies, and Backend Agents** of Architectural Pre-Flight. It governs Python/FastAPI development, NetworkX knowledge graph operations, Tree-sitter code analysis, Pydantic data modeling, and deterministic policy gating. Do not introduce frontend or non-backend dependencies.")
        content.append("")
        content.append("## 1. System Vision & Purpose")
        content.append("Architectural Pre-Flight is an autonomous engineering governance engine that sits **before implementation**. It validates whether a proposed software change should be built before an AI coding agent writes the code.")
        content.append("The backend is the brain and deterministic execution engine of the system, responsible for:")
        content.append("1. Ingesting repository source code and parsing ASTs into an in-memory NetworkX knowledge graph.")
        content.append("2. Ingesting natural-language change intent and deconstructing it into structured change requests.")
        content.append("3. Orchestrating 5 parallel specialist agents (Architecture, Contracts, Dependencies, Impact, Security).")
        content.append("4. Enforcing Architecture-as-Code policies deterministically.")
        content.append("5. Calculating risk scores and producing the final pre-flight decision: `PASS`, `REVIEW`, or `BLOCK`.")
        content.append("6. Generating evidence-backed remediation refactoring plans.")
        content.append("")
        content.append("---")
        content.append("")
        content.append("## 2. Core Backend Technology Stack")
        content.append(f"- **Runtime & Language**: {runtime['language']}")
        content.append(f"- **API Framework**: {runtime['web_framework']}")
        content.append(f"- **Data Modeling & Validation**: {runtime['validation_engine']}")
        content.append(f"- **Knowledge Graph Engine**: {runtime['graph_analysis_engine']}")
        content.append(f"- **AST Parsing Engine**: {runtime['ast_parsing']}")
        content.append("- **Contract & Schema Parsers**:")
        for sp in runtime['schema_parsers']:
            content.append(f"  - {sp}")
        content.append(f"- **Persistent Storage**: {runtime['primary_database']}")
        content.append(f"- **Task Queue & Caching**: {runtime['caching_and_jobs']}")
        content.append("")
        content.append("---")
        content.append("")
        content.append("## 3. Directory Layout & Subsystem Responsibilities")
        content.append("Every backend file must reside in its designated domain boundary:")
        content.append("```")
        content.append("backend/")
        content.append("├── api/              # FastAPI endpoints (preflight, graph, findings, remediate, ci)")
        content.append("├── agents/           # Orchestrator & 5 parallel specialist subagents")
        content.append("│   ├── orchestrator.py")
        content.append("│   ├── architecture/ # Layer invariants, circular dependencies, duplicate abstractions")
        content.append("│   ├── contracts/    # API, Type, Event, and DB contract validation")
        content.append("│   ├── dependencies/ # Manifest analysis, deprecation prevention, internal alternatives")
        content.append("│   ├── impact/       # Graph traversal, blast radius, test surface calculation")
        content.append("│   └── security/     # Auth boundaries, direct DB access bypasses, secrets")
        content.append("├── graph/            # NetworkX Repository Knowledge Graph engine")
        content.append("├── contracts/        # Discovered contract registry and schema diff engine")
        content.append("├── policies/         # Architecture-as-Code YAML parser and deterministic evaluator")
        content.append("├── decision/         # Risk equation and PASS/REVIEW/BLOCK decision engine")
        content.append("├── evidence/         # Evidence explorer (file, line, AST symbol, confidence)")
        content.append("└── remediation/      # Step-by-step refactoring proposal generator")
        content.append("analyzers/            # Independent parsing engines (Tree-sitter, OpenAPI, DB, Git)")
        content.append("policies/             # Declarative rules (architecture.yaml, dependencies.yaml, contracts.yaml)")
        content.append("```")
        content.append("")
        for mod in modules:
            content.append(f"### `{mod.path}`")
            content.append(f"- **Purpose**: {mod.purpose}")
            content.append("- **Key Responsibilities**:")
            for resp in mod.key_responsibilities:
                content.append(f"  - {resp}")
            if mod.dependencies:
                content.append(f"- **Allowed Dependencies**: `{', '.join(mod.dependencies)}`")
            content.append("")
        content.append("---")
        content.append("")
        content.append("## 4. Specialist Subagent Protocols")
        content.append("The orchestrator dispatches analysis in parallel to 5 specialist agents:")
        for ag in agents:
            content.append(f"### {ag.name}")
            content.append(f"- **Role**: {ag.role}")
            content.append(f"- **Responsibilities**:")
            for r in ag.responsibilities:
                content.append(f"  - {r}")
            content.append(f"- **Inputs**: `{', '.join(ag.inputs)}`")
            content.append(f"- **Outputs**: `{', '.join(ag.outputs)}`")
            content.append(f"- **Hard Blocking Triggers**: `{', '.join(ag.blocking_conditions)}`")
            content.append("")
        content.append("---")
        content.append("")
        content.append("## 5. Domain Data Models (Pydantic v2)")
        content.append("All backend services, APIs, and agents communicate using these standardized Pydantic schemas:")
        for name, code in models.items():
            content.append(f"### `{name}`")
            content.append("```python")
            content.append(code)
            content.append("```")
            content.append("")
        content.append("---")
        content.append("")
        content.append("## 6. Repository Knowledge Graph Specification")
        content.append("The backend maintains an in-memory NetworkX directed multigraph (`MultiDiGraph`):")
        content.append("- **Nodes**: Represent `Component` entities:")
        content.append("  - Attributes: `id`, `name`, `type`, `path`, `owner`, `ast_metadata`.")
        content.append("- **Edges**: Represent `Relationship` entities:")
        content.append("  - Types: `imports`, `calls`, `depends_on`, `consumes`, `provides`, `writes`, `reads`, `publishes`, `subscribes`.")
        content.append("  - Attributes: `evidence` (file:line, snippet), `weight`, `is_transitive`.")
        content.append("- **Operations**:")
        content.append("  - Topological cycle detection (`nx.simple_cycles`)")
        content.append("  - Reachable downstream consumers (`nx.descendants`)")
        content.append("  - Shortest dependency path (`nx.shortest_path`)")
        content.append("")
        content.append("---")
        content.append("")
        content.append("## 7. Decision Engine & Risk Model")
        content.append("The decision engine determines whether a change can proceed:")
        content.append("```")
        content.append(decision["risk_formula"])
        content.append("```")
        content.append("### Trust Tiering Architecture")
        content.append("1. **Deterministic Tier**:")
        content.append(f"   - {decision['trust_tiers']['deterministic']['basis']}")
        content.append(f"   - Outcome: {decision['trust_tiers']['deterministic']['action']}")
        content.append("2. **Evidence-based AI Inference Tier**:")
        content.append(f"   - {decision['trust_tiers']['evidence_based_ai_inference']['basis']}")
        content.append(f"   - Outcome: {decision['trust_tiers']['evidence_based_ai_inference']['action']}")
        content.append("3. **Unknown Tier**:")
        content.append(f"   - {decision['trust_tiers']['unknown']['basis']}")
        content.append(f"   - Outcome: {decision['trust_tiers']['unknown']['action']}")
        content.append("")
        content.append("### Final Gate Decision Rules")
        content.append(f"- **BLOCK**: {decision['status_rules']['BLOCK']}")
        content.append(f"- **REVIEW**: {decision['status_rules']['REVIEW']}")
        content.append(f"- **PASS**: {decision['status_rules']['PASS']}")
        content.append("")
        content.append("---")
        content.append("")
        content.append("## 8. Backend Coding Conventions & Strict Guardrails")
        content.append("When implementing or modifying code in this backend workspace, Antigravity agents MUST follow these strict rules:")
        content.append("1. **No Frontend Drift**: Do not write React, HTML, CSS, Vite, or client-side UI code in this workspace.")
        content.append("2. **Strict Type Safety**: All Python code must be fully type-hinted and validate with Pydantic v2.")
        content.append("3. **Deterministic Separation**: Always separate deterministic rule checks (regex, AST traversal, YAML policies) from LLM reasoning.")
        content.append("4. **Evidence Grounding**: Never create a `Finding` without concrete evidence (file path, line number, or AST node citation).")
        content.append("5. **Zero Deprecated Dependencies**: Never adopt or allow deprecated libraries; enforce `policies/dependencies.yaml` strictly.")
        content.append("6. **Non-blocking Unknowns**: Never convert lack of information into an assumed pass or an unsubstantiated hard block; use `REVIEW` with clear explanations.")
        content.append("")

        return "\n".join(content)

    def compile_antigravity_rules(self) -> str:
        """Synthesizes modular hierarchical Antigravity rule."""
        content = []
        content.append("---")
        content.append("description: Backend architectural integrity and governance rules for Architectural Pre-Flight")
        content.append("globs: backend/**/*.py, analyzers/**/*.py, policies/**/*.yaml")
        content.append("always_on: true")
        content.append("---")
        content.append("")
        content.append("# Backend Architectural Governance Rules")
        content.append("")
        content.append("## Core Directives")
        content.append("1. **Backend Boundary**: You are working in the backend of Architectural Pre-Flight. All implementations must use Python 3.11+, FastAPI, Pydantic v2, NetworkX, and Tree-sitter.")
        content.append("2. **Strict Layer Enforcement**: Follow the layered dependency model:")
        content.append("   - `backend/api/` -> calls `backend/agents/orchestrator.py` and `backend/decision`.")
        content.append("   - `backend/agents/` -> queries `backend/graph/`, `backend/policies/`, and `backend/contracts/`.")
        content.append("   - `backend/graph/` -> uses data parsed by `analyzers/`.")
        content.append("   - `analyzers/` -> standalone parsers; must not import `backend/agents/` or `backend/api/`.")
        content.append("3. **Evidence Requirement**: Every generated Finding must include: `id`, `category`, `severity`, `confidence`, `evidence`, `affected_files`.")
        content.append("4. **Deterministic Hard Gates**: Hard blocks (`BLOCK`) can only be triggered by deterministic rule violations (layer rules, forbidden dependency list, schema breakage). Probabilistic inferences must map to `REVIEW`.")
        content.append("5. **No Hallucinated Packages**: Verify any library against existing `pyproject.toml` or `requirements.txt` before importing.")
        content.append("")
        return "\n".join(content)

    def run(self) -> Dict[str, Any]:
        """Executes the research process and generates context and rule files."""
        print("Starting Backend Research Agent execution...")
        context_text = self.compile_antigravity_context()
        rules_text = self.compile_antigravity_rules()

        # Write GEMINI.md (Antigravity Context File)
        gemini_md_path = self.root_dir / "GEMINI.md"
        with open(gemini_md_path, "w", encoding="utf-8") as f:
            f.write(context_text)
        print(f"Generated Antigravity Context File: {gemini_md_path}")

        # Write .agent/rules/backend_architecture_rules.md
        rules_dir = self.root_dir / ".agent" / "rules"
        rules_dir.mkdir(parents=True, exist_ok=True)
        rules_md_path = rules_dir / "backend_architecture_rules.md"
        with open(rules_md_path, "w", encoding="utf-8") as f:
            f.write(rules_text)
        print(f"Generated Antigravity Rules File: {rules_md_path}")

        return {
            "status": "success",
            "context_file": str(gemini_md_path),
            "rules_file": str(rules_md_path),
            "context_length": len(context_text),
            "rules_length": len(rules_text)
        }


if __name__ == "__main__":
    project_root = Path(__file__).resolve().parent.parent
    agent = BackendResearchAgent(project_root)
    result = agent.run()
    print(json.dumps(result, indent=2))
