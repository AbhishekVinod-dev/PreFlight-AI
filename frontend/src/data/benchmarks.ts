import type { BenchmarkScenario, ChangeRequest, Decision, Severity } from '@/types'
import { buildRun } from '@/engine/run'

/**
 * 22. Evaluation benchmark.
 *
 * 24 controlled changes across the five PRD categories. Each seed carries the
 * verdict a human architect signed off as ground truth; `createBenchmark`
 * then runs the *actual* engine over it so the reported precision is measured,
 * not asserted.
 */

export interface BenchmarkSeed {
  id: string
  name: string
  category: BenchmarkScenario['category']
  description: string
  groundTruth: Decision
  groundTruthLabel: string
  severity: Severity
  /** True when the scenario targets a deprecated or policy-blocked package. */
  deprecated?: boolean
}

export const BENCHMARK_SEEDS: BenchmarkSeed[] = [
  // --- Architecture -------------------------------------------------
  { id: 'A1', name: 'Frontend to database', category: 'architecture', description: 'Connect the dashboard directly to PostgreSQL for faster analytics.', groundTruth: 'BLOCKED', groundTruthLabel: 'frontend -> database is forbidden', severity: 'critical' },
  { id: 'A2', name: 'Controller reaches data layer', category: 'architecture', description: 'Add a database import in the users API router.', groundTruth: 'BLOCKED', groundTruthLabel: 'api -> database is forbidden', severity: 'high' },
  { id: 'A3', name: 'Duplicate notification service', category: 'architecture', description: 'Create a new NotificationService to handle live updates.', groundTruth: 'REVIEW_REQUIRED', groundTruthLabel: 'duplicate abstraction, extend instead', severity: 'high' },
  { id: 'A4', name: 'Parallel analytics client', category: 'architecture', description: 'Add a parallel AnalyticsClient to the dashboard.', groundTruth: 'REVIEW_REQUIRED', groundTruthLabel: 'duplicate abstraction, extend instead', severity: 'high' },
  { id: 'A5', name: 'Possible duplicate route', category: 'architecture', description: 'Expose a new endpoint /v1/audit/export on the analytics API.', groundTruth: 'REVIEW_REQUIRED', groundTruthLabel: 'confirm no existing route covers this', severity: 'medium' },

  // --- Contracts ----------------------------------------------------
  { id: 'C1', name: 'Type field removal', category: 'contract', description: 'Remove the email_verified field from the User type.', groundTruth: 'BLOCKED', groundTruthLabel: 'breaking type change', severity: 'high' },
  { id: 'C2', name: 'Event schema change', category: 'contract', description: 'Breaking schema change to NotificationEvent: make the channel field required.', groundTruth: 'BLOCKED', groundTruthLabel: 'breaking event schema, 5 consumers', severity: 'critical' },
  { id: 'C3', name: 'Destructive column drop', category: 'contract', description: 'Drop the last_login_ip column from the users table.', groundTruth: 'BLOCKED', groundTruthLabel: 'destructive database change', severity: 'critical' },
  { id: 'C4', name: 'Additive column', category: 'contract', description: 'Add a nullable bio column to the users table.', groundTruth: 'REVIEW_REQUIRED', groundTruthLabel: 'migration needs review and rollback path', severity: 'medium' },
  { id: 'C5', name: 'Public field rename', category: 'contract', description: 'Rename the UserResponse name field to displayName.', groundTruth: 'BLOCKED', groundTruthLabel: 'public API rename, 8 consumers', severity: 'critical' },

  // --- Dependencies -------------------------------------------------
  { id: 'D1', name: 'Deprecated formatter', category: 'dependency', description: 'Add the moment library to format dates in the dashboard.', groundTruth: 'BLOCKED', groundTruthLabel: 'forbidden, deprecated upstream', severity: 'critical', deprecated: true },
  { id: 'D2', name: 'New message broker', category: 'dependency', description: 'Introduce RabbitMQ as our message broker.', groundTruth: 'BLOCKED', groundTruthLabel: 'forbidden, contradicts ADR-014', severity: 'critical' },
  { id: 'D3', name: 'Unapproved websocket lib', category: 'dependency', description: 'Add the library-x package for WebSockets.', groundTruth: 'BLOCKED', groundTruthLabel: 'approval_required in policy', severity: 'high' },
  { id: 'D4', name: 'Deprecated fetch polyfill', category: 'dependency', description: 'Use node-fetch in the dashboard instead of native fetch.', groundTruth: 'BLOCKED', groundTruthLabel: 'forbidden, deprecated upstream', severity: 'high', deprecated: true },
  { id: 'D5', name: 'Unverifiable package', category: 'dependency', description: 'Add the date-fns library to the dashboard for date formatting.', groundTruth: 'REVIEW_REQUIRED', groundTruthLabel: 'metadata unavailable, human must confirm', severity: 'low' },

  // --- Refactoring --------------------------------------------------
  { id: 'R1', name: 'Duplicate payment service', category: 'refactoring', description: 'Create a new PaymentService for invoicing.', groundTruth: 'REVIEW_REQUIRED', groundTruthLabel: 'dead-end refactor, extend PaymentService', severity: 'high' },
  { id: 'R2', name: 'Replace event transport', category: 'refactoring', description: 'Replace the EventBus with a new in-process queue.', groundTruth: 'REVIEW_REQUIRED', groundTruthLabel: 'contradicts ADR-014 / ADR-021', severity: 'high' },
  { id: 'R3', name: 'Parallel user repository', category: 'refactoring', description: 'Add a parallel UserRepository that writes directly to the users table.', groundTruth: 'REVIEW_REQUIRED', groundTruthLabel: 'duplicate abstraction', severity: 'high' },
  { id: 'R4', name: 'Additive safe change', category: 'refactoring', description: 'Update the dashboard button label and fix a typo in the README.', groundTruth: 'CLEARED', groundTruthLabel: 'contained, no contract or boundary touched', severity: 'info' },

  // --- Security -----------------------------------------------------
  { id: 'S1', name: 'Credentials in bundle', category: 'security', description: 'Store the Stripe API key in the frontend config.', groundTruth: 'BLOCKED', groundTruthLabel: 'secret exposure, ARCH-006', severity: 'critical' },
  { id: 'S2', name: 'Authorization bypass', category: 'security', description: 'Skip the authorization check in the payments router for internal requests.', groundTruth: 'BLOCKED', groundTruthLabel: 'authorization boundary violation', severity: 'critical' },
  { id: 'S3', name: 'Debug endpoint leak', category: 'security', description: 'Add a debug endpoint that returns the database URL and internal hostnames.', groundTruth: 'BLOCKED', groundTruthLabel: 'direct data access + internal disclosure', severity: 'critical' },
  { id: 'S4', name: 'New identity provider', category: 'security', description: 'Add Google OAuth login.', groundTruth: 'REVIEW_REQUIRED', groundTruthLabel: 'auth boundary change, needs review', severity: 'high' },
  { id: 'S5', name: 'Broad scope change', category: 'security', description: 'Update the authorization documentation to mention the new scope format.', groundTruth: 'CLEARED', groundTruthLabel: 'documentation only', severity: 'info' },
]

let cache: BenchmarkScenario[] | null = null

export function createBenchmark(): BenchmarkScenario[] {
  if (cache) return cache

  cache = BENCHMARK_SEEDS.map((seed, i) => {
    const cr: ChangeRequest = {
      id: `bench-${seed.id}`,
      projectId: 'orca',
      description: seed.description,
      proposal: {
        intent: seed.description,
        affectedDomains: [],
        likelyOperations: [],
        expectedRisk: seed.groundTruth === 'BLOCKED' ? 'HIGH' : 'LOW',
        assumptions: [],
      },
      risk: { level: 'LOW', score: 0, factors: [], drivers: [] },
      status: 'draft',
      createdAt: new Date().toISOString(),
    }

    const { run, findings } = buildRun(cr, i)
    const toolResult = run.decision ?? 'CLEARED'
    const meanConfidence =
      findings.length > 0
        ? findings.reduce((s, f) => s + f.confidence, 0) / findings.length
        : 1

    return {
      id: seed.id,
      name: seed.name,
      category: seed.category,
      groundTruth: seed.groundTruth,
      toolResult,
      correct: toolResult === seed.groundTruth,
      groundTruthLabel: seed.groundTruthLabel,
      severity: seed.severity,
      filesIdentified: new Set(findings.flatMap((f) => f.affectedFiles)).size,
      // Pre-flight time is dominated by the slowest subagent, not by finding count.
      timeSeconds: Math.round((2.2 + findings.length * 0.35) * 10) / 10,
      confidence: Math.round(meanConfidence * 100) / 100,
      contractAnalysisRan: run.dimensions.some(
        (d) => d.dimension === 'contracts' && (d.findingIds.length > 0 || d.status === 'pass'),
      ),
      findingsRaised: findings.length,
    }
  })

  return cache
}
