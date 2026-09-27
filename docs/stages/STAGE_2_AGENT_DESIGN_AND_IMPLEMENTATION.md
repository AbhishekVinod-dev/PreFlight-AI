# Stage 2: Agent Design & Implementation

## TL;DR
> **tl;dr**: In this stage, we design and implement a standalone, automated **Backend Research & Context Agent** (`backend_research_agent.py`). The agent is programmed with specialized analyzers to parse backend requirements directly from the PRD, extract exact schemas (Data Models, Architecture Rules, Graph Models, Decision Logic, 5 Specialist Agents), and compile an authoritative, production-grade Antigravity context file (`GEMINI.md`) specifically for the backend workspace without human intervention or hallucinations.

---

## 1. Objective of this Stage
Build an executable agent that:
1. Embodies the role of an autonomous architectural research engine.
2. Ingests and processes the PRD context focusing strictly on the backend.
3. Structures all architectural specifications into machine-readable models (Pydantic models, FastAPI routes, NetworkX schemas, YAML policy formats).
4. Generates standard Antigravity context files (`GEMINI.md`, `AGENTS.md`, `.agent/rules/`).

---

## 2. Agent Architecture & Components
The research agent (`backend_research_agent.py`) consists of the following modular subsystems:

```
BackendResearchAgent
│
├── 1. PRDContextExtractor
│     └── Extracts Backend Runtime, Analyzers, Agents, Models, Risk Engine, APIs
│
├── 2. BackendSpecificationSynthesizer
│     ├── DataModelSynthesizer (Pydantic definitions for Project, Component, Relationship, etc.)
│     ├── AgentContractSynthesizer (Protocols for 5 specialist subagents & orchestrator)
│     ├── GraphTopologySynthesizer (NetworkX multigraph edge/node ontology)
│     ├── PolicyRuleSynthesizer (YAML schema for architecture & dependency constraints)
│     └── DecisionEngineSynthesizer (Risk equation & 3-state deterministic gating)
│
├── 3. AntigravityContextCompiler
│     ├── Formats Antigravity directives (Progressive disclosure, system instructions)
│     ├── Generates `GEMINI.md` (Project context, backend rules, tech stack constraints)
│     └── Generates `.agent/rules/backend_architecture_rules.md` (Modular rule evaluation)
│
└── 4. VerificationSuite
      └── Validates zero drift against PRD, ensuring 100% backend boundary integrity.
```

---

## 3. Implementation Details
The agent will be written in Python 3 using clean typing, robust error handling, and structured data synthesis. It will run in the scratch project directory `/Users/regu/.gemini/antigravity/scratch/architectural-preflight-backend/`.

In the next step of this stage, we write the Python agent file and prepare it for execution.
