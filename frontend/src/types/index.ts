/**
 * Domain model for Architectural Pre-Flight.
 *
 * Shapes mirror PRD v1.0 section 13 (Data Model) and section 33 (Pre-flight
 * API) so the mock engine and a real FastAPI backend can share one contract.
 */

/* ------------------------------------------------------------------ *
 * 13. Data model
 * ------------------------------------------------------------------ */

export interface Project {
  id: string
  name: string
  repository: string
  defaultBranch: string
  createdAt: string
  lastIndexedAt: string
  /** Indexing health, surfaced on the dashboard (PRD 16). */
  index: IndexStats
}

export interface IndexStats {
  status: 'idle' | 'indexing' | 'ready' | 'stale'
  files: number
  modules: number
  symbols: number
  relationships: number
  /** Wall-clock duration of the last index pass, seconds. */
  durationSeconds: number
  /** Indexed file extensions, e.g. ['.ts', '.tsx', '.py']. */
  languages: string[]
}

export type ComponentType =
  | 'frontend'
  | 'api'
  | 'service'
  | 'repository'
  | 'database'
  | 'event'
  | 'library'
  | 'external'

export interface Component {
  id: string
  projectId: string
  name: string
  type: ComponentType
  path: string
  owner: string
  /** One-line role used in the graph inspector (PRD 18.2). */
  description?: string
}

export type RelationshipType =
  | 'imports'
  | 'calls'
  | 'depends_on'
  | 'consumes'
  | 'provides'
  | 'writes'
  | 'reads'
  | 'publishes'
  | 'subscribes'

export interface Relationship {
  id: string
  projectId: string
  source: string
  target: string
  type: RelationshipType
  /** File:line pairs backing the edge. */
  evidence: EvidenceRef[]
  /** True when an architecture-as-code rule allows this direction. */
  allowed: boolean
  /** Set when a rule forbids this direction. */
  violatedRuleId?: string
}

export type ContractType =
  | 'api'
  | 'type'
  | 'event'
  | 'database'
  | 'configuration'
  | 'authentication'

export interface Contract {
  id: string
  projectId: string
  name: string
  type: ContractType
  source: string
  version: string
  consumers: string[]
  providers: string[]
  /** Breaking change marks the contract as unsafe to change silently. */
  breaking: boolean
  /** True when the change is fully internal to the repository. */
  isPublic: boolean
}

export type RuleEnforcement = 'block' | 'review' | 'warn'

export interface ArchitectureRule {
  id: string
  projectId: string
  /** e.g. 'layer-boundary', 'duplicate-abstraction', 'dependency-policy'. */
  ruleType: string
  description: string
  expression: string
  severity: Severity
  enforcement: RuleEnforcement
  enabled: boolean
}

export type ChangeRequestStatus =
  | 'draft'
  | 'analyzing'
  | 'blocked'
  | 'review_required'
  | 'cleared'
  | 'remediating'
  | 'implementing'
  | 'verified'
  | 'overridden'

export interface ChangeRequest {
  id: string
  projectId: string
  description: string
  branch?: string
  /** Structured change proposal (PRD 9.2). */
  proposal: ChangeProposal
  risk: RiskBreakdown
  status: ChangeRequestStatus
  createdAt: string
  /** Populated once a pre-flight run completes. */
  runId?: string
  decision?: Decision
}

export type FindingCategory =
  | 'architecture'
  | 'contract'
  | 'dependency'
  | 'impact'
  | 'security'
  | 'decision-memory'
  | 'dead-end'
  | 'unknown'

export interface Finding {
  id: string
  changeRequestId: string
  runId: string
  category: FindingCategory
  severity: Severity
  /** 0..1. Always surfaced; a finding without confidence is not shown. */
  confidence: number
  title: string
  explanation: string
  evidence: EvidenceRef[]
  affectedFiles: string[]
  affectedComponents: string[]
  symbols: string[]
  consumers: string[]
  contractId?: string
  ruleId?: string
  /** Deterministic rule hit, AI inference, or insufficient evidence (PRD 15). */
  basis: TrustBasis
  blocking: boolean
  remediation: string
  /** e.g. "POSSIBLE DEAD-END REFACTOR" */
  headline?: string
  detectedAt: string
}

/* ------------------------------------------------------------------ *
 * 9.2 Change intent analyzer
 * ------------------------------------------------------------------ */

export interface ChangeProposal {
  intent: string
  affectedDomains: string[]
  likelyOperations: string[]
  expectedRisk: RiskLevel
  /** Populated when the analyzer needs a human to disambiguate intent. */
  assumptions: string[]
  clarifications?: string[]
  /** Specific risk rationales extracted from matched signals */
  notes?: string[]
}

/* ------------------------------------------------------------------ *
 * 14. Risk model - every factor is kept so the score is explainable
 * ------------------------------------------------------------------ */

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface RiskFactor {
  key: string
  label: string
  /** Points contributed by this factor. */
  weight: number
  max: number
  detail: string
}

export interface RiskBreakdown {
  level: RiskLevel
  /** 0..100. */
  score: number
  factors: RiskFactor[]
  drivers: string[]
}

/* ------------------------------------------------------------------ *
 * 15. Trust model
 * ------------------------------------------------------------------ */

export type TrustBasis = 'deterministic' | 'inference' | 'unknown'

/* ------------------------------------------------------------------ *
 * Shared primitives
 * ------------------------------------------------------------------ */

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export type Decision = 'CLEARED' | 'BLOCKED' | 'REVIEW_REQUIRED'

export type DimensionStatus = 'pass' | 'review' | 'block' | 'unknown' | 'pending'

export type AnalysisDimension =
  | 'repository'
  | 'architecture'
  | 'contracts'
  | 'dependencies'
  | 'impact'
  | 'security'

export interface EvidenceRef {
  path: string
  line?: number
  /** Optional rendered excerpt for the evidence explorer. */
  snippet?: string
  symbol?: string
}

export interface AnalysisDimensionResult {
  dimension: AnalysisDimension
  label: string
  status: DimensionStatus
  /** Present when the dimension produced at least one finding. */
  findingIds: string[]
  summary: string
  durationMs: number
  /** Files/symbols the agent read to reach the conclusion. */
  inspected: number
  agent: string
}

/* ------------------------------------------------------------------ *
 * 9.11 Pre-flight run
 * ------------------------------------------------------------------ */

export type RunStage = 'queued' | 'context' | 'agents' | 'aggregating' | 'decided' | 'failed'

export interface AgentRunStep {
  key: string
  label: string
  agent: string
  mode: 'PLAN' | 'ASK' | 'AGENT'
  status: 'pending' | 'running' | 'done' | 'failed' | 'skipped'
  detail?: string
  startedAt?: number
  endedAt?: number
  /** Streaming log lines from the isolated subagent context. */
  log: string[]
}

export interface PreflightRun {
  id: string
  changeRequestId: string
  projectId: string
  stage: RunStage
  startedAt: string
  endedAt?: string
  decision?: Decision
  dimensions: AnalysisDimensionResult[]
  agents: AgentRunStep[]
  findingIds: string[]
  risk: RiskBreakdown
  affectedFileCount: number
  blockingCount: number
  warningCount: number
  reviewCount: number
  /** Counts surfaced in the results header (PRD 9.11). */
  coverage: {
    files: number
    apis: number
    services: number
    databaseObjects: number
    tests: number
    consumers: number
  }
  recommendedApproach?: string
}

/* ------------------------------------------------------------------ *
 * 9.13 Remediation planner
 * ------------------------------------------------------------------ */

export type RemediationStepStatus = 'pending' | 'approved' | 'rejected' | 'done'

export interface RemediationStep {
  id: string
  order: number
  title: string
  detail: string
  /** Findings this step resolves. */
  resolvesFindingIds: string[]
  layer: 'api' | 'service' | 'repository' | 'frontend' | 'test' | 'config'
  /** Files Bob will touch on approval. */
  files: string[]
  status: RemediationStepStatus
  /** Reviewer routed by ownership (PRD 18.5). */
  owner?: string
  estimate?: string
}

export interface RemediationPlan {
  id: string
  runId: string
  changeRequestId: string
  summary: string
  approach: string
  steps: RemediationStep[]
  /** Suggested compliant call path, e.g. Dashboard -> API -> Service -> DB. */
  recommendedArchitecture: { layer: string; detail: string }[]
  createdAt: string
  approvedAt?: string
  approvedBy?: string
}

/* ------------------------------------------------------------------ *
 * 9.9 Architecture decision records
 * ------------------------------------------------------------------ */

export type AdrStatus = 'Accepted' | 'Proposed' | 'Deprecated' | 'Superseded' | 'Rejected'

export interface Adr {
  id: string
  projectId: string
  title: string
  decision: string
  reason: string
  status: AdrStatus
  date: string
  alternatives: string[]
  /** Entities (packages, services, technologies) the decision constrains. */
  constrains: string[]
  supersedes?: string
  author: string
}

/* ------------------------------------------------------------------ *
 * 9.5 Dependency guardian
 * ------------------------------------------------------------------ */

export interface DependencyRecord {
  name: string
  version: string
  /** 'direct' | 'transitive' */
  scope: 'direct' | 'transitive'
  deprecated: boolean
  replacedBy?: string
  license: string
  weeklyDownloads: number
  policy: 'allowed' | 'approval-required' | 'forbidden'
  /** Internal abstraction that already solves the problem (PRD 9.5 step 6). */
  internalAlternative?: string
}

/* ------------------------------------------------------------------ *
 * 21. Success metrics
 * ------------------------------------------------------------------ */

export interface MetricPoint {
  label: string
  value: number
  baseline?: number
}

export interface BenchmarkScenario {
  id: string
  name: string
  category: 'architecture' | 'contract' | 'dependency' | 'refactoring' | 'security'
  /** What a human architect decided the correct verdict should be. */
  groundTruth: Decision
  /** What the pre-flight engine actually returned. */
  toolResult: Decision
  correct: boolean
  groundTruthLabel: string
  severity: Severity
  filesIdentified: number
  timeSeconds: number
  confidence: number
  /** True when the run performed contract analysis for this scenario. */
  contractAnalysisRan: boolean
  findingsRaised: number
}

export interface ProjectMetrics {
  avoidedRework: MetricPoint[]
  deprecatedAdoptionsPrevented: number
  contractCoveragePct: number
  preflightDurationSeconds: number
  findingsPrecisionPct: number
  falsePositiveRatePct: number
  remediationAcceptancePct: number
  humanOverridePct: number
  benchmark: BenchmarkScenario[]
}
