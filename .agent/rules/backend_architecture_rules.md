---
description: Backend architectural integrity and governance rules for Architectural Pre-Flight
globs: backend/**/*.py, analyzers/**/*.py, policies/**/*.yaml
always_on: true
---

# Backend Architectural Governance Rules

## Core Directives
1. **Backend Boundary**: You are working in the backend of Architectural Pre-Flight. All implementations must use Python 3.11+, FastAPI, Pydantic v2, NetworkX, and Tree-sitter.
2. **Strict Layer Enforcement**: Follow the layered dependency model:
   - `backend/api/` -> calls `backend/agents/orchestrator.py` and `backend/decision`.
   - `backend/agents/` -> queries `backend/graph/`, `backend/policies/`, and `backend/contracts/`.
   - `backend/graph/` -> uses data parsed by `analyzers/`.
   - `analyzers/` -> standalone parsers; must not import `backend/agents/` or `backend/api/`.
3. **Evidence Requirement**: Every generated Finding must include: `id`, `category`, `severity`, `confidence`, `evidence`, `affected_files`.
4. **Deterministic Hard Gates**: Hard blocks (`BLOCK`) can only be triggered by deterministic rule violations (layer rules, forbidden dependency list, schema breakage). Probabilistic inferences must map to `REVIEW`.
5. **No Hallucinated Packages**: Verify any library against existing `pyproject.toml` or `requirements.txt` before importing.
