import type { ChangeProposal, RiskLevel } from '@/types'

/**
 * 9.2 Change Intent Analyzer.
 *
 * The bridge between human intent and deterministic validation: turns a
 * sentence into a structured change proposal the specialist agents can check.
 * Replaced by `POST /api/preflight/intent` once the FastAPI service exists.
 */

interface Signal {
  patterns: RegExp[]
  domains: string[]
  operations: string[]
  risk: RiskLevel
  riskNote: string
}

/**
 * Ordered by specificity. Each signal contributes domains/operations and a
 * floor on expected risk, which the aggregator combines into one proposal.
 */
const SIGNALS: Signal[] = [
  {
    patterns: [/postgres|postgresql|database|\bsql\b|db\b|mongo|dynamo/i],
    domains: ['data', 'persistence', 'configuration'],
    operations: ['add_dependency', 'open_database_connection', 'bypass_service_layer'],
    risk: 'HIGH',
    riskNote: 'Direct data-layer access is treated as a high-risk change.',
  },
  {
    patterns: [/\boauth\b|google sign|sso|login|authenticat|authorization|\bauth\b|session token|jwt|mfa|password/i],
    domains: ['authentication', 'users', 'configuration'],
    operations: ['modify_auth_service', 'modify_user_model', 'add_api_endpoint', 'modify_login_ui'],
    risk: 'HIGH',
    riskNote: 'Auth boundary changes are always high risk.',
  },
  {
    patterns: [/\bwebsocket|\bws\b|socket|real-?time|push channel|long.?poll/i],
    domains: ['platform', 'realtime', 'frontend'],
    operations: ['add_service', 'add_dependency', 'modify_transport', 'add_event_consumer'],
    risk: 'HIGH',
    riskNote: 'New transport or channel introduces a concurrency and auth surface.',
  },
  {
    patterns: [/\bevent\b|publish|subscribe|topic|queue|stream|webhook|avsc|asyncapi/i],
    domains: ['events', 'platform'],
    operations: ['modify_event_contract', 'add_event_consumer', 'add_broker'],
    risk: 'HIGH',
    riskNote: 'Event schema or broker changes ripple to every subscriber.',
  },
  {
    patterns: [/migration|alter table|add column|drop column|schema change|index on|backfill/i],
    domains: ['data', 'persistence'],
    operations: ['create_migration', 'modify_database_contract', 'backfill_data'],
    risk: 'HIGH',
    riskNote: 'Database migrations can be destructive and are hard to reverse.',
  },
  {
    patterns: [/rename|remove field|drop field|deprecat|change the type|change type|replacen?ing|make required|optional/i],
    domains: ['api', 'types', 'consumers'],
    operations: ['rename_symbol', 'modify_contract', 'migrate_consumers'],
    risk: 'HIGH',
    riskNote: 'Renames and removals are breaking for every existing consumer.',
  },
  {
    patterns: [/new service|create .*service|add .*service|separate service|microservice/i],
    domains: ['services', 'api'],
    operations: ['add_service', 'add_api_endpoint', 'add_repository', 'add_deployment'],
    risk: 'MEDIUM',
    riskNote: 'New services carry deployment and ownership cost.',
  },
  {
    patterns: [/library x|\blibrary\b|npm |pypi|package|install |add .*dependency|use .*\.js|third.?party/i],
    domains: ['dependencies', 'build'],
    operations: ['add_dependency', 'update_lockfile', 'review_license'],
    risk: 'MEDIUM',
    riskNote: 'New third-party dependencies need policy and license review.',
  },
  {
    patterns: [/rabbitmq|kafka|nats|\bamqp\b|message.?broker/i],
    domains: ['events', 'infrastructure'],
    operations: ['add_broker', 'replace_event_transport'],
    risk: 'CRITICAL',
    riskNote: 'Introducing a new broker contradicts an accepted ADR.',
  },
  {
    patterns: [/endpoint|\bapi\b|rest|openapi|graphql|route/i],
    domains: ['api', 'clients'],
    operations: ['add_api_endpoint', 'modify_api_contract'],
    risk: 'MEDIUM',
    riskNote: 'API surface changes require consumer review.',
  },
  {
    patterns: [/dashboard|frontend|react|component|ui\b|page|screen/i],
    domains: ['frontend', 'web'],
    operations: ['modify_login_ui', 'add_component', 'update_client'],
    risk: 'LOW',
    riskNote: 'UI-only changes are usually contained.',
  },
  {
    patterns: [/test|coverage|lint|format|typo|label|text|copy|comment|readme|docs/i],
    domains: ['quality'],
    operations: ['update_tests', 'update_documentation'],
    risk: 'LOW',
    riskNote: 'Local, reversible edits.',
  },
]

const HIGH_RISK_OPS = new Set([
  'open_database_connection',
  'bypass_service_layer',
  'modify_auth_service',
  'replace_event_transport',
  'add_broker',
  'create_migration',
  'drop_field',
])

export function analyzeIntent(description: string): ChangeProposal {
  const text = description.trim()
  const domains = new Set<string>()
  const operations = new Set<string>()
  const assumptions: string[] = []
  const clarifications: string[] = []
  const riskScores: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 }
  let floor: RiskLevel = 'LOW'
  const notes: string[] = []

  for (const signal of SIGNALS) {
    if (!signal.patterns.some((p) => p.test(text))) continue
    signal.domains.forEach((d) => domains.add(d))
    signal.operations.forEach((o) => operations.add(o))
    if (riskScores[signal.risk] > riskScores[floor]) floor = signal.risk
    notes.push(signal.riskNote)
  }

  // Operations that are breaking regardless of which signal matched.
  for (const op of operations) {
    if (HIGH_RISK_OPS.has(op)) {
      if (riskScores[op === 'replace_event_transport' || op === 'add_broker' ? 'CRITICAL' : 'HIGH'] > riskScores[floor]) {
        floor = op === 'replace_event_transport' || op === 'add_broker' ? 'CRITICAL' : 'HIGH'
      }
    }
  }

  if (domains.size === 0) {
    assumptions.push('No domain matched explicit keywords; analysed against the whole repository graph.')
    assumptions.push('Assumed the change targets code in this repository rather than documentation only.')
  } else {
    assumptions.push(`Mapped ${domains.size} domain${domains.size === 1 ? '' : 's'} from the change text.`)
  }

  if (!/\btest|\bci\b|pipeline/i.test(text)) {
    clarifications.push('No test strategy mentioned - which suites must pass before this merges?')
  }
  if (!/\bconsumer|migration|backward|compat/i.test(text) && (domains.has('api') || domains.has('types') || domains.has('consumers'))) {
    clarifications.push('Is backward compatibility required, or is a coordinated consumer migration acceptable?')
  }
  if (operations.has('add_dependency')) {
    clarifications.push('Which package exactly, and at which version range?')
  }
  if (floor === 'LOW' && domains.size <= 1) {
    clarifications.push('Is this confined to a single module, or does it touch shared code?')
  }

  return {
    intent: text || 'Unspecified change',
    affectedDomains: [...domains],
    likelyOperations: [...operations],
    expectedRisk: floor,
    assumptions,
    clarifications,
  }
}
