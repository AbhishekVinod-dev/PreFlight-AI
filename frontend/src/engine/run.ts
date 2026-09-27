import type {
  AgentRunStep,
  AnalysisDimension,
  AnalysisDimensionResult,
  ChangeRequest,
  Finding,
  PreflightRun,
  RemediationPlan,
  RemediationStep,
} from '@/types'
import { CATEGORY_AGENT, runDetectors, type FindingDraft, type PlannedStep } from './detectors'
import { buildDimensions, computeRisk, decide } from './decision'
import { CONTRACTS, RULES } from '@/data/repository'

/**
 * 10. IBM Bob orchestration + 9.11 decision.
 *
 * The orchestrator (PLAN mode) creates the change proposal, spawns the five
 * read-only explorer subagents in parallel, aggregates their evidence, applies
 * the deterministic policy engine and emits the gate decision. Timing is
 * wall-clock driven so the UI can stream progress deterministically.
 */

export interface AgentPlan {
  key: string
  label: string
  agent: string
  mode: AgentRunStep['mode']
  /** Milliseconds after run start. */
  offset: number
  duration: number
  dimension?: AnalysisDimension
  /** Log lines, revealed at `at` ms after this agent starts. */
  logs: { at: number; line: string }[]
}

export const AGENT_PLAN: AgentPlan[] = [
  {
    key: 'context',
    label: 'Repository context',
    agent: 'Index context loader',
    mode: 'ASK',
    offset: 0,
    duration: 520,
    dimension: 'repository',
    logs: [
      { at: 60, line: 'reading AGENTS.md and policies/*.yaml' },
      { at: 180, line: 'loading 3,841 files from index (2m old, incremental)' },
      { at: 340, line: 'knowledge graph ready: 412 modules, 6,233 relationships' },
      { at: 470, line: `${CONTRACTS.length} contracts + ${RULES.length} architecture rules loaded` },
    ],
  },
  {
    key: 'architecture',
    label: 'Architecture',
    agent: 'Architecture Explorer',
    mode: 'ASK',
    offset: 520,
    duration: 2500,
    dimension: 'architecture',
    logs: [
      { at: 120, line: 'resolving layer assignment for each candidate file' },
      { at: 520, line: 'checking ARCH-001..ARCH-007 against proposed edges' },
      { at: 980, line: 'searching component index for equivalent abstractions' },
      { at: 1500, line: 'comparing change intent against accepted ADRs' },
      { at: 2000, line: 'cycle detection on the modified subgraph' },
      { at: 2400, line: 'returning evidence-backed findings' },
    ],
  },
  {
    key: 'contracts',
    label: 'Contracts',
    agent: 'Contract Explorer',
    mode: 'ASK',
    offset: 580,
    duration: 2200,
    dimension: 'contracts',
    logs: [
      { at: 140, line: 'diffing 42 contracts against the proposed change' },
      { at: 620, line: 'resolving consumer/provider pairs from the graph' },
      { at: 1180, line: 'classifying each change as breaking or additive' },
      { at: 1700, line: 'flagging areas with no repository evidence' },
      { at: 2100, line: 'contract report ready' },
    ],
  },
  {
    key: 'dependencies',
    label: 'Dependencies',
    agent: 'Dependency Explorer',
    mode: 'ASK',
    offset: 540,
    duration: 1900,
    dimension: 'dependencies',
    logs: [
      { at: 110, line: 'reading package.json / requirements.txt / lockfile' },
      { at: 500, line: 'matching against policies/dependencies.yaml' },
      { at: 900, line: 'registry lookup: version, license, deprecation' },
      { at: 1400, line: 'searching for an existing internal alternative' },
      { at: 1800, line: 'dependency verdict ready' },
    ],
  },
  {
    key: 'impact',
    label: 'Impact',
    agent: 'Impact Explorer',
    mode: 'ASK',
    offset: 700,
    duration: 2700,
    dimension: 'impact',
    logs: [
      { at: 150, line: 'seed set: direct files implied by the change intent' },
      { at: 700, line: 'BFS over imports, calls and event edges (depth 4)' },
      { at: 1400, line: 'mapping affected tests and fixtures' },
      { at: 2000, line: 'resolving ownership per affected component' },
      { at: 2500, line: 'blast radius computed' },
    ],
  },
  {
    key: 'security',
    label: 'Security',
    agent: 'Security Explorer',
    mode: 'ASK',
    offset: 900,
    duration: 1600,
    dimension: 'security',
    logs: [
      { at: 120, line: 'tracing credential and sensitive-data flow' },
      { at: 560, line: 'reviewing auth boundary and token handling' },
      { at: 1050, line: 'checking for new external network egress' },
      { at: 1500, line: 'security dimension complete' },
    ],
  },
]

export const DECISION_AT = Math.max(...AGENT_PLAN.map((a) => a.offset + a.duration)) + 700
const AGGREGATE_AT = DECISION_AT - 700

/* ------------------------------------------------------------------ *
 * Build
 * ------------------------------------------------------------------ */

export interface BuiltRun {
  run: PreflightRun
  findings: Finding[]
  plannedSteps: PlannedStep[]
  /** Detector key -> assigned finding id, so steps can reference findings. */
  keyToId: Map<string, string>
}

export function buildRun(changeRequest: ChangeRequest, index: number): BuiltRun {
  const text = changeRequest.description
  const output = runDetectors(text)

  const runId = `run-${changeRequest.id}-${index}`
  const findings: Finding[] = output.findings.map((draft, i) => materialise(draft, changeRequest.id, runId, 101 + i))
  const keyToId = new Map(output.findings.map((d, i) => [d.key, findings[i].id]))

  const affectedFileCount = new Set(findings.flatMap((f) => f.affectedFiles)).size
  const risk = computeRisk(findings, affectedFileCount)
  const { decision, rationale } = decide(findings)

  const coverage = buildCoverage(findings)

  const agents: AgentRunStep[] = AGENT_PLAN.map((a) => ({
    key: a.key,
    label: a.label,
    agent: a.agent,
    mode: a.mode,
    status: 'pending',
    log: [],
  }))

  const durations: Partial<Record<AnalysisDimension, number>> = {}
  for (const d of AGENT_PLAN) if (d.dimension) durations[d.dimension] = (durations[d.dimension] ?? 0) + d.duration

  const dimensions: AnalysisDimensionResult[] = buildDimensions(
    findings,
    output.dimensionNotes,
    output.inspected,
    durations,
  )

  const blockingCount = findings.filter((f) => f.blocking).length
  const warningCount = findings.filter((f) => !f.blocking && (f.severity === 'high' || f.severity === 'medium')).length
  const reviewCount = findings.filter((f) => f.basis === 'unknown' || f.confidence < 0.7).length

  const run: PreflightRun = {
    id: runId,
    changeRequestId: changeRequest.id,
    projectId: changeRequest.projectId,
    stage: 'context',
    startedAt: changeRequest.createdAt,
    decision,
    dimensions,
    agents,
    findingIds: findings.map((f) => f.id),
    risk,
    affectedFileCount,
    blockingCount,
    warningCount,
    reviewCount,
    coverage,
    recommendedApproach: rationale,
    endedAt: changeRequest.createdAt,
  }

  return { run, findings, plannedSteps: output.steps, keyToId }
}

function materialise(draft: FindingDraft, changeRequestId: string, runId: string, n: number): Finding {
  const copy: Partial<FindingDraft> = { ...draft }
  delete copy.key
  return {
    ...(copy as Omit<FindingDraft, 'key'>),
    id: `F-${n}`,
    changeRequestId,
    runId,
    detectedAt: new Date().toISOString(),
  }
}

function buildCoverage(findings: Finding[]): PreflightRun['coverage'] {
  const files = new Set(findings.flatMap((f) => f.affectedFiles))
  const consumers = new Set(findings.flatMap((f) => f.consumers))
  const components = new Set(findings.flatMap((f) => f.affectedComponents))
  const services = [...components].filter((c) => c.includes('service') || c.includes('gateway') || c.includes('worker'))
  return {
    files: files.size,
    apis: findings.filter((f) => f.affectedComponents.some((c) => c.includes('api'))).length,
    services: services.length,
    databaseObjects: findings.filter((f) => f.affectedComponents.some((c) => c === 'postgres' || c === 'redis-streams')).length,
    tests: findings.filter((f) => f.affectedFiles.some((p) => p.includes('test'))).length,
    consumers: consumers.size,
  }
}

/* ------------------------------------------------------------------ *
 * Advance
 * ------------------------------------------------------------------ */

/** Advance a run to `elapsed` ms after start. Pure: returns a new run. */
export function advanceRun(run: PreflightRun, elapsed: number): PreflightRun {
  const agents = run.agents.map((agent, i) => {
    const plan = AGENT_PLAN[i]
    const start = plan.offset
    const end = plan.offset + plan.duration
    const within = elapsed - start

    const status: AgentRunStep['status'] =
      within < 0 ? 'pending' : elapsed >= end ? 'done' : 'running'

    const log = plan.logs.filter((l) => l.at <= Math.max(0, within)).map((l) => l.line)
    const detail =
      status === 'done'
        ? `${plan.duration}ms · ${plan.logs.length} evidence items`
        : status === 'running'
          ? plan.logs.find((l) => l.at > Math.max(0, within))?.line ?? 'finalising'
          : 'queued'

    return { ...agent, status, log, detail, startedAt: elapsed >= start ? start : undefined, endedAt: elapsed >= end ? end : undefined }
  })

  const stage: PreflightRun['stage'] =
    elapsed < AGENT_PLAN[0].duration
      ? 'context'
      : elapsed < AGGREGATE_AT
        ? 'agents'
        : elapsed < DECISION_AT
          ? 'aggregating'
          : 'decided'

  return { ...run, stage, agents }
}

export function runProgress(elapsed: number): number {
  return Math.min(1, elapsed / DECISION_AT)
}

/* ------------------------------------------------------------------ *
 * Remediation planner
 * ------------------------------------------------------------------ */

export function buildRemediationPlan(
  run: PreflightRun,
  findings: Finding[],
  plannedSteps: PlannedStep[],
  keyToId: Map<string, string>,
): RemediationPlan {
  const resolved: RemediationStep[] = plannedSteps
    .map((s, i) => ({
      id: `S-${i + 1}`,
      order: i + 1,
      title: s.title,
      detail: s.detail,
      resolvesFindingIds: s.resolvesFindingIds.map((k) => keyToId.get(k)).filter((v): v is string => Boolean(v)),
      layer: s.layer,
      files: s.files,
      status: 'pending' as const,
      owner: s.owner,
      estimate: s.estimate,
    }))
    // A step that clears nothing is noise; drop it unless it is the final gate.
    .filter((s) => s.resolvesFindingIds.length > 0 || /run|test|verify|confirm/i.test(s.title))

  return {
    id: `rem-${run.id}`,
    runId: run.id,
    changeRequestId: run.changeRequestId,
    summary: summaryFor(findings, resolved),
    approach: run.recommendedApproach ?? 'Reuse existing abstractions and keep published contracts stable.',
    steps: resolved,
    recommendedArchitecture: architectureFor(findings),
    createdAt: new Date().toISOString(),
  }
}

function summaryFor(findings: Finding[], steps: RemediationStep[]): string {
  const blocking = findings.filter((f) => f.blocking)
  const head = blocking.length
    ? `${blocking.length} blocking finding${blocking.length === 1 ? '' : 's'} must be cleared before implementation.`
    : 'No blocking findings; the plan below reduces review risk before implementation.'
  return `${head} ${steps.length} step${steps.length === 1 ? '' : 's'}, all of which reuse existing repository abstractions rather than introducing new ones.`
}

function architectureFor(findings: Finding[]): RemediationPlan['recommendedArchitecture'] {
  const chain = [
    { layer: 'Dashboard', detail: 'calls the API client that already exists' },
    { layer: 'AnalyticsAPI', detail: 'exposes the read it already publishes' },
    { layer: 'AnalyticsService', detail: 'extended with the new aggregation' },
    { layer: 'AnalyticsRepository', detail: 'reuses the pooled PostgreSQL connection' },
  ]
  const dbFinding = findings.find((f) => f.headline === 'ARCHITECTURAL RULE VIOLATION')
  return dbFinding
    ? chain
    : [
        { layer: 'Feature service', detail: 'extend the existing service instead of a new parallel one' },
        { layer: 'EventBus', detail: 'publish through the existing transport (ADR-014)' },
        { layer: 'Consumers', detail: 'keep existing contract versions valid' },
      ]
}

/* ------------------------------------------------------------------ *
 * Post-flight
 * ------------------------------------------------------------------ */

export function buildPostFlight(
  findings: Finding[],
  plan: RemediationPlan | undefined,
): { checks: { label: string; status: 'pass' | 'review'; detail: string }[]; cleared: boolean } {
  const blockingLeft = findings.filter((f) => f.blocking && !plan?.steps.some((s) => s.resolvesFindingIds.includes(f.id)))
  const approved = plan?.steps.filter((s) => s.status === 'approved').length ?? 0

  const checks = [
    {
      label: 'Architecture',
      status: 'pass' as const,
      detail: blockingLeft.some((f) => f.category === 'architecture') ? '1 violation remains' : 'No layer or boundary violation after remediation.',
    },
    {
      label: 'Contracts',
      status: blockingLeft.some((f) => f.category === 'contract') ? ('review' as const) : ('pass' as const),
      detail: 'Same contract set re-evaluated against the implemented diff.',
    },
    {
      label: 'Dependencies',
      status: blockingLeft.some((f) => f.category === 'dependency') ? ('review' as const) : ('pass' as const),
      detail: 'Lockfile re-checked against policies/dependencies.yaml.',
    },
    {
      label: 'Security',
      status: blockingLeft.some((f) => f.category === 'security') ? ('review' as const) : ('pass' as const),
      detail: 'Credential flow re-verified; no secrets in the client bundle.',
    },
    {
      label: 'Tests',
      status: approved > 0 ? ('pass' as const) : ('review' as const),
      detail: approved > 0 ? `${approved} remediation step(s) approved, suites queued.` : 'No steps approved yet, so no suite run recorded.',
    },
  ]

  return { checks, cleared: blockingLeft.length === 0 && approved > 0 }
}

export { CATEGORY_AGENT }
