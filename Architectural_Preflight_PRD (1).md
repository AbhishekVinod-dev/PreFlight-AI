# Architectural Pre-Flight & Contract Enforcement Engine

## Product Requirements Document (PRD)

**Working name:** Architectural Pre-Flight\
**Platform:** IBM Bob 2.0\
**Document status:** Competition-ready product and technical
specification\
**Version:** 1.0\
**Date:** 26 September 2026

------------------------------------------------------------------------

## 1. Executive Summary

Architectural Pre-Flight is an AI-assisted engineering governance layer
designed for repositories where developers and coding agents make
changes faster than teams can manually validate the architectural
consequences.

The system sits **before implementation**. A developer describes a
requested change. Instead of immediately generating code, the system
analyzes the repository, discovers architecture and contracts, evaluates
dependencies, calculates change impact, and runs specialized checks in
parallel. It then produces a deterministic-looking pre-flight decision:

-   **CLEARED** --- implementation can proceed.
-   **BLOCKED** --- one or more enforceable constraints are violated.
-   **REVIEW REQUIRED** --- the system found meaningful uncertainty or a
    high-risk change requiring human approval.

If blocked, the system provides evidence, affected files/consumers, the
violated rule or contract, and a remediation plan.

The core thesis is:

> **AI coding makes implementation faster; Architectural Pre-Flight
> makes implementation safer by deciding whether a proposed change
> should be built before the coding agent writes it.**

IBM Bob is particularly suited to this concept because its current
capabilities include Plan, Agent and Ask modes; repository
initialization through `/init` and `AGENTS.md`; custom modes and rules;
file/command tooling; MCP; and specialized subagents that can work in
isolated contexts. Bob documentation also describes parallel tool
calling and subagent workflows. [IBM Bob
documentation](https://bob.ibm.com/docs/ide)

------------------------------------------------------------------------

# 2. Problem Statement

## 2.1 The core problem

Modern development workflows often look like:

``` text
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

The system detects many problems **after implementation has already
created cost**.

A proposed change may be locally reasonable while being globally wrong
for the repository.

Examples:

-   A new service duplicates an existing abstraction.
-   A frontend module bypasses a backend service boundary.
-   An API field is renamed even though multiple consumers depend on it.
-   A developer introduces a package that is deprecated, prohibited, or
    already replaced by an internal abstraction.
-   A database change breaks an undocumented consumer.
-   A new event schema is incompatible with existing consumers.
-   An AI coding agent modifies the wrong layer because it does not know
    an architectural decision made months earlier.
-   A refactoring appears simple but touches dozens of consumers.

## 2.2 Why this matters more with AI coding agents

AI coding agents reduce the cost of producing code, which also reduces
the friction to making large changes quickly.

That creates a new control problem:

> **The faster code can be generated, the more important it becomes to
> validate intent and architecture before implementation.**

Sourcegraph's 2026 research describes a related challenge: coding agents
working in large repositories struggle with cross-repository
dependencies, historical context and architectural decisions.
Sourcegraph positions deterministic code intelligence as an intelligence
layer for agents working on large codebases. [Sourcegraph,
2026](https://sourcegraph.com/blog/a-new-era-for-sourcegraph-the-intelligence-layer-for-ai-coding-agents-and-developers)

IBM Bob itself provides persistent repository context through `/init`
and `AGENTS.md`, which captures project structure, technology stack,
dependencies, architecture conventions and development workflows. [IBM
Bob `/init`
documentation](https://bob.ibm.com/docs/ide/tutorials/start-a-project)

Architectural Pre-Flight builds on this idea but changes the goal from
**contextual code generation** to **pre-implementation change
validation**.

------------------------------------------------------------------------

# 3. Research and Market Landscape

## 3.1 Existing solution categories

The problem is not unsolved. Existing tools address important pieces:

### AI coding agents

Examples include IBM Bob and other agentic development tools.

Strength: - Generate and modify code. - Understand repository context. -
Execute commands. - Work across multiple files.

Gap: - The default objective is generally completing the requested
implementation, not acting as an independent architectural gate.

IBM Bob explicitly supports Agent, Plan and Ask modes and can spawn
focused subagents. [IBM Bob](https://bob.ibm.com/docs/ide)

### Repository intelligence

Sourcegraph provides repository-wide code intelligence and is
positioning itself as an intelligence layer for developers and AI coding
agents. Its 2026 material emphasizes deterministic search and
cross-repository code intelligence for agent context.
[Sourcegraph](https://sourcegraph.com/blog/agentic-coding)

Gap: - Repository intelligence is a foundation, not by itself a complete
pre-build policy and contract decision engine.

### Architecture and code quality

SonarQube provides architecture analysis and architecture-as-code
capabilities. Its documentation describes formal architectural groups,
perspectives and constraints; Sonar also describes providing intended
architecture to AI agents before code generation. [SonarQube
architecture
analysis](https://docs.sonarsource.com/sonarqube-server/2025.3/design-and-architecture/configuring-the-architecture-analysis)
[Sonar,
2026](https://www.sonarsource.com/blog/sonarqube-architecture-management-keeps-agent-generated-code-sound/)

Gap: - Architectural analysis and deviation detection are highly
relevant, but the proposed product focuses specifically on a developer's
**change intent before implementation**, combining architecture with
contracts, dependency policy and impact analysis.

### Dependency and security tooling

Snyk and similar tools address dependency vulnerabilities, software
supply-chain risk and security for AI-assisted/agentic development.

Gap: - Security is one dimension. Architectural Pre-Flight asks whether
a proposed dependency is appropriate for the repository's architecture,
policy and existing capabilities, not only whether it has a known
vulnerability.

### Contract testing

Pact is a mature consumer-driven contract testing ecosystem. A consumer
defines expected interactions and the provider verifies them. Pact helps
prevent integration failures caused by incompatible consumer/provider
expectations. [Pact documentation](https://docs.pact.io/)

Gap: - Traditional contract testing validates implemented behavior
against contracts. Architectural Pre-Flight additionally attempts to
discover contracts and evaluate a proposed change **before
implementation**.

### Operational/service contracts

Pacto describes contracts that combine interfaces with ownership,
dependencies, compatibility, readiness and validation/evidence. [Pacto
architecture](https://pacto.run/latest/architecture/)

Gap: - This is close to the contract-enforcement direction of the
product. The differentiation must therefore be the **AI pre-flight
workflow**, repository-wide change intent analysis, evidence-based
remediation and integration with an AI coding agent.

------------------------------------------------------------------------

# 4. Competitive Differentiation

Architectural Pre-Flight should not claim that competitors do not
perform architecture or contract analysis.

Instead, the differentiation is:

> **Existing tools solve important slices of the development lifecycle.
> Architectural Pre-Flight combines repository intelligence,
> architecture rules, contracts, dependency policy, impact analysis and
> parallel AI reasoning into one pre-implementation gate.**

## 4.1 Positioning matrix

  -----------------------------------------------------------------------------------------------------------
  Capability            AI Coding     Repository   SonarQube   Dependency/Security       Pact   Architectural
                            Agent   Intelligence                             Tools                 Pre-Flight
  -------------------- ---------- -------------- ----------- --------------------- ---------- ---------------
  Code generation            High         Medium         Low                   Low        Low            High

  Repository context         High           High      Medium                Medium        Low            High

  Architecture            Partial        Partial        High               Partial        Low            High
  analysis                                                                                    

  API contract testing    Partial            Low     Partial                   Low       High            High

  Dependency analysis     Partial        Partial        High                  High        Low            High

  Change impact           Partial           High      Medium                Medium       High            High
  analysis                                                                                    

  Pre-implementation      Partial        Partial     Partial               Partial    Partial        **Core**
  validation                                                                                  

  Cross-domain            Partial           High      Medium                Medium     Medium        **Core**
  reasoning                                                                                   

  Dead-end refactoring    Limited        Partial     Partial                   Low        Low        **Core**
  detection                                                                                   

  Architecture            Limited        Partial         Low                   Low        Low        **Core**
  decision memory                                                                             

  AI-generated               High           High     Partial                  High    Partial        **Core**
  remediation                                                                                 

  Enforceable             Partial        Partial        High                  High       High        **Core**
  pass/block/review                                                                           
  gate                                                                                        
  -----------------------------------------------------------------------------------------------------------

------------------------------------------------------------------------

# 5. Product Vision

## Vision

Create a system where developers can safely ask an AI agent to implement
large changes without first manually reconstructing the entire
architecture.

## Product promise

> **Before code is written, Architectural Pre-Flight tells you whether
> the proposed change fits the system, what it could break, what
> contracts it violates, what dependencies it introduces, and how to fix
> the plan.**

## Core workflow

``` text
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

------------------------------------------------------------------------

# 6. Target Users

## Primary

### Software developers

Need to understand whether a feature fits an unfamiliar or large
codebase.

### Technical leads / architects

Need enforceable architecture rules without manually reviewing every
implementation.

### Engineering teams using AI coding agents

Need guardrails that prevent AI-generated changes from violating project
conventions.

### Platform / DevOps teams

Need CI/CD enforcement for architecture and contracts.

## Secondary

### Security teams

Need dependency and security policy enforcement.

### Engineering managers

Need measurable reductions in rework and failed changes.

------------------------------------------------------------------------

# 7. Product Goals

## Primary goals

1.  Detect architectural conflicts before implementation.
2.  Detect contract violations before implementation.
3.  Identify affected files, services and consumers.
4.  Detect inappropriate/deprecated/policy-blocked dependencies.
5.  Detect duplicate abstractions and likely dead-end refactors.
6.  Generate evidence-backed remediation plans.
7.  Integrate with IBM Bob's Agent/Plan modes and subagents.
8.  Provide deterministic policy gates around probabilistic AI
    reasoning.
9.  Measure prevented rework and validation outcomes.

## Secondary goals

-   Preserve architecture decisions as machine-readable knowledge.
-   Generate architecture documentation.
-   Support CI/CD pre-flight checks.
-   Provide developer-friendly explanations.
-   Create an audit trail of decisions.

------------------------------------------------------------------------

# 8. Non-Goals

For the MVP, do not attempt to:

-   Replace IBM Bob as a general coding assistant.
-   Replace full security platforms.
-   Replace all static analysis.
-   Replace all unit/integration tests.
-   Automatically block every uncertain change.
-   Guarantee that an architecture is objectively "good."
-   Make irreversible production changes without approval.
-   Build a universal architecture modeling language.

The product should **compose existing evidence and tools**, not attempt
to replace every specialized engineering tool.

------------------------------------------------------------------------

# 9. Core Product Features

# 9.1 Repository Intelligence Engine

Build a structured repository model.

### Inputs

-   Source code
-   Directory structure
-   Package manifests
-   Lock files
-   OpenAPI
-   GraphQL schemas
-   JSON Schema
-   Protobuf
-   AsyncAPI/event definitions
-   Database schemas
-   Tests
-   Configuration
-   Docker/Kubernetes files
-   CI/CD configuration
-   Documentation
-   ADRs
-   AGENTS.md / project rules

### Extract

-   Modules
-   Symbols
-   Imports
-   Call relationships
-   APIs
-   Consumers/providers
-   Database relationships
-   Events
-   Dependencies
-   Tests
-   Configuration contracts
-   Architecture boundaries

### Output

A repository knowledge graph.

Example:

``` text
Dashboard
  └── calls → AnalyticsAPI
                 └── uses → AnalyticsService
                              └── reads → PostgreSQL
```

------------------------------------------------------------------------

# 9.2 Change Intent Analyzer

Input:

> "Add Google OAuth login."

Convert natural language into a structured change proposal.

``` yaml
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

------------------------------------------------------------------------

# 9.3 Architecture Agent

Checks:

-   Layer violations
-   Circular dependencies
-   Duplicate abstractions
-   Unauthorized module access
-   Pattern inconsistency
-   Service boundary violations
-   Unexpected coupling
-   Architectural rule violations
-   Existing abstractions that should be extended instead of duplicated

Example:

``` text
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

------------------------------------------------------------------------

# 9.4 Contract Agent

Discover and validate:

-   API contracts
-   Type contracts
-   Event contracts
-   Database contracts
-   Configuration contracts
-   Authentication contracts
-   Consumer/provider expectations

Example:

``` text
Change:
Rename User.name → User.displayName

Detected consumers:
17

Breaking consumers:
5

Contract status:
BLOCKED
```

------------------------------------------------------------------------

# 9.5 Dependency Guardian

For every proposed dependency:

1.  Check whether it already exists.
2.  Check package metadata.
3.  Check version compatibility.
4.  Check known deprecation status.
5.  Check repository policy.
6.  Check whether an existing internal abstraction already solves the
    problem.
7.  Identify migration/maintenance implications.
8.  Recommend an alternative when appropriate.

Important:

The product should not rely on an LLM alone for dependency status. Use
package metadata, lockfiles, registries and policy files as evidence
where available.

------------------------------------------------------------------------

# 9.6 Impact Analysis Agent

Calculate:

-   Files affected
-   Modules affected
-   APIs affected
-   Database objects affected
-   Event consumers affected
-   Tests affected
-   External consumers if known
-   Ownership areas
-   Potential breaking changes

Example:

``` text
17 files
3 APIs
2 services
1 database table
8 tests
5 consumers

Risk: HIGH
```

------------------------------------------------------------------------

# 9.7 Security Agent

Check:

-   Authentication boundary changes
-   Authorization changes
-   Secrets exposure
-   Dependency security
-   Sensitive data flow
-   Unsafe direct database access
-   New external network calls
-   Privilege escalation risks

This is a supporting dimension, not the main product identity.

------------------------------------------------------------------------

# 9.8 Architecture-as-Code

Allow teams to define enforceable policies.

Example:

``` yaml
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

``` yaml
dependencies:
  forbidden:
    - deprecated-package

  approval_required:
    - new-database
    - message-broker
```

------------------------------------------------------------------------

# 9.9 Architecture Decision Records

Support ADR ingestion and creation.

Example:

``` text
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

``` text
ARCHITECTURAL DECISION CONFLICT

Related decision:
ADR-014

Human review required.
```

This addresses architectural knowledge loss.

------------------------------------------------------------------------

# 9.10 Dead-End Refactoring Detector

Detect when the proposed approach is likely to create unnecessary work.

Signals:

-   Existing equivalent abstraction
-   Duplicate service
-   Duplicate API
-   Existing adapter
-   Large downstream impact
-   Breaking interface change
-   Migration without consumer inventory
-   New dependency when an existing one already satisfies the
    requirement

Output:

``` text
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

The product must label this as a recommendation/risk signal rather than
an absolute truth.

------------------------------------------------------------------------

# 9.11 Pre-Flight Decision Engine

Three states:

## PASS

No blocking findings.

## REVIEW

The change is plausible but requires human approval due to uncertainty
or high impact.

## BLOCK

A deterministic/enforced rule or verified contract is violated.

Example:

``` text
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

------------------------------------------------------------------------

# 9.12 Evidence Explorer

Every finding should contain:

-   Rule
-   Evidence
-   Source files
-   Symbols
-   Consumers
-   Relevant contract
-   Confidence
-   Severity
-   Suggested remediation

Example:

``` text
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

This is essential because AI-generated governance without evidence is
difficult to trust.

------------------------------------------------------------------------

# 9.13 Remediation Planner

For every blocking finding:

``` text
[Generate remediation]
```

Produces:

``` text
1. Extend AnalyticsService
2. Add dashboard API endpoint
3. Update frontend client
4. Add contract test
5. Update API schema
6. Run affected tests
```

The developer approves before changes are made.

------------------------------------------------------------------------

# 9.14 Autonomous Implementation

Once the plan passes:

``` text
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

------------------------------------------------------------------------

# 9.15 CI/CD Gate

Provide a CLI:

``` bash
bob-preflight analyze
```

Example output:

``` text
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

------------------------------------------------------------------------

# 10. IBM Bob 2.0 Integration

IBM Bob should be the **agentic execution and reasoning layer**, while
the product's rules/evidence engine provides enforceability.

Bob's documented capabilities include:

-   Plan mode
-   Agent mode
-   Ask mode
-   `/init`
-   `AGENTS.md`
-   Custom modes
-   MCP
-   File access
-   Command execution
-   Subagents
-   Parallel tool calling
-   Approval workflows

[IBM Bob overview](https://bob.ibm.com/docs/ide)

[IBM Bob subagents](https://bob.ibm.com/docs/shell/features/subagents)

[IBM Bob custom
modes](https://bob.ibm.com/docs/ide/configuration/custom-modes)

## Proposed Bob orchestration

### Main agent

Acts as:

**Pre-Flight Orchestrator**

Responsibilities:

-   Understand user intent.
-   Create change proposal.
-   Spawn specialist agents.
-   Aggregate results.
-   Apply deterministic rules.
-   Produce final gate decision.
-   Request approval.
-   Hand off to implementation.

### Subagent 1 --- Architecture Explorer

Read-only.

Finds:

-   Architecture
-   Existing abstractions
-   Dependencies
-   Layer boundaries

### Subagent 2 --- Contract Explorer

Finds:

-   API schemas
-   Types
-   Consumers
-   Events
-   Database contracts

### Subagent 3 --- Dependency Explorer

Finds:

-   Existing packages
-   Versions
-   Alternatives
-   Policy conflicts

### Subagent 4 --- Impact Explorer

Finds:

-   References
-   Call sites
-   Consumers
-   Tests
-   Affected modules

### Subagent 5 --- Security Explorer

Finds:

-   Sensitive data
-   Auth boundaries
-   Secrets
-   Security-sensitive changes

IBM Bob's documentation describes subagents as isolated agents with
their own context that return summaries to the parent agent. [IBM Bob
subagents](https://bob.ibm.com/docs/shell/features/subagents)

------------------------------------------------------------------------

# 11. Proposed System Architecture

``` text
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

------------------------------------------------------------------------

# 12. Technology Stack

## Frontend

Recommended:

-   React
-   TypeScript
-   Vite or Next.js
-   Tailwind CSS
-   React Flow for architecture graphs
-   Monaco Editor for code/evidence views

## Backend

Recommended:

-   Python
-   FastAPI
-   Pydantic
-   NetworkX for initial graph analysis
-   Tree-sitter for syntax/code parsing where appropriate
-   PostgreSQL for persistent project metadata
-   Redis for job/state management if required

## AI / Agent layer

-   IBM Bob 2.0
-   Bob Agent mode
-   Bob Plan mode
-   Bob subagents
-   MCP where integration is appropriate

## Repository analysis

Possible analyzers:

-   Tree-sitter
-   Language Server Protocol data
-   Git history
-   package managers
-   OpenAPI parser
-   JSON Schema
-   AsyncAPI
-   GraphQL schema parsing
-   Protobuf descriptors

## CI/CD

-   GitHub Actions
-   GitLab CI
-   Jenkins integration as a future extension

------------------------------------------------------------------------

# 13. Data Model

## Project

``` typescript
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

``` typescript
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

``` typescript
Relationship {
  source
  target
  type
  evidence
}
```

Types:

-   imports
-   calls
-   depends_on
-   consumes
-   provides
-   writes
-   reads
-   publishes
-   subscribes

## Contract

``` typescript
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

``` typescript
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

``` typescript
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

``` typescript
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

------------------------------------------------------------------------

# 14. Risk Model

Use a transparent scoring model.

Example:

``` text
Risk =
  architecture impact
+ contract impact
+ dependency impact
+ security impact
+ change surface
+ uncertainty
```

Suggested levels:

### LOW

-   Local change
-   No public contract change
-   Existing dependency
-   No architecture violation

### MEDIUM

-   Multiple modules
-   Internal contract changes
-   New dependency
-   Moderate uncertainty

### HIGH

-   Public API change
-   Database migration
-   Security boundary
-   Cross-service contract
-   Major dependency change

### CRITICAL

-   Breaking public contract
-   Authentication/authorization boundary violation
-   Destructive database change
-   Explicit architecture policy violation

The score must be explainable; never expose a black-box number without
its contributing factors.

------------------------------------------------------------------------

# 15. Trust Model

The system should distinguish three kinds of conclusions.

## Deterministic

Examples:

-   File imports database module.
-   Package is present in lockfile.
-   API schema changed.
-   Rule explicitly forbids frontend → database.

These can be used for hard blocking.

## Evidence-based AI inference

Examples:

-   This new class appears to duplicate an existing service.
-   The change is likely to create unnecessary coupling.

These should normally generate REVIEW findings.

## Unknown

If the repository lacks evidence:

``` text
UNKNOWN

Could not determine whether external consumers
depend on this API.

Human review required.
```

This is much safer than pretending the model knows.

------------------------------------------------------------------------

# 16. UX Specification

## Dashboard

``` text
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

``` text
Describe your change

┌─────────────────────────────────────────────┐
│ Add a real-time notification service using │
│ WebSockets.                                 │
└─────────────────────────────────────────────┘

[ RUN PRE-FLIGHT ]
```

## Analysis screen

``` text
PRE-FLIGHT RUNNING

✓ Repository context loaded
✓ Architecture analyzed
✓ Contracts analyzed
✓ Dependencies analyzed
✓ Impact analyzed
◐ Security analysis
```

## Results

``` text
ARCHITECTURAL PRE-FLIGHT

Architecture       ✓ PASS
Contracts          ✕ FAIL
Dependencies       ⚠ REVIEW
Security           ✓ PASS
Impact             ⚠ HIGH

RESULT: BLOCKED
```

------------------------------------------------------------------------

# 17. Example End-to-End Scenario

## Existing system

``` text
React
  ↓
FastAPI
  ↓
Service Layer
  ↓
PostgreSQL
```

Rule:

``` text
frontend → database = forbidden
```

Developer asks:

> "For faster analytics, connect the dashboard directly to PostgreSQL."

## Agent analysis

Architecture Agent:

``` text
Violation detected.
```

Contract Agent:

``` text
Existing Analytics API already exposes required data.
```

Dependency Agent:

``` text
No new database client should be introduced into frontend.
```

Impact Agent:

``` text
Would bypass existing service boundary.
```

Security Agent:

``` text
Would expose database access credentials to client-side code.
```

## Final result

``` text
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

``` text
[Generate remediation]
```

Bob generates the compliant implementation.

------------------------------------------------------------------------

# 18. Advanced Features

These are not required for the MVP but can differentiate the product.

## 18.1 Architecture Drift Monitor

Compare:

``` text
Intended architecture
        vs
Actual architecture
```

## 18.2 Architecture Visualization

Interactive graph:

``` text
Frontend
   ↓
API
   ↓
Services
   ↓
Repositories
   ↓
Database
```

Click a node to see:

-   dependents
-   dependencies
-   contracts
-   ownership
-   recent changes

## 18.3 Git-aware analysis

Compare:

``` text
main
vs
feature branch
```

Only analyze the proposed delta plus affected dependencies.

## 18.4 Historical regression detection

Learn from previous architectural failures:

``` text
Previous PR:
Similar change
Result:
Rollback

Current change:
Similar pattern

Warning:
Historical regression pattern detected.
```

## 18.5 Ownership routing

If a change affects:

``` text
PaymentsService
```

show:

``` text
Suggested reviewer:
Payments team
```

## 18.6 Architecture review packet

Generate:

-   change summary
-   architecture impact
-   contract impact
-   dependency impact
-   security impact
-   affected components
-   remediation
-   approval decision

------------------------------------------------------------------------

# 19. MVP Scope

Do not build everything.

The competition MVP should implement:

### Must-have

1.  Repository indexing
2.  Architecture graph
3.  Natural-language change request
4.  IBM Bob orchestration
5.  Parallel specialist agents
6.  Architecture rule checking
7.  Contract discovery
8.  Change impact analysis
9.  Dependency/deprecation policy check
10. PASS/REVIEW/BLOCK decision
11. Evidence explorer
12. Remediation plan
13. Basic Bob implementation handoff

### Nice-to-have

-   GitHub PR integration
-   CI/CD gate
-   ADR memory
-   Security analysis
-   Historical analysis

### Future

-   Enterprise policy management
-   Multi-repository graphs
-   Organization-wide architecture governance
-   Automated migration planning
-   Architecture drift monitoring

------------------------------------------------------------------------

# 20. What NOT to Build for the Demo

Avoid spending the competition timeline building:

-   A full IDE
-   A complete static analyzer for every language
-   A replacement for SonarQube
-   A replacement for Snyk
-   A replacement for Pact
-   A generic chatbot
-   A universal dependency vulnerability database

Use existing analyzers and data sources where possible.

Your innovation is the **orchestration and decision layer**.

------------------------------------------------------------------------

# 21. Success Metrics

The competition statement proposes:

> 90% reduction in dead-end refactoring time\
> 0 deprecated heuristic library adoptions\
> Automated pre-build contract validation

Treat these as **targets to validate**, not unsupported claims.

## Primary KPI 1 --- Avoided rework

Measure:

``` text
baseline refactoring time
vs
time after pre-flight
```

Target:

> ≥90% reduction in intentionally constructed dead-end scenarios.

## KPI 2 --- Deprecated dependency prevention

``` text
Number of deprecated/policy-blocked dependencies
accepted by validated workflows
```

Target:

> 0 in benchmark scenarios designed to test the guardrail.

## KPI 3 --- Contract pre-validation coverage

``` text
proposed changes with contract analysis
---------------------------------------
total proposed changes
```

Target:

> 100% of supported MVP change types.

## Additional metrics

-   Precision of blocking findings
-   False-positive rate
-   False-negative rate
-   Mean pre-flight duration
-   Number of affected files correctly identified
-   Number of downstream consumers correctly identified
-   Remediation acceptance rate
-   Human override rate
-   Time from request to cleared implementation

------------------------------------------------------------------------

# 22. Evaluation Benchmark

Create a controlled benchmark with 20--30 changes.

Categories:

### Architecture

-   Layer violation
-   Duplicate service
-   Circular dependency
-   Unauthorized import

### Contracts

-   Breaking API change
-   Event schema change
-   Type change
-   Database schema change

### Dependencies

-   Deprecated package
-   Duplicate dependency
-   Version conflict
-   Existing internal alternative

### Refactoring

-   Dead-end abstraction
-   High-impact rename
-   Unsafe interface migration

### Security

-   Direct database access
-   Authentication bypass
-   Secret exposure

For each scenario record:

``` text
Ground truth
Tool result
Correct/incorrect
Time
Files identified
Severity
Final decision
```

------------------------------------------------------------------------

# 23. Demo Strategy

The strongest competition demo should use a repository deliberately
designed with hidden traps.

## Demo sequence

### Step 1

Open repository.

### Step 2

Run:

``` text
/init
```

IBM Bob creates persistent project context through `AGENTS.md`. [IBM Bob
`/init`](https://bob.ibm.com/docs/ide/tutorials/start-a-project)

### Step 3

Show architecture graph.

### Step 4

Submit:

> "Add a new notification service using Library X."

### Step 5

Spawn parallel agents.

### Step 6

Show findings:

``` text
Existing notification abstraction
+
Deprecated dependency
+
Event contract conflict
+
12 downstream consumers
```

### Step 7

System blocks implementation.

### Step 8

Click:

``` text
Generate remediation
```

### Step 9

Bob proposes:

``` text
Extend NotificationService
Use existing EventBus
Preserve NotificationEvent schema
```

### Step 10

Developer approves.

### Step 11

Bob implements.

### Step 12

Post-flight validation:

``` text
Architecture ✓
Contracts ✓
Dependencies ✓
Security ✓
Tests ✓

CLEARED FOR BUILD
```

------------------------------------------------------------------------

# 24. Why IBM Bob Is Central

The project should demonstrate IBM Bob as more than a coding assistant.

Bob becomes the **orchestrator**.

Its modes map naturally to the lifecycle:

``` text
PLAN
 ↓
Pre-flight analysis
 ↓
APPROVAL
 ↓
AGENT
 ↓
Implementation
 ↓
VERIFY
```

Its subagents map to specialized engineering roles:

``` text
Architect
Contract Analyst
Dependency Analyst
Impact Analyst
Security Reviewer
```

Bob's documentation explicitly supports custom modes, custom
instructions and restrictions around tools/subagents, which makes it
suitable for creating a specialized pre-flight workflow. [IBM Bob custom
modes](https://bob.ibm.com/docs/ide/configuration/custom-modes)

------------------------------------------------------------------------

# 25. Differentiation Statement

Use this in the competition presentation:

> **Architectural Pre-Flight is not another AI coding assistant, static
> analyzer, dependency scanner, or contract-testing framework. It is a
> pre-implementation decision layer that combines repository-wide
> context, deterministic architecture policies, discovered contracts,
> dependency intelligence, impact analysis and parallel AI reasoning to
> determine whether an intended software change is safe to build.**

Short version:

> **"Don't let the agent code first and discover the architecture later.
> Pre-flight the change first."**

------------------------------------------------------------------------

# 26. Competitive Moat

Potential long-term defensibility comes from:

1.  Repository knowledge graph
2.  Architecture decision history
3.  Change-to-impact relationships
4.  Contract discovery
5.  Organization-specific policies
6.  Historical change outcomes
7.  Evidence-backed remediation
8.  Integration into the coding-agent workflow

Over time, the system can learn:

``` text
Change intent
    ↓
Predicted impact
    ↓
Actual impact
    ↓
Test result
    ↓
Review outcome
    ↓
Production outcome
```

This creates a valuable feedback loop.

------------------------------------------------------------------------

# 27. Security and Privacy Requirements

The system may inspect source code, credentials configuration and
architecture information.

Therefore:

-   Never send secrets to the model intentionally.
-   Redact environment values.
-   Do not expose credentials in findings.
-   Respect repository permissions.
-   Keep audit logs.
-   Require explicit approval for writes.
-   Separate read-only analysis from modification.
-   Allow organizations to disable external MCP tools.
-   Make CI tokens scoped and revocable.
-   Support local analysis where possible.

IBM Bob's approval workflow is relevant because Bob can require approval
for operations that modify files or execute commands. [IBM Bob
quickstart](https://bob.ibm.com/docs/ide/getting-started/quickstart)

------------------------------------------------------------------------

# 28. Reliability Requirements

The system should never turn uncertainty into a false hard block.

Every finding must have:

``` text
Severity
Confidence
Evidence
Blocking status
Recommended action
```

Example:

``` text
HIGH
Confidence: 0.94
Blocking: YES

Evidence:
- Architecture rule AR-04
- src/dashboard/Dashboard.tsx:42
- database import detected
```

For AI-inferred findings:

``` text
MEDIUM
Confidence: 0.71
Blocking: NO

Reason:
Possible duplicate abstraction.

Action:
Human review recommended.
```

------------------------------------------------------------------------

# 29. Performance Requirements

For a medium repository:

Target:

-   Initial indexing: \<2 minutes
-   Incremental indexing: \<30 seconds
-   Pre-flight analysis: \<60 seconds
-   Simple local changes: \<15 seconds

For larger repositories:

Use:

-   Incremental indexing
-   Dependency-aware retrieval
-   Symbol-level context
-   Parallel subagents
-   Cached analysis
-   Changed-file prioritization

IBM Bob's large-project guidance recommends focused context,
symbol-level tools and isolated subagents to manage large codebases
efficiently. [IBM Bob large
projects](https://bob.ibm.com/docs/ide/core-concepts/large-projects)

------------------------------------------------------------------------

# 30. Implementation Roadmap

## Phase 1 --- Foundation

Build:

-   Repository scanner
-   File/symbol index
-   Dependency graph
-   Architecture graph
-   Basic UI

## Phase 2 --- Pre-flight

Build:

-   Change intent parser
-   Architecture agent
-   Contract agent
-   Impact agent
-   Dependency agent
-   Decision engine

## Phase 3 --- Bob Integration

Build:

-   Custom Bob mode
-   Pre-flight prompt/rules
-   Subagent orchestration
-   Remediation workflow
-   Approval flow

## Phase 4 --- Enforcement

Build:

-   Architecture-as-code
-   Contract policies
-   Dependency policies
-   CLI
-   CI gate

## Phase 5 --- Intelligence

Build:

-   ADR memory
-   Historical changes
-   Architecture drift
-   Risk learning
-   Better remediation

------------------------------------------------------------------------

# 31. Proposed Repository Structure

``` text
architectural-preflight/
│
├── frontend/
│   ├── dashboard/
│   ├── preflight/
│   ├── architecture/
│   ├── findings/
│   └── remediation/
│
├── backend/
│   ├── api/
│   ├── agents/
│   │   ├── architecture/
│   │   ├── contracts/
│   │   ├── dependencies/
│   │   ├── impact/
│   │   └── security/
│   │
│   ├── graph/
│   ├── contracts/
│   ├── policies/
│   ├── decision/
│   ├── evidence/
│   └── remediation/
│
├── analyzers/
│   ├── source/
│   ├── dependencies/
│   ├── openapi/
│   ├── graphql/
│   ├── database/
│   └── git/
│
├── bob/
│   ├── modes/
│   ├── agents/
│   ├── prompts/
│   └── workflows/
│
├── policies/
│   ├── architecture.yaml
│   ├── dependencies.yaml
│   └── contracts.yaml
│
├── tests/
│   ├── benchmark/
│   ├── architecture/
│   ├── contracts/
│   └── integration/
│
└── docs/
    ├── architecture.md
    ├── adr/
    └── api/
```

------------------------------------------------------------------------

# 32. Example Architecture Policy

``` yaml
version: "1.0"

layers:

  frontend:
    allowed_dependencies:
      - api
      - ui

  api:
    allowed_dependencies:
      - services
      - schemas

  services:
    allowed_dependencies:
      - repositories
      - external

  repositories:
    allowed_dependencies:
      - database

rules:

  - id: ARCH-001
    description: "Frontend must not access database"
    from: frontend
    to: database
    action: block

  - id: ARCH-002
    description: "API must not access database directly"
    from: api
    to: database
    action: block

dependencies:

  forbidden:
    - deprecated-library-x

  approval_required:
    - database-driver
    - message-broker
```

------------------------------------------------------------------------

# 33. Example Pre-flight API

``` http
POST /api/preflight
```

Request:

``` json
{
  "projectId": "orca",
  "change": "Add a real-time notification service using WebSockets",
  "branch": "feature/notifications"
}
```

Response:

``` json
{
  "status": "BLOCKED",
  "risk": "HIGH",
  "findings": [
    {
      "category": "architecture",
      "severity": "high",
      "blocking": true,
      "title": "Existing notification abstraction detected"
    },
    {
      "category": "dependency",
      "severity": "high",
      "blocking": true,
      "title": "Requested dependency violates dependency policy"
    },
    {
      "category": "contract",
      "severity": "medium",
      "blocking": false,
      "title": "Existing event contract may require extension"
    }
  ],
  "affectedFiles": 14,
  "recommendation": "Extend existing NotificationService"
}
```

------------------------------------------------------------------------

# 34. Example CLI

``` bash
preflight init
preflight index

preflight analyze \
  --change "Add real-time notification service"

preflight validate

preflight explain FINDING-102

preflight remediate FINDING-102

preflight ci
```

------------------------------------------------------------------------

# 35. Risks

## Risk: False positives

Mitigation: - Evidence requirements - Confidence levels - Human review -
Deterministic rules for blocking

## Risk: Repository too large

Mitigation: - Incremental graph - Symbol-level retrieval - Cached
analysis - Bob subagents

## Risk: AI hallucination

Mitigation: - Ground findings in repository evidence - Never block
solely on low-confidence inference - Require deterministic evidence for
hard policy violations

## Risk: Existing tools already cover the problem

Mitigation: - Integrate rather than replace. - Position as orchestration
and pre-implementation decision layer.

## Risk: Overengineering

Mitigation: - MVP supports one or two languages. - Start with
TypeScript + Python. - Start with REST/OpenAPI + TypeScript contracts. -
Demonstrate 5--8 high-value architecture rules.

------------------------------------------------------------------------

# 36. Recommended MVP Tech Choices

For the competition, use:

### Frontend

**React + TypeScript + Tailwind + React Flow**

### Backend

**FastAPI + Python**

### Graph

**NetworkX initially**

### Parsing

**Tree-sitter + package metadata**

### Storage

**PostgreSQL**

### Agent orchestration

**IBM Bob 2.0 Agent mode + custom Pre-Flight mode + subagents**

### Integration

**MCP where appropriate**

### CI

**GitHub Actions**

This stack is achievable without spending the entire project on
infrastructure.

------------------------------------------------------------------------

# 37. Final Product Definition

## Product name

**Architectural Pre-Flight**

## Tagline

> **Validate the change before you build the change.**

## One-line description

> An autonomous architecture and contract enforcement engine that uses
> IBM Bob's repository context and specialized agents to pre-validate
> software changes before implementation.

## Problem

AI coding agents can accelerate implementation while still making
repository-incompatible architectural, dependency and contract
decisions.

## Solution

A pre-implementation gate that analyzes change intent against repository
architecture, contracts, dependencies, security boundaries and
downstream impact.

## Differentiator

**The system is not primarily generating code. It is deciding whether
the proposed implementation is safe to generate.**

## Core loop

``` text
UNDERSTAND
    ↓
PREFLIGHT
    ↓
VALIDATE
    ↓
BLOCK / REVIEW / CLEAR
    ↓
REMEDIATE
    ↓
IMPLEMENT
    ↓
VERIFY
```

------------------------------------------------------------------------

# 38. Competition Pitch

### 30-second pitch

> **AI coding agents have made writing software dramatically faster, but
> they can also make the wrong architectural decision dramatically
> faster. Architectural Pre-Flight sits before the coding agent. It
> understands the entire repository, discovers its contracts and
> architecture rules, and uses parallel IBM Bob agents to analyze a
> proposed change for conflicts, dependency problems and downstream
> impact. If the change violates a contract, it is blocked before
> implementation. If it is safe, Bob gets the green light to build it.
> We turn AI coding from "generate first, debug later" into "validate
> first, build confidently."**

### 10-second pitch

> **"Before an AI agent writes the code, we ask whether the code should
> be written at all."**

------------------------------------------------------------------------

# 39. Research Sources

The following sources were consulted for this PRD and should be
re-checked before final submission because product capabilities and
documentation can change:

1.  IBM Bob --- product overview and capabilities\
    https://bob.ibm.com/docs/ide

2.  IBM Bob --- `/init` and persistent `AGENTS.md` repository context\
    https://bob.ibm.com/docs/ide/tutorials/start-a-project

3.  IBM Bob --- repository documentation and custom context workflow\
    https://bob.ibm.com/docs/ide/tutorials/document-repositories-with-custom-modes-practical-workflow

4.  IBM Bob --- subagents\
    https://bob.ibm.com/docs/shell/features/subagents

5.  IBM Bob --- custom modes\
    https://bob.ibm.com/docs/ide/configuration/custom-modes

6.  IBM Bob --- large-project context management\
    https://bob.ibm.com/docs/ide/core-concepts/large-projects

7.  IBM Bob --- quickstart and approval workflow\
    https://bob.ibm.com/docs/ide/getting-started/quickstart

8.  Sourcegraph --- intelligence layer for AI coding agents\
    https://sourcegraph.com/blog/a-new-era-for-sourcegraph-the-intelligence-layer-for-ai-coding-agents-and-developers

9.  Sourcegraph --- agentic coding and repository context\
    https://sourcegraph.com/blog/agentic-coding

10. SonarQube --- architecture analysis\
    https://docs.sonarsource.com/sonarqube-server/2025.3/design-and-architecture/configuring-the-architecture-analysis

11. Sonar --- architecture management for agent-generated code\
    https://www.sonarsource.com/blog/sonarqube-architecture-management-keeps-agent-generated-code-sound/

12. Pact --- contract testing documentation\
    https://docs.pact.io/

13. Pacto --- architecture and contract model\
    https://pacto.run/latest/architecture/

14. Pacto --- developer workflow\
    https://pacto.run/latest/developers/

------------------------------------------------------------------------

# 40. Final Recommendation

The project should **not** try to win by having the largest number of AI
features.

The strongest competition story is:

``` text
                 EXISTING WORLD

AI coding agent → writes code
SonarQube       → analyzes code
Snyk            → analyzes dependencies/security
Pact            → validates contracts
Sourcegraph     → provides code intelligence


                 YOUR PRODUCT

Developer intent
       ↓
Repository context
       ↓
Architecture
       +
Contracts
       +
Dependencies
       +
Impact
       +
Security
       ↓
PRE-FLIGHT DECISION
       ↓
PASS / REVIEW / BLOCK
       ↓
IBM BOB IMPLEMENTS
       ↓
POST-FLIGHT VERIFICATION
```

The winning idea is therefore not **"we built another AI developer
tool."**

It is:

> **"We built the safety and decision layer that sits between developer
> intent and autonomous code generation."**

That is the product boundary to preserve throughout implementation.
