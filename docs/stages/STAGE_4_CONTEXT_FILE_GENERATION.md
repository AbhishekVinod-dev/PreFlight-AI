# Stage 4: Antigravity Context File Generation

## TL;DR
> **tl;dr**: In this stage, the Antigravity context file (`GEMINI.md`) and hierarchical rules (`.agent/rules/backend_architecture_rules.md`) are generated directly into the backend project workspace. The context file equips any Antigravity agent operating on the backend with comprehensive domain knowledge, architectural boundaries, Pydantic v2 schemas, NetworkX graph semantics, the 5 specialist subagent protocols, and deterministic policy constraints, ensuring zero context drift and preventing any frontend leakage.

---

## 1. Objective of this Stage
1. Verify and establish the primary Antigravity context file (`GEMINI.md`) at the root of the backend workspace.
2. Establish the hierarchical rule definition in `.agent/rules/backend_architecture_rules.md` for automatic loading across backend file edits.
3. Validate that the generated context adheres to Google Antigravity customization guidelines (progressive disclosure, explicit boundaries, clear tool & coding directives).

---

## 2. Structure of the Generated `GEMINI.md`
The generated context file contains:

1. **Workspace Boundary Statement**:
   - Explicitly locks the workspace to the Backend, Analyzers, Policies, and Backend Agents.
   - Forbids frontend/client-side drift.
2. **System Vision & Core Workflow**:
   - Pre-Flight validation before implementation.
   - Intent $\to$ Knowledge Graph $\to$ 5 Specialist Agents $\to$ Policy Evaluation $\to$ Decision (`PASS`/`REVIEW`/`BLOCK`) $\to$ Remediation.
3. **Complete Backend Tech Stack**:
   - Python 3.11+, FastAPI, Pydantic v2, NetworkX, Tree-sitter, PostgreSQL, Redis.
4. **Directory Structure & Component Responsibilities**:
   - Granular breakdown of `backend/api/`, `backend/agents/`, `backend/graph/`, `backend/contracts/`, `backend/policies/`, `backend/decision/`, `backend/evidence/`, `backend/remediation/`, `analyzers/`, and `policies/`.
5. **Specialist Subagent Specifications**:
   - Detailed roles, inputs, outputs, and hard blocking triggers for Architecture, Contract, Dependency, Impact, and Security agents.
6. **Domain Data Models**:
   - Complete Pydantic v2 classes for `Project`, `Component`, `Relationship`, `Contract`, `ArchitectureRule`, `Finding`, and `PreflightResponse`.
7. **Repository Knowledge Graph Specifications**:
   - NetworkX `MultiDiGraph` node attributes, typed edge semantics, cycle detection, and blast radius calculation.
8. **Decision Engine & Risk Model**:
   - Transparent risk equation:
     $$\text{Risk} = \text{architecture} + \text{contracts} + \text{dependencies} + \text{security} + \text{surface} + \text{uncertainty}$$
   - Deterministic vs Evidence-based AI inference vs Unknown trust tiering.
9. **Strict Backend Guardrails**:
   - Zero frontend drift, strict type safety, deterministic hard blocks, evidence grounding, and zero deprecated dependency tolerance.

---

## 3. Next Steps
In Stage 5, we will perform verification against the PRD requirements, inspect the generated context files for completeness and accuracy, and present the final deliverables.
