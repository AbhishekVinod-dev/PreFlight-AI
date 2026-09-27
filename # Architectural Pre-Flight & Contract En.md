# Architectural Pre-Flight & Contract Enforcement Engine

## Product Requirements Document (PRD)

**Working name:** Architectural Pre-Flight

**Platform:** IBM Bob 2.0

**Document status:** Competition-ready product and technical specification

**Version:** 1.0

**Date:** 26 September 2026

---

## 1. Executive Summary

Architectural Pre-Flight is an AI-assisted engineering governance layer designed for repositories where developers and coding agents make changes faster than teams can manually validate the architectural consequences.

The system sits **before implementation**. A developer describes a requested change. Instead of immediately generating code, the system analyzes the repository, discovers architecture and contracts, evaluates dependencies, calculates change impact, and runs specialized checks in parallel. It then produces a deterministic-looking pre-flight decision:

* **CLEARED** --- implementation can proceed.
* **BLOCKED** --- one or more enforceable constraints are violated.
* **REVIEW REQUIRED** --- the system found meaningful uncertainty or a high-risk change requiring human approval.

If blocked, the system provides evidence, affected files/consumers, the violated rule or contract, and a remediation plan.

The core thesis is:

> **AI coding makes implementation faster; Architectural Pre-Flight makes implementation safer by deciding whether a proposed change should be built before the coding agent writes it.**

IBM Bob is particularly suited to this concept because its current capabilities include Plan, Agent and Ask modes; repository initialization through `/init` and `AGENTS.md`; custom modes and rules; file/command tooling; MCP; and specialized subagents that can work in isolated contexts. Bob documentation also describes parallel tool calling and subagent workflows.

---

# 2. Problem Statement

## 2.1 The core problem

Modern development workflows often look like:

```text
Requirement
    ↓
AI / Developer starts coding
    ↓
Implementation
    ↓
Build / Test / Review
    ↓
Architecture or contract problem discovered
    ↓
Refactoring
    ↓
More testing
    ↓
More review

```

The system detects many problems **after implementation has already created cost**.

A proposed change may be locally reasonable while being globally wrong for the repository.

Examples:

* A new service duplicates an existing abstraction.
* A frontend module bypasses a backend service boundary.
* An API field is renamed even though multiple consumers depend on it.
* A developer introduces a package that is deprecated, prohibited, or already replaced by an internal abstraction.
* A database change breaks an undocumented consumer.
* A new event schema is incompatible with existing consumers.
* An AI coding agent modifies the wrong layer because it does not know an architectural decision made months earlier.
* A refactoring appears simple but touches dozens of consumers.

## 2.2 Why this matters more with AI coding agents

AI coding agents reduce the cost of producing code, which also reduces the friction to making large changes quickly.

That creates a new control problem:

> **The faster code can be generated, the more important it becomes to validate intent and architecture before implementation.**

Sourcegraph's 2026 research describes a related challenge: coding agents working in large repositories struggle with cross-repository dependencies, historical context and architectural decisions. Sourcegraph positions deterministic code intelligence as an intelligence layer for agents working on large codebases.

IBM Bob itself provides persistent repository context through `/init` and `AGENTS.md`, which captures project structure, technology stack, dependencies, architecture conventions and development workflows.

Architectural Pre-Flight builds on this idea but changes the goal from **contextual code generation** to **pre-implementation change validation**.

---

# 3. Research and Market Landscape

## 3.1 Existing solution categories

The problem is not unsolved. Existing tools address important pieces:

### AI coding agents

Examples include IBM Bob and other agentic development tools.

Strength:

* Generate and modify code.
* Understand repository context.
* Execute commands.
* Work across multiple files.

Gap:

* The default objective is generally completing the requested implementation, not acting as an independent architectural gate.

IBM Bob explicitly supports Agent, Plan and Ask modes and can spawn focused subagents.

### Repository intelligence

Sourcegraph provides repository-wide code intelligence and is positioning itself as an intelligence layer for developers and AI coding agents. Its 2026 material emphasizes deterministic search and cross-repository code intelligence for agent context.

Gap:

* Repository intelligence is a foundation, not by itself a complete pre-build policy and contract decision engine.

### Architecture and code quality

SonarQube provides architecture analysis and architecture-as-code capabilities. Its documentation describes formal architectural groups, perspectives and constraints; Sonar also describes providing intended architecture to AI agents before code generation.

Gap:

* Architectural analysis and deviation detection are highly relevant, but the proposed product focuses specifically on a developer's **change intent before implementation**, combining architecture with contracts, dependency policy and impact analysis.

### Dependency and security tooling

Snyk and similar tools address dependency vulnerabilities, software supply-chain risk and security for AI-assisted/agentic development.

Gap:

* Security is one dimension. Architectural Pre-Flight asks whether a proposed dependency is appropriate for the repository's architecture, policy and existing capabilities, not only whether it has a known vulnerability.

### Contract testing

Pact is a mature consumer-driven contract testing ecosystem. A consumer defines expected interactions and the provider verifies them. Pact helps prevent integration failures caused by incompatible consumer/provider expectations.

Gap:

* Traditional contract testing validates implemented behavior against contracts. Architectural Pre-Flight additionally attempts to discover contracts and evaluate a proposed change **before implementation**.

### Operational/service contracts

Pacto describes contracts that combine interfaces with ownership, dependencies, compatibility, readiness and validation/evidence.

Gap:

* This is close to the contract-enforcement direction of the product. The differentiation must therefore be the **AI pre-flight workflow**, repository-wide change intent analysis, evidence-based remediation and integration with an AI coding agent.

---

# 4. Competitive Differentiation

Architectural Pre-Flight should not claim that competitors do not perform architecture or contract analysis.

Instead, the differentiation is:

> **Existing tools solve important slices of the development lifecycle. Architectural Pre-Flight combines repository intelligence, architecture rules, contracts, dependency policy, impact analysis and parallel AI reasoning into one pre-implementation gate.**

## 4.1 Positioning matrix

| Capability | AI Coding Agent | Repository Intelligence | SonarQube | Dependency/Security Tools | Pact | Architectural Pre-Flight |
| --- | --- | --- | --- | --- | --- | --- |
| Code generation | High | Medium | Low | Low | Low | High |
| Repository context | High | High | Medium | Medium | Low | High |
| Architecture analysis | Partial | Partial | High | Partial | Low | High |
| API contract testing | Partial | Low | Partial | Low | High | High |
| Dependency analysis | Partial | Partial | High | High | Low | High |
| Change impact analysis | Partial | High | Medium | Medium | High | High |
| Pre-implementation validation | Partial | Partial | Partial | Partial | Partial | **Core** |
| Cross-domain reasoning | Partial | High | Medium | Medium | Medium | **Core** |
| Dead-end refactoring detection | Limited | Partial | Partial | Low | Low | **Core** |
| Architecture decision memory | Limited | Partial | Low | Low | Low | **Core** |
| AI-generated remediation | High | High | Partial | High | Partial | **Core** |
| Enforceable pass/block/review gate | Partial | Partial | High | High | High | **Core** |

---

# 5. Product Vision

## Vision

Create a system where developers can safely ask an AI agent to implement large changes without first manually reconstructing the entire architecture.

## Product promise

> **Before code is written, Architectural Pre-Flight tells you whether the proposed change fits the system, what it could break, what contracts it violates, what dependencies it introduces, and how to fix the plan.**

## Core workflow

```text
Developer intent
      ↓
Change understanding
      ↓
Repository knowledge graph
      ↓
Parallel specialist agents
      ├── Architecture
      ├── Contracts
      ├── Dependencies
      ├── Impact
      └── Security
      ↓
Evidence aggregation
      ↓
Risk classification
      ↓
Pre-flight decision
      ├── PASS
      ├── REVIEW
      └── BLOCK
      ↓
Remediation plan
      ↓
Human approval
      ↓
IBM Bob implementation
      ↓
Post-change verification

```

---

# 6. Target Users

## Primary

### Software developers

Need to understand whether a feature fits an unfamiliar or large codebase.

### Technical leads / architects

Need enforceable architecture rules without manually reviewing every implementation.

### Engineering teams using AI coding agents

Need guardrails that prevent AI-generated changes from violating project conventions.

### Platform / DevOps teams

Need CI/CD enforcement for architecture and contracts.

## Secondary

### Security teams

Need dependency and security policy enforcement.

### Engineering managers

Need measurable reductions in rework and failed changes.

---

# 7. Product Goals

## Primary goals

1. Detect architectural conflicts before implementation.
2. Detect contract violations before implementation.
3. Identify affected files, services and consumers.
4. Detect inappropriate/deprecated/policy-blocked dependencies.
5. Detect duplicate abstractions and likely dead-end refactors.
6. Generate evidence-backed remediation plans.
7. Integrate with IBM Bob's Agent/Plan modes and subagents.
8. Provide deterministic policy gates around probabilistic AI reasoning.
9. Measure prevented rework and validation outcomes.

## Secondary goals

* Preserve architecture decisions as machine-readable knowledge.
* Generate architecture documentation.
* Support CI/CD pre-flight checks.
* Provide developer-friendly explanations.
* Create an audit trail of decisions.

---

# 8. Non-Goals

For the MVP, do not attempt to:

* Replace IBM Bob as a general coding assistant.
* Replace full security platforms.
* Replace all static analysis.
* Replace all unit/integration tests.
* Automatically block every uncertain change.
* Guarantee that an architecture is objectively "good."
* Make irreversible production changes without approval.
* Build a universal architecture modeling language.

The product should **compose existing evidence and tools**, not attempt to replace every specialized engineering tool.

---

# 9. Core Product Features

# 9.1 Repository Intelligence Engine

Build a structured repository model.

### Inputs

* Source code
* Directory structure
* Package manifests
* Lock files
* OpenAPI
* GraphQL schemas
* JSON Schema
* Protobuf
* AsyncAPI/event definitions
* Database schemas
* Tests
* Configuration
* Docker/Kubernetes files
* CI/CD configuration
* Documentation
* ADRs
* AGENTS.md / project rules

### Extract

* Modules
* Symbols
* Imports
* Call relationships
* APIs
* Consumers/providers
* Database relationships
* Events
* Dependencies
* Tests
* Configuration contracts
* Architecture boundaries

### Output

A repository knowledge graph.

Example:

```text
Dashboard
  └── calls → AnalyticsAPI
                 └── uses → AnalyticsService
                              └── reads → PostgreSQL

```

---

# 9.2 Change Intent Analyzer

Input:

> "Add Google OAuth login."

Convert natural language into a structured change proposal.

```yaml
change:
  intent: "Add Google OAuth authentication"

  affected_domains:
    - authentication
    - users
    - frontend
    - configuration

  likely_operations:
    - add_dependency
    - modify_auth_service
    - modify_user_model
    - add_api_endpoint
    - modify_login_ui

  expected_risk: medium

```

This is the bridge between human intent and deterministic validation.

---

# 9.3 Architecture Agent

Checks:

* Layer violations
* Circular dependencies
* Duplicate abstractions
* Unauthorized module access
* Pattern inconsistency
* Service boundary violations
* Unexpected coupling
* Architectural rule violations
* Existing abstractions that should be extended instead of duplicated

Example:

```text
Request:
Create NewPaymentService

Finding:
PaymentService already exists.

Evidence:
src/services/payment/PaymentService.ts
src/services/payment/StripeAdapter.ts
src/services/payment/RazorpayAdapter.ts

Decision:
REVIEW

Recommendation:
Extend existing PaymentService.

```

---

# 9.4 Contract Agent

Discover and validate:

* API contracts
* Type contracts
* Event contracts
* Database contracts
* Configuration contracts
* Authentication contracts
* Consumer/provider expectations

Example:

```text
Change:
Rename User.name → User.displayName

Detected consumers:
17

Breaking consumers:
5

Contract status:
BLOCKED

```

---

# 9.5 Dependency Guardian

For every proposed dependency:

1. Check whether it already exists.
2. Check package metadata.
3. Check version compatibility.
4. Check known deprecation status.
5. Check repository policy.
6. Check whether an existing internal abstraction already solves the problem.
7. Identify migration/maintenance implications.
8. Recommend an alternative when appropriate.

Important:
The product should not rely on an LLM alone for dependency status. Use package metadata, lockfiles, registries and policy files as evidence where available.

---

# 9.6 Impact Analysis Agent

Calculate:

* Files affected
* Modules affected
* APIs affected
* Database objects affected
* Event consumers affected
* Tests affected
* External consumers if known
* Ownership areas
* Potential breaking changes

Example:

```text
17 files
3 APIs
2 services
1 database table
8 tests
5 consumers

Risk: HIGH

```

---

# 9.7 Security Agent

Check:

* Authentication boundary changes
* Authorization changes
* Secrets exposure
* Dependency security
* Sensitive data flow
* Unsafe direct database access
* New external network calls
* Privilege escalation risks

This is a supporting dimension, not the main product identity.

---

# 9.8 Architecture-as-Code

Allow teams to define enforceable policies.

Example:

```yaml
architecture:
  layers:
    frontend:
      allowed_dependencies:
        - api

    api:
      allowed_dependencies:
        - services

    services:
      allowed_dependencies:
        - repositories

  forbidden:
    - frontend -> database
    - controller -> database

```

Dependency policy:

```yaml
dependencies:
  forbidden:
    - deprecated-package

  approval_required:
    - new-database
    - message-broker

```

---

# 9.9 Architecture Decision Records

Support ADR ingestion and creation.

Example:

```text
ADR-014

Decision:
Use Redis Streams for internal event processing.

Reason:
Existing infrastructure and operational simplicity.

Status:
Accepted

Alternatives:
RabbitMQ
Kafka

```

If a future change proposes RabbitMQ:

```text
ARCHITECTURAL DECISION CONFLICT

Related decision:
ADR-014

Human review required.

```

This addresses architectural knowledge loss.

---

# 9.10 Dead-End Refactoring Detector

Detect when the proposed approach is likely to create unnecessary work.

Signals:

* Existing equivalent abstraction
* Duplicate service
* Duplicate API
* Existing adapter
* Large downstream impact
* Breaking interface change
* Migration without consumer inventory
* New dependency when an existing one already satisfies the requirement

Output:

```text
POSSIBLE DEAD-END REFACTOR

Existing abstraction:
PaymentService

Requested:
NewPaymentService

Estimated impact:
23 files

Recommendation:
Extend existing abstraction.

```

The product must label this as a recommendation/risk signal rather than an absolute truth.

---

# 9.11 Pre-Flight Decision Engine

Three states:

## PASS

No blocking findings.

## REVIEW

The change is plausible but requires human approval due to uncertainty or high impact.

## BLOCK

A deterministic/enforced rule or verified contract is violated.

Example:

```text
ARCHITECTURAL PRE-FLIGHT

Architecture       ✓
Contracts          ✕
Dependencies       ✓
Security           ✓
Impact             ⚠

RESULT: BLOCKED

2 blocking findings
3 warnings
17 affected files

```

---

# 9.12 Evidence Explorer

Every finding should contain:

* Rule
* Evidence
* Source files
* Symbols
* Consumers
* Relevant contract
* Confidence
* Severity
* Suggested remediation

Example:

```text
Rule:
Frontend cannot access database directly.

Evidence:
src/dashboard/Dashboard.tsx:42
src/config/database.ts:8

Existing compliant pattern:
src/services/AnalyticsService.ts

Confidence:
High

```

This is essential because AI-generated governance without evidence is difficult to trust.

---

# 9.13 Remediation Planner

For every blocking finding:

```text
[Generate remediation]

```

Produces:

```text
1. Extend AnalyticsService
2. Add dashboard API endpoint
3. Update frontend client
4. Add contract test
5. Update API schema
6. Run affected tests

```

The developer approves before changes are made.

---

# 9.14 Autonomous Implementation

Once the plan passes:

```text
Pre-flight
   ↓
Human approval
   ↓
Bob Agent
   ↓
Implementation
   ↓
Tests
   ↓
Post-flight validation

```

The same constraints must be re-run after implementation.

---

# 9.15 CI/CD Gate

Provide a CLI:

```bash
bob-preflight analyze

```

Example output:

```text
Architectural Pre-Flight

Architecture       PASS
Contracts          FAIL
Dependencies       PASS
Security           PASS
Impact             REVIEW

RESULT: BLOCKED

Reason:
UserResponse.name is consumed by 5 services.

Exit code: 1

```

CI can then block a pull request.

---

# 10. IBM Bob 2.0 Integration

IBM Bob should be the **agentic execution and reasoning layer**, while the product's rules/evidence engine provides enforceability.

Bob's documented capabilities include:

* Plan mode
* Agent mode
* Ask mode
* `/init`
* `AGENTS.md`
* Custom modes
* MCP
* File access
* Command execution
* Subagents
* Parallel tool calling
* Approval workflows

[IBM Bob overview](https://bob.ibm.com/docs/ide?utm_source=gemini)

[IBM Bob subagents](https://bob.ibm.com/docs/shell/features/subagents?utm_source=gemini)

[IBM Bob custom modes](https://bob.ibm.com/docs/ide/configuration/custom-modes?utm_source=gemini)

## Proposed Bob orchestration

### Main agent

Acts as: **Pre-Flight Orchestrator**

Responsibilities:

* Understand user intent.
* Create change proposal.
* Spawn specialist agents.
* Aggregate results.
* Apply deterministic rules.
* Produce final gate decision.
* Request approval.
* Hand off to implementation.

### Subagent 1 --- Architecture Explorer

Read-only.
Finds:

* Architecture
* Existing abstractions
* Dependencies
* Layer boundaries

### Subagent 2 --- Contract Explorer

Finds:

* API schemas
* Types
* Consumers
* Events
* Database contracts

### Subagent 3 --- Dependency Explorer

Finds:

* Existing packages
* Versions
* Alternatives
* Policy conflicts

### Subagent 4 --- Impact Explorer

Finds:

* References
* Call sites
* Consumers
* Tests
* Affected modules

### Subagent 5 --- Security Explorer

Finds:

* Sensitive data
* Auth boundaries
* Secrets
* Security-sensitive changes

IBM Bob's documentation describes subagents as isolated agents with their own context that return summaries to the parent agent.

---

# 11. Proposed System Architecture

```text
┌────────────────────────────────────────────────────────────┐
│                    DEVELOPER / IDE                         │
│                                                            │
│  "Add notification service using WebSockets"              │
└──────────────────────────┬─────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│                  IBM BOB ORCHESTRATOR                      │
│                                                            │
│  Change Intent → Planning → Agent orchestration            │
└──────────────────────────┬─────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        Architecture   Contract    Dependency
          Agent         Agent        Agent
              │            │            │
              └────────────┼────────────┘
                           │
                     ┌─────┴─────┐
                     ▼           ▼
                  Impact      Security
                   Agent        Agent
                     │           │
                     └─────┬─────┘
                           ▼
┌────────────────────────────────────────────────────────────┐
│               REPOSITORY KNOWLEDGE GRAPH                    │
│                                                            │
│ Code │ APIs │ Types │ DB │ Events │ Tests │ Dependencies  │
└──────────────────────────┬─────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│                DETERMINISTIC POLICY ENGINE                  │
│                                                            │
│ Architecture Rules │ Contracts │ Dependency Policies       │
└──────────────────────────┬─────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│                    DECISION ENGINE                          │
│                                                            │
│          PASS │ REVIEW │ BLOCK                              │
└──────────────────────────┬─────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│                   REMEDIATION PLANNER                       │
└──────────────────────────┬─────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│                     BOB AGENT                               │
│               Approved implementation                       │
└──────────────────────────┬─────────────────────────────────┘
                           │
                           ▼
                   Tests + Post-flight

```

---

# 12. Technology Stack

## Frontend

Recommended:

* React
* TypeScript
* Vite or Next.js
* Tailwind CSS
* React Flow for architecture graphs
* Monaco Editor for code/evidence views

## Backend

Recommended:

* Python
* FastAPI
* Pydantic
* NetworkX for initial graph analysis
* Tree-sitter for syntax/code parsing where appropriate
* PostgreSQL for persistent project metadata
* Redis for job/state management if required

## AI / Agent layer

* IBM Bob 2.0
* Bob Agent mode
* Bob Plan mode
* Bob subagents
* MCP where integration is appropriate

## Repository analysis

Possible analyzers:

* Tree-sitter
* Language Server Protocol data
* Git history
* package managers
* OpenAPI parser
* JSON Schema
* AsyncAPI
* GraphQL schema parsing
* Protobuf descriptors

## CI/CD

* GitHub Actions
* GitLab CI
* Jenkins integration as a future extension

---

# 13. Data Model

## Project

```typescript
Project {
  id
  name
  repository
  defaultBranch
  createdAt
  lastIndexedAt
}

```

## Component

```typescript
Component {
  id
  projectId
  name
  type
  path
  owner
}

```

## Relationship

```typescript
Relationship {
  source
  target
  type
  evidence
}

```

Types:

* imports
* calls
* depends_on
* consumes
* provides
* writes
* reads
* publishes
* subscribes

## Contract

```typescript
Contract {
  id
  projectId
  type
  source
  version
  consumers
  providers
}

```

## ArchitectureRule

```typescript
ArchitectureRule {
  id
  projectId
  ruleType
  expression
  severity
  enforcement
}

```

## ChangeRequest

```typescript
ChangeRequest {
  id
  projectId
  description
  proposedChanges
  risk
  status
  createdAt
}

```

## Finding

```typescript
Finding {
  id
  changeRequestId
  category
  severity
  confidence
  title
  explanation
  evidence
  affectedFiles
  remediation
  blocking
}

```

---

# 14. Risk Model

Use a transparent scoring model.

```text
Risk =
  architecture impact
+ contract impact
+ dependency impact
+ security impact
+ change surface
+ uncertainty

```

### LOW

* Local change
* No public contract change
* Existing dependency
* No architecture violation

### MEDIUM

* Multiple modules
* Internal contract changes
* New dependency
* Moderate uncertainty

### HIGH

* Public API change
* Database migration
* Security boundary
* Cross-service contract
* Major dependency change

### CRITICAL

* Breaking public contract
* Authentication/authorization boundary violation
* Destructive database change
* Explicit architecture policy violation

The score must be explainable; never expose a black-box number without its contributing factors.

---

# 15. Trust Model

The system should distinguish three kinds of conclusions.

## Deterministic

Examples:

* File imports database module.
* Package is present in lockfile.
* API schema changed.
* Rule explicitly forbids frontend → database.

These can be used for hard blocking.

## Evidence-based AI inference

Examples:

* This new class appears to duplicate an existing service.
* The change is likely to create unnecessary coupling.

These should normally generate REVIEW findings.

## Unknown

If the repository lacks evidence:

```text
UNKNOWN

Could not determine whether external consumers
depend on this API.

Human review required.

```

This is much safer than pretending the model knows.

---

# 16. UX Specification

## Dashboard

```text
ARCHITECTURAL PRE-FLIGHT

Repository:
ORCA

Last indexed:
2 minutes ago

Architecture:
Healthy

Contracts:
42 discovered

Dependencies:
126

Architecture rules:
18

Recent changes:
7

```

## Change Request screen

```text
Describe your change

┌─────────────────────────────────────────────┐
│ Add a real-time notification service using │
│ WebSockets.                                 │
└─────────────────────────────────────────────┘

[ RUN PRE-FLIGHT ]

```

## Analysis screen

```text
PRE-FLIGHT RUNNING

✓ Repository context loaded
✓ Architecture analyzed
✓ Contracts analyzed
✓ Dependencies analyzed
✓ Impact analyzed
◐ Security analysis

```

## Results

```text
ARCHITECTURAL PRE-FLIGHT

Architecture       ✓ PASS
Contracts          ✕ FAIL
Dependencies       ⚠ REVIEW
Security           ✓ PASS
Impact             ⚠ HIGH

RESULT: BLOCKED

```

---

# 17. Example End-to-End Scenario

## Existing system

```text
React
  ↓
FastAPI
  ↓
Service Layer
  ↓
PostgreSQL

```

Rule:

```text
frontend → database = forbidden

```

Developer asks:

> "For faster analytics, connect the dashboard directly to PostgreSQL."

## Agent analysis

Architecture Agent:

```text
Violation detected.

```

Contract Agent:

```text
Existing Analytics API already exposes required data.

```

Dependency Agent:

```text
No new database client should be introduced into frontend.

```

Impact Agent:

```text
Would bypass existing service boundary.

```

Security Agent:

```text
Would expose database access credentials to client-side code.

```

## Final result

```text
🚫 BLOCKED

Reasons:
1. Architecture boundary violation
2. Existing Analytics API already provides required capability
3. Security boundary violation

Recommended approach:
Dashboard
  ↓
Analytics API
  ↓
AnalyticsService
  ↓
PostgreSQL

```

Then:

```text
[Generate remediation]

```

Bob generates the compliant implementation.

---

# 18. Advanced Features

## 18.1 Architecture Drift Monitor

Compare intended architecture vs actual architecture.

## 18.2 Architecture Visualization

Interactive graph showing frontend, api, services, repositories, database. Click a node to inspect dependents, dependencies, contracts, ownership, and recent changes.

## 18.3 Git-aware analysis

Compare main vs feature branch, analyzing only the proposed delta plus affected dependencies.

## 18.4 Historical regression detection

Learn from previous architectural failures and warn if a similar pattern was rolled back previously.

## 18.5 Ownership routing

Automatically route review notifications based on affected service ownership (e.g., PaymentsService → Payments team).

## 18.6 Architecture review packet

Generate a comprehensive packet summarizing change impact, contracts, dependencies, security, and approval decisions.

---

# 19. MVP Scope

### Must-have

1. Repository indexing
2. Architecture graph
3. Natural-language change request
4. IBM Bob orchestration
5. Parallel specialist agents
6. Architecture rule checking
7. Contract discovery
8. Change impact analysis
9. Dependency/deprecation policy check
10. PASS/REVIEW/BLOCK decision
11. Evidence explorer
12. Remediation plan
13. Basic Bob implementation handoff

### Nice-to-have

* GitHub PR integration
* CI/CD gate
* ADR memory
* Security analysis
* Historical analysis

### Future

* Enterprise policy management
* Multi-repository graphs
* Organization-wide architecture governance
* Automated migration planning
* Architecture drift monitoring

---

# 20. What NOT to Build for the Demo

Avoid spending the competition timeline building:

* A full IDE
* A complete static analyzer for every language
* A replacement for SonarQube
* A replacement for Snyk
* A replacement for Pact
* A generic chatbot
* A universal dependency vulnerability database

Use existing analyzers and data sources where possible. Your innovation is the **orchestration and decision layer**.

---

# 21. Success Metrics

* **Avoided rework:** $\ge 90\%$ reduction in intentionally constructed dead-end scenarios.
* **Deprecated dependency prevention:** $0$ in benchmark scenarios designed to test the guardrail.
* **Contract pre-validation coverage:** $100\%$ of supported MVP change types.

---

# 22. Evaluation Benchmark

Create a controlled benchmark with 20–30 changes across Architecture, Contracts, Dependencies, Refactoring, and Security categories. Record ground truth, tool results, precision, time, and final decisions.

---

# 23. Demo Strategy

1. Open repository.
2. Run `/init` to let IBM Bob create persistent project context through `AGENTS.md`.


3. Show architecture graph.
4. Submit: *"Add a new notification service using Library X."*
5. Spawn parallel agents.
6. Show findings (existing abstraction, deprecated dependency, contract conflict, downstream consumers).
7. System blocks implementation.
8. Click `Generate remediation`.
9. Bob proposes compliant adjustments.
10. Developer approves.
11. Bob implements.
12. Post-flight validation passes successfully.

---

# 24. Why IBM Bob Is Central

Bob acts as the orchestrator. Its modes map naturally to the lifecycle (`PLAN` → Pre-flight → Approval → `AGENT` → Implementation → Verify), and its subagents map to specialized engineering roles. Bob's documentation supports custom modes and restrictions around tools/subagents.

---

# 25. Differentiation Statement

> **"Don't let the agent code first and discover the architecture later. Pre-flight the change first."**

---

# 26. Competitive Moat

Defensibility builds from the repository knowledge graph, architecture decision history, change-to-impact relationships, contract discovery, and continuous feedback loops tracking change intent against production outcomes.

---

# 27. Security and Privacy Requirements

* Never send secrets to the model intentionally.
* Redact environment values and credentials.
* Respect repository permissions and require explicit approval for writes.
* Separate read-only analysis from modification.

---

# 28. Reliability Requirements

Every finding must provide severity, confidence, evidence, blocking status, and recommended action to prevent uncertainty from causing false hard blocks.

---

# 29. Performance Requirements

* Initial indexing: $<2$ minutes
* Incremental indexing: $<30$ seconds
* Pre-flight analysis: $<60$ seconds
* Simple local changes: $<15$ seconds

---

# 30. Implementation Roadmap

* **Phase 1:** Foundation (Scanner, symbol index, dependency graph, architecture graph, basic UI)
* **Phase 2:** Pre-flight (Intent parser, specialist agents, decision engine)
* **Phase 3:** Bob Integration (Custom mode, subagents, remediation workflow)
* **Phase 4:** Enforcement (Architecture-as-code, CLI, CI gate)
* **Phase 5:** Intelligence (ADR memory, historical analysis, drift monitoring)

---

# 31. Proposed Repository Structure

```text
architectural-preflight/
├── frontend/
├── backend/
├── analyzers/
├── bob/
├── policies/
├── tests/
└── docs/

```

---

# 32. Example Architecture Policy

```yaml
version: "1.0"
layers:
  frontend:
    allowed_dependencies: [api, ui]
  api:
    allowed_dependencies: [services, schemas]
  services:
    allowed_dependencies: [repositories, external]
  repositories:
    allowed_dependencies: [database]

rules:
  - id: ARCH-001
    description: "Frontend must not access database"
    from: frontend
    to: database
    action: block

```

---

# 33. Example Pre-flight API

```http
POST /api/preflight

```

Request JSON with `projectId`, `change`, and `branch` returns structured blocking/warning findings, affected file counts, and remediation advice.

---

# 34. Example CLI

```bash
preflight init
preflight index
preflight analyze --change "Add real-time notification service"
preflight validate
preflight ci

```

---

# 35. Risks

Mitigate false positives through strict evidence requirements and confidence thresholds; mitigate repository scale issues via incremental graph analysis and caching.

---

# 36. Recommended MVP Tech Choices

* **Frontend:** React + TypeScript + Tailwind + React Flow
* **Backend:** FastAPI + Python
* **Graph:** NetworkX
* **Parser:** Tree-sitter + package metadata
* **Storage:** PostgreSQL
* **Orchestration:** IBM Bob 2.0 Agent mode + subagents

---

# 37. Final Product Definition

> **Architectural Pre-Flight:** Validate the change before you build the change.

---

# 38. Competition Pitch

> **"Before an AI agent writes the code, we ask whether the code should be written at all."**

---

# 39. Research Sources

1. IBM Bob — product overview and capabilities: [https://bob.ibm.com/docs/ide](https://bob.ibm.com/docs/ide?utm_source=gemini)

2. IBM Bob — `/init` and persistent `AGENTS.md` repository context: [https://bob.ibm.com/docs/ide/tutorials/start-a-project](https://bob.ibm.com/docs/ide/tutorials/start-a-project?utm_source=gemini)
3. IBM Bob — subagents: [https://bob.ibm.com/docs/shell/features/subagents](https://bob.ibm.com/docs/shell/features/subagents?utm_source=gemini)
4. IBM Bob — custom modes: [https://bob.ibm.com/docs/ide/configuration/custom-modes](https://bob.ibm.com/docs/ide/configuration/custom-modes?utm_source=gemini)
5. Sourcegraph — intelligence layer for AI coding agents
6. SonarQube — architecture analysis
7. Pact — contract testing documentation