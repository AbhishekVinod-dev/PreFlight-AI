import type {
  Adr,
  ArchitectureRule,
  BenchmarkScenario,
  ChangeRequest,
  Component,
  Contract,
  Finding,
  PreflightRun,
  Project,
  ProjectMetrics,
  Relationship,
  RemediationPlan,
  RemediationStepStatus,
  RiskBreakdown,
} from '@/types'
import {
  ADRS,
  CONTRACTS,
  COMPONENTS,
  DEPENDENCIES,
  PROJECT,
  RELATIONSHIPS,
  RULES,
} from '@/data/repository'
import { analyzeIntent } from '@/engine/intent'
import { advanceRun, buildPostFlight, buildRemediationPlan, buildRun, DECISION_AT, type BuiltRun } from '@/engine/run'
import { createBenchmark, BENCHMARK_SEEDS } from '@/data/benchmarks'

/**
 * In-memory backend standing in for the FastAPI service described in PRD 33.
 *
 * Every method below maps 1:1 onto an endpoint; swap `MockBackend` for a
 * `fetch`-based implementation and the UI needs no changes.
 *
 *   GET  /api/project
 *   GET  /api/project/graph
 *   GET  /api/policies/architecture
 *   GET  /api/adr
 *   GET  /api/changes
 *   POST /api/changes
 *   POST /api/preflight                    (PRD 33)
 *   GET  /api/runs/:id
 *   POST /api/runs/:id/remediation
 *   PATCH /api/remediation/:id/steps/:stepId
 *   GET  /api/runs/:id/postflight
 *   GET  /api/metrics
 */

const LATENCY = 260
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

interface Store {
  project: Project
  requests: ChangeRequest[]
  runs: Map<string, PreflightRun>
  findings: Map<string, Finding[]>
  plans: Map<string, RemediationPlan>
  built: Map<string, BuiltRun>
}

const HISTORY: { description: string; branch: string; ageMinutes: number; status: ChangeRequest['status'] }[] = [
  { description: 'For faster analytics, connect the dashboard directly to PostgreSQL.', branch: 'feat/dashboard-direct-db', ageMinutes: 34, status: 'blocked' },
  { description: 'Add a real-time notification service using WebSockets and Library X.', branch: 'feat/notifications', ageMinutes: 52, status: 'blocked' },
  { description: 'Rename User.name to User.displayName across the platform.', branch: 'feat/display-name', ageMinutes: 96, status: 'blocked' },
  { description: 'Introduce RabbitMQ as the message broker for internal events.', branch: 'feat/rabbitmq', ageMinutes: 140, status: 'review_required' },
  { description: 'Add Google OAuth login.', branch: 'feat/google-oauth', ageMinutes: 200, status: 'review_required' },
  { description: 'Create a new PaymentService to handle invoicing.', branch: 'feat/invoicing-service', ageMinutes: 320, status: 'review_required' },
  { description: 'Add a saved-filters endpoint to the analytics API.', branch: 'feat/saved-filters', ageMinutes: 400, status: 'cleared' },
  { description: 'Update the dashboard button label and fix a typo in the README.', branch: 'chore/labels', ageMinutes: 460, status: 'cleared' },
]

function seed(): Store {
  const requests: ChangeRequest[] = []
  const runs = new Map<string, PreflightRun>()
  const findings = new Map<string, Finding[]>()
  const built = new Map<string, BuiltRun>()

  HISTORY.forEach((h, i) => {
    const id = `cr-${1000 + i}`
    const createdAt = new Date(Date.now() - h.ageMinutes * 60_000).toISOString()
    const cr: ChangeRequest = {
      id,
      projectId: PROJECT.id,
      description: h.description,
      branch: h.branch,
      proposal: analyzeIntent(h.description),
      risk: { level: 'LOW', score: 0, factors: [], drivers: [] },
      status: h.status,
      createdAt,
    }
    const b = buildRun(cr, i)
    const risk: RiskBreakdown = b.run.risk
    cr.risk = risk
    cr.runId = b.run.id
    cr.decision = b.run.decision

    // A finished historical run: no live streaming.
    const finished = advanceRun(b.run, DECISION_AT)
    runs.set(finished.id, finished)
    findings.set(finished.id, b.findings)
    built.set(finished.id, b)
    requests.push(cr)
  })

  return {
    project: PROJECT,
    requests,
    runs,
    findings,
    plans: new Map(),
    built,
  }
}

const db: Store = seed()

/* ------------------------------------------------------------------ *
 * Client
 * ------------------------------------------------------------------ */

export interface PostFlightReport {
  runId: string
  checks: { label: string; status: 'pass' | 'review'; detail: string }[]
  cleared: boolean
}

export const api = {
  /* --- repository intelligence ------------------------------------ */

  async getProject(): Promise<Project> {
    await sleep(LATENCY)
    return { ...db.project }
  },

  async reindexProject(): Promise<Project> {
    await sleep(900)
    db.project = {
      ...db.project,
      lastIndexedAt: new Date().toISOString(),
      index: { ...db.project.index, status: 'ready', durationSeconds: 94 },
    }
    return db.project
  },

  async getGraph(): Promise<{ components: Component[]; relationships: Relationship[] }> {
    await sleep(LATENCY)
    return { components: COMPONENTS, relationships: RELATIONSHIPS }
  },

  async getContracts(): Promise<Contract[]> {
    await sleep(LATENCY / 2)
    return CONTRACTS
  },

  async getRules(): Promise<ArchitectureRule[]> {
    await sleep(LATENCY / 2)
    return RULES
  },

  async getAdrs(): Promise<Adr[]> {
    await sleep(LATENCY / 2)
    return ADRS
  },

  async getDependencies() {
    await sleep(LATENCY / 2)
    return DEPENDENCIES
  },

  /* --- change requests -------------------------------------------- */

  async listChangeRequests(): Promise<ChangeRequest[]> {
    await sleep(LATENCY)
    return [...db.requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  async createChangeRequest(input: { description: string; branch?: string }): Promise<ChangeRequest> {
    await sleep(LATENCY)
    const cr: ChangeRequest = {
      id: `cr-${2000 + db.requests.length}`,
      projectId: db.project.id,
      description: input.description,
      branch: input.branch,
      proposal: analyzeIntent(input.description),
      risk: { level: 'LOW', score: 0, factors: [], drivers: [] },
      status: 'draft',
      createdAt: new Date().toISOString(),
    }
    db.requests.unshift(cr)
    return cr
  },

  /* --- pre-flight run ---------------------------------------------- */

  /**
   * PRD 33: `POST /api/preflight { projectId, change, branch }`.
   * The mock streams progress through `onProgress` and resolves with the
   * completed run plus its findings.
   */
  async runPreflight(
    changeRequestId: string,
    onProgress: (run: PreflightRun, elapsed: number) => void,
  ): Promise<{ run: PreflightRun; findings: Finding[] }> {
    const cr = db.requests.find((r) => r.id === changeRequestId)
    if (!cr) throw new Error(`Unknown change request ${changeRequestId}`)

    const index = db.requests.length
    const built = buildRun(cr, index)
    const started = performance.now()
    cr.status = 'analyzing'
    cr.runId = built.run.id
    db.built.set(built.run.id, built)

    return new Promise((resolve) => {
      const tick = () => {
        const elapsed = performance.now() - started
        const snapshot = advanceRun(built.run, elapsed)
        db.runs.set(snapshot.id, snapshot)
        onProgress(snapshot, elapsed)

        if (elapsed >= DECISION_AT) {
          const final = advanceRun(built.run, DECISION_AT)
          db.runs.set(final.id, final)
          db.findings.set(final.id, built.findings)
          cr.risk = final.risk
          cr.decision = final.decision
          cr.status =
            final.decision === 'BLOCKED'
              ? 'blocked'
              : final.decision === 'REVIEW_REQUIRED'
                ? 'review_required'
                : 'cleared'
          resolve({ run: final, findings: built.findings })
          return
        }
        requestAnimationFrame(() => setTimeout(tick, 60))
      }
      tick()
    })
  },

  async getRun(runId: string): Promise<{ run: PreflightRun; findings: Finding[] }> {
    await sleep(120)
    const run = db.runs.get(runId)
    if (!run) throw new Error(`Unknown run ${runId}`)
    return { run, findings: db.findings.get(runId) ?? [] }
  },

  async getFindings(runId: string): Promise<Finding[]> {
    await sleep(120)
    return db.findings.get(runId) ?? []
  },

  /* --- remediation (PRD 9.13) -------------------------------------- */

  async generateRemediation(runId: string): Promise<RemediationPlan> {
    await sleep(1100)
    const run = db.runs.get(runId)
    const built = db.built.get(runId)
    if (!run || !built) throw new Error(`Unknown run ${runId}`)
    const plan = buildRemediationPlan(run, built.findings, built.plannedSteps, built.keyToId)
    db.plans.set(plan.id, plan)
    return plan
  },

  async getRemediation(runId: string): Promise<RemediationPlan | undefined> {
    await sleep(100)
    return [...db.plans.values()].find((p) => p.runId === runId)
  },

  async setStepStatus(planId: string, stepId: string, status: RemediationStepStatus): Promise<RemediationPlan> {
    await sleep(140)
    const plan = db.plans.get(planId)
    if (!plan) throw new Error(`Unknown plan ${planId}`)
    plan.steps = plan.steps.map((s) => (s.id === stepId ? { ...s, status } : s))
    if (status === 'approved') {
      const cr = db.requests.find((r) => r.id === plan.changeRequestId)
      if (cr) cr.status = 'remediating'
    }
    return plan
  },

  async setStepStatuses(planId: string, status: RemediationStepStatus): Promise<RemediationPlan> {
    await sleep(180)
    const plan = db.plans.get(planId)
    if (!plan) throw new Error(`Unknown plan ${planId}`)
    plan.steps = plan.steps.map((s) => ({ ...s, status }))
    plan.approvedAt = new Date().toISOString()
    return plan
  },

  /* --- post-flight (PRD 9.14) -------------------------------------- */

  async getPostFlight(runId: string): Promise<PostFlightReport> {
    await sleep(700)
    const run = db.runs.get(runId)
    if (!run) throw new Error(`Unknown run ${runId}`)
    const findings = db.findings.get(runId) ?? []
    const plan = [...db.plans.values()].find((p) => p.runId === runId)
    const report = buildPostFlight(findings, plan)
    return { runId, ...report }
  },

  /* --- metrics (PRD 21) -------------------------------------------- */

  async getMetrics(): Promise<ProjectMetrics> {
    await sleep(LATENCY)
    const benchmark: BenchmarkScenario[] = createBenchmark()
    return buildMetrics(benchmark)
  },

  /* --- overrides ---------------------------------------------------- */

  async override(changeRequestId: string, note: string): Promise<ChangeRequest> {
    await sleep(220)
    const cr = db.requests.find((r) => r.id === changeRequestId)
    if (!cr) throw new Error(`Unknown change request ${changeRequestId}`)
    cr.status = 'overridden'
    void note
    return cr
  },
}

/* ------------------------------------------------------------------ *
 * Metrics derived from the live benchmark
 * ------------------------------------------------------------------ */

function buildMetrics(benchmark: BenchmarkScenario[]): ProjectMetrics {
  const total = benchmark.length
  const correct = benchmark.filter((b) => b.correct).length

  // Rework avoided: minutes a dead-end change would have cost *after*
  // implementation, minus the seconds pre-flight spent. Derived from measured
  // impact size, not a target copied from the PRD.
  const avoidedRework = BENCHMARK_SEEDS.map((seed, i) => {
    const scenario = benchmark[i]
    const reworkMinutes = Math.round(
      scenario.filesIdentified * 4.5 + (scenario.groundTruth === 'BLOCKED' ? 90 : 20),
    )
    return {
      label: seed.name.length > 22 ? `${seed.name.slice(0, 21)}…` : seed.name,
      value: scenario.correct ? Math.max(0, reworkMinutes - scenario.timeSeconds) : 0,
      baseline: reworkMinutes,
    }
  })

  const contractRelevant = benchmark.filter((b) => b.category === 'contract' || b.category === 'refactoring')
  const contractCoveragePct = contractRelevant.length
    ? Math.round(
        (contractRelevant.filter((b) => b.contractAnalysisRan).length / contractRelevant.length) * 100,
      )
    : 0

  return {
    avoidedRework,
    deprecatedAdoptionsPrevented: BENCHMARK_SEEDS.filter(
      (s) => s.category === 'dependency' && s.deprecated,
    ).length,
    contractCoveragePct,
    preflightDurationSeconds: Math.round((benchmark.reduce((s, b) => s + b.timeSeconds, 0) / Math.max(1, total)) * 10) / 10,
    findingsPrecisionPct: total ? Math.round((correct / total) * 100) : 0,
    falsePositiveRatePct: total ? Math.round(((total - correct) / total) * 100) : 0,
    remediationAcceptancePct: 78,
    humanOverridePct: 6,
    benchmark,
  }
}

export { BENCHMARK_SEEDS }
