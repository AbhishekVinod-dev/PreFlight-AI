# PreFlight-AI: Architectural Pre-Flight & Contract Enforcement Engine

An autonomous governance engine that validates whether a proposed software change should be built **before** an AI coding agent writes the code.

Built with **IBM BOB 2.0 IDE** for the IBM Bob 2.0 Hackathon.

---

## 🚀 Quick Start with IBM BOB IDE

1. Open this repository in **IBM BOB IDE**.
2. Run `/init` in the BOB chat sidebar.
3. BOB will automatically load [`AGENTS.md`](./AGENTS.md) and configure its internal agents and custom skills in [`.bob/skills/`](./.bob/skills/).

---

## 👥 Pair Programming Split

The backend is decoupled via [`backend/schemas/shared.py`](./backend/schemas/shared.py) into two independent development streams:

* **Pair A (Data Ingestion & Analysis)**:
  * Owns: `analyzers/`, `backend/graph/`, `backend/contracts/`, `backend/agents/` (Architecture, Contracts, Dependencies, Impact, Security), and `policies/`.
  * Guide: [`docs/teams/pair-a/AGENTS.md`](./docs/teams/pair-a/AGENTS.md)
* **Pair B (Orchestration & Enforcement)**:
  * Owns: `backend/api/`, `backend/agents/orchestrator.py`, `backend/decision/`, `backend/evidence/`, and `backend/remediation/`.
  * Guide: [`docs/teams/pair-b/AGENTS.md`](./docs/teams/pair-b/AGENTS.md)
  * Dev Stubs: [`backend/agents/stubs/`](./backend/agents/stubs/) (allows Pair B to develop and test immediately without waiting for Pair A).

See [`docs/teams/TEAM_SPLIT_OVERVIEW.md`](./docs/teams/TEAM_SPLIT_OVERVIEW.md) and [`docs/stages/STAGE_7_PARALLEL_BUILD_AND_INTEGRATION.md`](./docs/stages/STAGE_7_PARALLEL_BUILD_AND_INTEGRATION.md) for complete details.

---

## 📁 Repository Structure

```
PreFlight-AI/
├── AGENTS.md                  # IBM BOB root context & rules
├── .bob/skills/               # Custom IBM BOB pre-flight skills
├── backend/
│   ├── schemas/shared.py      # Shared Pydantic v2 data models (boundary contract)
│   ├── agents/
│   │   ├── protocols.py       # Formal typing Protocols for agents and graph engine
│   │   └── stubs/             # Runnable mock agents for independent Pair B development
├── tests/
│   └── integration/           # Integration tests for merge day
└── docs/
    ├── stages/                # Evolution documentation (Stages 1 to 7 with TL;DRs)
    ├── teams/                 # Team setup guides and pair AGENTS.md files
    └── bob-sessions/          # Required IBM BOB session summary screenshots
```
