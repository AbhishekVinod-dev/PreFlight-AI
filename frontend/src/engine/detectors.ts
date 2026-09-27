import type {
  AnalysisDimension,
  Contract,
  EvidenceRef,
  Finding,
  RemediationStep,
  Severity,
  TrustBasis,
} from '@/types'
import { ADRS, CONTRACTS, DEPENDENCIES, ownerOf } from '@/data/repository'

/**
 * Detector registry.
 *
 * Each detector stands in for one of the five specialist subagents described in
 * PRD 10 (Architecture / Contract / Dependency / Impact / Security Explorer).
 * A detector inspects the change text plus the indexed graph and emits
 * findings and the remediation steps that would clear them.
 *
 * Contract: a Finding is only ever emitted with evidence, a confidence value,
 * a trust basis and an explicit blocking flag (PRD 28).
 */

export type FindingDraft = Omit<Finding, 'id' | 'changeRequestId' | 'runId' | 'detectedAt'> & {
  /** Stable detector-local id, used by remediation steps to resolve findings. */
  key: string
}

export interface PlannedStep {
  title: string
  detail: string
  resolvesFindingIds: string[]
  layer: RemediationStep['layer']
  files: string[]
  owner?: string
  estimate?: string
}

export interface DetectorOutput {
  findings: FindingDraft[]
  steps: PlannedStep[]
  /** Dimension summaries the detector can assert even without findings. */
  dimensionNotes: Partial<Record<AnalysisDimension, string>>
  inspected: Partial<Record<AnalysisDimension, number>>
}

type Detector = {
  key: string
  /** Human label shown in the subagent list. */
  label: string
  test: (t: string) => boolean
  run: (t: string) => DetectorOutput
}

const empty = (): DetectorOutput => ({ findings: [], steps: [], dimensionNotes: {}, inspected: {} })

/* ================================================================== *
 * 1. Layer boundaries - frontend/api reaching the database
 * ================================================================== */

const layerViolation: Detector = {
  key: 'layer-boundary',
  label: 'Layer boundary violation',
  test: (t) => /postgres|postgresql|\bdatabase\b|\bsql\b|\bdb\b|mongo|dynamo|connect .{0,24}(direct|directly)/i.test(t),
  run: (t): DetectorOutput => {
    const fromFrontend = /dashboard|frontend|react|ui\b|browser|client|web\b|component/i.test(t)
    const ruleId = fromFrontend ? 'ARCH-001' : 'ARCH-002'
    const layer = fromFrontend ? 'frontend' : 'api'
    const target = t.match(/postgres|postgresql|mongo|dynamo|\bsql\b/i)?.[0] ?? 'the database'
    const rawTarget = /mongo|dynamo/i.test(t) ? /mongo/i.test(t) ? 'MongoDB' : 'DynamoDB' : 'PostgreSQL'

    const findings: FindingDraft[] = [
      {
        category: 'architecture',
        severity: 'critical',
        confidence: 0.98,
        title: `${layer} layer may not reach the database directly`,
        key: 'arch-layer',
        headline: 'ARCHITECTURAL RULE VIOLATION',
        explanation: `The change opens a data connection from the ${layer} layer to ${rawTarget}. Rule ${ruleId} forbids this direction: repositories are reachable only from services. Detected ${fromFrontend ? 'a client-side driver import' : 'a repository import inside a router'}.`,
        evidence: [
          { path: `apps/${fromFrontend ? 'web/src/dashboard' : 'api/routers'}/db-client.ts`, line: fromFrontend ? 12 : 9, symbol: 'createClient' },
          { path: 'apps/api/repositories/analytics.py', line: 30, symbol: 'AnalyticsRepository.query' },
        ],
        affectedFiles: [
          `apps/${fromFrontend ? 'web/src/dashboard' : 'api/routers'}/db-client.ts`,
          'apps/web/package.json',
          'apps/api/routers/analytics.py',
        ],
        affectedComponents: [fromFrontend ? 'dashboard' : 'analytics-api', 'postgres'],
        symbols: ['createClient', 'db:query'],
        consumers: ['dashboard', 'report-svc'],
        ruleId,
        basis: 'deterministic',
        blocking: true,
        remediation: `Route the read through ${fromFrontend ? 'AnalyticsAPI' : 'AnalyticsService'} instead. The repository already exposes the required query.`,
      },
      {
        category: 'security',
        severity: 'critical',
        confidence: 0.95,
        title: 'Database credentials would be shipped to the client bundle',
        key: 'sec-creds',
        explanation: `A ${rawTarget} connection from ${layer} requires a connection string, which lands in the ${fromFrontend ? 'browser bundle' : 'API process environment'} and is readable by anyone who can view the app. Rule ARCH-006 forbids credential exposure.`,
        evidence: [
          { path: `apps/${fromFrontend ? 'web' : 'api'}/.env.production`, line: 4, symbol: 'DATABASE_URL' },
        ],
        affectedFiles: [`apps/${fromFrontend ? 'web' : 'api'}/.env.production`, 'apps/web/dist/bundle.js'],
        affectedComponents: [fromFrontend ? 'dashboard' : 'analytics-api', 'postgres'],
        symbols: ['DATABASE_URL'],
        consumers: [],
        ruleId: 'ARCH-006',
        basis: 'deterministic',
        blocking: true,
        remediation: 'Remove the client-side connection string. Use the existing server-side repository and return data over HTTP.',
      },
      {
        category: 'dead-end',
        severity: 'high',
        confidence: 0.93,
        title: 'The requested capability already exists one layer up',
        key: 'dead-end',
        headline: 'EXISTING CAPABILITY',
        explanation: `AnalyticsQuery (v2) already exposes the required data through AnalyticsAPI. Adding a second, direct path duplicates the query surface and creates two sources of truth for the same metric.`,
        evidence: [
          { path: 'contracts/openapi/analytics.yaml', line: 22, symbol: 'AnalyticsQuery' },
          { path: 'apps/api/routers/analytics.py', line: 44, symbol: 'get_analytics' },
        ],
        affectedFiles: ['contracts/openapi/analytics.yaml', 'apps/api/routers/analytics.py'],
        affectedComponents: ['analytics-api', 'analytics-service'],
        symbols: ['AnalyticsQuery', 'get_analytics'],
        consumers: ['dashboard', 'report-svc'],
        contractId: 'c-api-analytics',
        basis: 'deterministic',
        blocking: false,
        remediation: 'Consume AnalyticsQuery rather than re-implementing the query behind a new transport.',
      },
      {
        category: 'impact',
        severity: 'medium',
        confidence: 0.88,
        title: 'Bypasses the service boundary and adds an unowned path',
        key: 'impact-bypass',
        explanation: 'The new path sits outside AnalyticsService, so transaction boundaries, auditing and query tuning applied there no longer cover this read.',
        evidence: [{ path: 'apps/api/repositories/analytics.py', line: 30, symbol: 'AnalyticsRepository.query' }],
        affectedFiles: ['apps/api/repositories/analytics.py', 'apps/api/services/analytics.py'],
        affectedComponents: ['analytics-service', 'analytics-repo'],
        symbols: ['AnalyticsService', 'AnalyticsRepository'],
        consumers: ['report-svc'],
        basis: 'inference',
        blocking: false,
        remediation: 'Extend AnalyticsService so the new read inherits caching and auditing.',
      },
    ]

    return {
      findings,
      steps: [
        {
          title: 'Extend AnalyticsService with the new read',
          detail: `Add the required aggregation to AnalyticsService so it reuses the existing AnalyticsRepository and the ${target} connection pool.`,
          resolvesFindingIds: ['arch-layer', 'sec-creds'],
          layer: 'service',
          files: ['apps/api/services/analytics.py'],
          owner: ownerOf('analytics-service'),
          estimate: '~45m',
        },
        {
          title: 'Expose the read through AnalyticsAPI',
          detail: 'Add the endpoint to apps/api/routers/analytics.py rather than creating a parallel route.',
          resolvesFindingIds: ['arch-layer'],
          layer: 'api',
          files: ['apps/api/routers/analytics.py'],
          owner: ownerOf('analytics-api'),
          estimate: '~20m',
        },
        {
          title: 'Point the frontend client at the API',
          detail: 'Replace the direct driver usage in the dashboard with a call to the existing analytics client.',
          resolvesFindingIds: ['arch-layer', 'sec-creds'],
          layer: 'frontend',
          files: ['apps/web/src/dashboard/api.ts'],
          owner: ownerOf('dashboard'),
          estimate: '~20m',
        },
        {
          title: 'Add a contract test for the new endpoint',
          detail: 'Pin the response shape against contracts/openapi/analytics.yaml so future drift fails CI.',
          resolvesFindingIds: ['dead-end'],
          layer: 'test',
          files: ['tests/contract/test_analytics_contract.py'],
          owner: ownerOf('analytics-api'),
          estimate: '~30m',
        },
        {
          title: 'Update the OpenAPI schema',
          detail: 'Add the response to contracts/openapi/analytics.yaml and bump the contract version.',
          resolvesFindingIds: ['dead-end'],
          layer: 'config',
          files: ['contracts/openapi/analytics.yaml'],
          owner: ownerOf('analytics-api'),
          estimate: '~10m',
        },
        {
          title: 'Run the affected test suites',
          detail: 'Run analytics service, repository and dashboard suites, plus the contract test added above.',
          resolvesFindingIds: [],
          layer: 'test',
          files: ['tests/'],
          estimate: '~10m',
        },
      ],
      dimensionNotes: { architecture: 'Layer boundary checked against ARCH-001/002/006.' },
      inspected: { architecture: 412, security: 96 },
    }
  },
}

/* ================================================================== *
 * 2. Duplicate / dead-end abstraction
 * ================================================================== */

const EXISTING_ABSTRACTIONS = [
  { name: 'NotificationService', id: 'notification-service', kind: 'service' },
  { name: 'PaymentService', id: 'payment-service', kind: 'service' },
  { name: 'AnalyticsService', id: 'analytics-service', kind: 'service' },
  { name: 'UserService', id: 'user-service', kind: 'service' },
  { name: 'WebSocketGateway', id: 'ws-gateway', kind: 'gateway' },
  { name: 'EventBus', id: 'event-bus', kind: 'bus' },
  { name: 'DesignSystem', id: 'design-system', kind: 'library' },
] as const

/** Suffixes that mark a type as an abstraction we can match on. */
const ABSTRACTION_SUFFIX = /(service|client|manager|gateway|adapter|handler|worker|repository|module|bus|queue|system)$/i

const baseName = (name: string) => name.replace(ABSTRACTION_SUFFIX, '').toLowerCase()

/** A creation cue near the candidate is what separates "add a parallel X" from "extend X". */
const CREATION_CUE =
  /\b(new|create|creating|add|adding|introduce|introducing|build|building|make|making|another|separate|parallel|second|additional|replace|replacing|swap)\b/i

interface AbstractionCandidate {
  name: string
  index: number
}

function abstractionCandidates(text: string): AbstractionCandidate[] {
  const suffix = '(?:Service|Client|Manager|Gateway|Adapter|Handler|Worker|Repository|Module|Bus|Queue|System)'
  const out: AbstractionCandidate[] = []
  // PascalCase: NotificationService
  for (const m of text.matchAll(new RegExp(`\\b([A-Za-z][A-Za-z0-9]*${suffix})\\b`, 'g'))) {
    out.push({ name: m[1], index: m.index ?? 0 })
  }
  // spaced: "notification service"
  for (const m of text.matchAll(
    new RegExp(`\\b([a-z][a-z0-9-]*)\\s+(${suffix.slice(3, -1)})\\b`, 'gi'),
  )) {
    out.push({ name: m[1] + m[2], index: m.index ?? 0 })
  }
  return out
}

const duplicateAbstraction: Detector = {
  key: 'duplicate-abstraction',
  label: 'Duplicate / dead-end abstraction',
  test: (t) => CREATION_CUE.test(t) && abstractionCandidates(t).length > 0,
  run: (t): DetectorOutput => {
    // Only candidates introduced by a creation cue count: "extend AnalyticsService"
    // is the fix, "add a parallel AnalyticsClient" is the dead end.
    const created = abstractionCandidates(t).filter((c) =>
      CREATION_CUE.test(t.slice(Math.max(0, c.index - 40), c.index)),
    )
    const existing = created
      .map((c) => EXISTING_ABSTRACTIONS.find((a) => baseName(a.name) === baseName(c.name)))
      .find((a): a is (typeof EXISTING_ABSTRACTIONS)[number] => Boolean(a))
    if (!existing) return empty()

    const downstream = CONTRACTS.filter((c) =>
      c.providers.includes(existing.id) || c.consumers.includes(existing.id),
    )
    const consumerCount = downstream.reduce((n, c) => n + c.consumers.length, 0)

    const requestedName = created.find((c) => baseName(c.name) === baseName(existing.name))?.name

    const findings: FindingDraft[] = [
      {
        category: 'architecture',
        severity: 'high',
        confidence: 0.86,
        title: `${existing.name} already exists and covers this responsibility`,
        key: 'arch-duplicate',
        explanation: `The repository already has ${existing.name} (${existing.kind}) with its own adapters, consumers and ownership. A parallel implementation would duplicate it rather than extend it, which rule ARCH-004 flags for review.`,
        evidence: [
          { path: 'apps/api/services/notifications.py', line: 24, symbol: 'class NotificationService' },
          { path: 'apps/api/gateway/ws.py', line: 40, symbol: 'class WebSocketGateway' },
        ],
        affectedFiles: ['apps/api/services/notifications.py', 'apps/api/gateway/ws.py'],
        affectedComponents: [existing.id],
        symbols: [existing.name],
        consumers: downstream.flatMap((c) => c.consumers).slice(0, 6),
        ruleId: 'ARCH-004',
        basis: 'inference',
        blocking: false,
        remediation: `Extend ${existing.name} rather than adding ${requestedName ?? 'a new component'}.`,
      },
      {
        category: 'dead-end',
        severity: 'high',
        confidence: 0.78,
        title: `Possible dead-end refactor: ${requestedName ?? `New${existing.name}`} duplicates ${existing.name}`,
        key: 'dead-end-dup',
        headline: 'POSSIBLE DEAD-END REFACTOR',
        explanation: `Estimated downstream impact of the parallel path is ${consumerCount} consumers across ${downstream.length} contracts. This is a recommendation signal, not a verified fact - a human should confirm the responsibilities really are equivalent.`,
        evidence: [{ path: 'apps/api/services/notifications.py', line: 24, symbol: existing.name }],
        affectedFiles: ['apps/api/services/notifications.py'],
        affectedComponents: [existing.id],
        symbols: [existing.name],
        consumers: downstream.flatMap((c) => c.consumers).slice(0, 8),
        contractId: downstream[0]?.id,
        basis: 'inference',
        blocking: false,
        remediation: `Extend ${existing.name} with the new capability and keep the existing contract versions intact.`,
      },
    ]

    return {
      findings,
      steps: [
        {
          title: `Extend ${existing.name} instead of creating a parallel component`,
          detail: `Add the new capability as a method or adapter on ${existing.name} so existing consumers keep working unchanged.`,
          resolvesFindingIds: ['arch-duplicate', 'dead-end'],
          layer: 'service',
          files: ['apps/api/services/notifications.py'],
          owner: ownerOf(existing.id),
          estimate: '~1h',
        },
        {
          title: 'Preserve the existing contract versions',
          detail: 'Keep the current event and API schemas at their published versions; add fields additively.',
          resolvesFindingIds: ['arch-duplicate'],
          layer: 'config',
          files: ['contracts/events/notification.avsc'],
          owner: ownerOf(existing.id),
          estimate: '~20m',
        },
      ],
      dimensionNotes: { architecture: 'Searched the component index for equivalent abstractions (ARCH-004).' },
      inspected: { architecture: 412 },
    }
  },
}

/* ================================================================== *
 * 3. Dependency guardian
 * ================================================================== */

const KNOWN_PACKAGES = ['library-x', 'libraryx', 'library x', 'rabbitmq', 'kafka', 'moment', 'node-fetch', 'pg', 'requests', 'redis']

const dependencyGuardian: Detector = {
  key: 'dependency',
  label: 'Dependency policy check',
  test: (t) =>
    /library|package|dependenc|npm |pypi|pip |install |add .{0,20}(librar|package|sdk|client)|third.?party|framework/i.test(t) ||
    // A named package in the text is itself a signal, even without "add a library".
    KNOWN_PACKAGES.some((p) => t.toLowerCase().includes(p)),
  run: (t): DetectorOutput => {
    const named = KNOWN_PACKAGES.find((p) => t.toLowerCase().includes(p))
    // Match on a normalised name so "Library X" resolves to the `library-x` record.
    const wanted = named?.replace(/[\s_-]/g, '')
    const record = wanted ? DEPENDENCIES.find((d) => d.name.replace(/[\s_-]/g, '') === wanted) : undefined
    if (!named && !/library|framework|sdk/i.test(t)) return empty()

    const findings: FindingDraft[] = []
    const steps: PlannedStep[] = []
    const displayName = record?.name ?? named ?? 'the proposed package'

    if (record?.policy === 'forbidden') {
      findings.push({
        category: 'dependency',
        severity: 'critical',
        confidence: 0.97,
        title: `${record.name} is forbidden by dependency policy`,
        key: 'dep-forbidden',
        headline: 'POLICY VIOLATION',
        explanation: `dependencies.yaml lists ${record.name} under "forbidden". ${record.replacedBy ? `It is deprecated upstream and superseded by ${record.replacedBy}.` : ''} Rule ARCH-008 forbids the package outright, so this is a deterministic policy hit, not a judgement call.`,
        evidence: [
          { path: 'policies/dependencies.yaml', line: 6, symbol: `forbidden: [${record.name}]` },
          { path: 'apps/web/package.json', line: 41, symbol: record.name },
        ],
        affectedFiles: ['policies/dependencies.yaml', 'apps/web/package.json', 'apps/web/package-lock.json'],
        affectedComponents: ['dashboard'],
        symbols: [record.name],
        consumers: [],
        ruleId: 'ARCH-008',
        basis: 'deterministic',
        blocking: true,
        remediation: record.internalAlternative
          ? `Use ${record.internalAlternative} instead.`
          : `Remove ${record.name} and use ${record.replacedBy ?? 'a first-party alternative'}.`,
      })
    } else if (record?.policy === 'approval-required') {
      findings.push({
        category: 'dependency',
        severity: 'high',
        confidence: 0.94,
        title: `${record.name} requires explicit approval`,
        key: 'dep-approval',
        explanation: `dependencies.yaml marks ${record.name} as approval-required. It is not deprecated, but rule ARCH-009 needs a named approver and a recorded justification before the lockfile changes.`,
        evidence: [
          { path: 'policies/dependencies.yaml', line: 11, symbol: `approval_required: [${record.name}]` },
          { path: 'apps/web/package.json', line: 38, symbol: record.name },
        ],
        affectedFiles: ['policies/dependencies.yaml', 'apps/web/package.json'],
        affectedComponents: ['dashboard'],
        symbols: [record.name],
        consumers: [],
        ruleId: 'ARCH-009',
        basis: 'deterministic',
        blocking: true,
        remediation: record.internalAlternative
          ? `Request approval, or avoid the dependency entirely by using ${record.internalAlternative}.`
          : 'Request approval from the platform team and record the justification in the PR.',
      })
    } else if (record?.deprecated) {
      findings.push({
        category: 'dependency',
        severity: 'high',
        confidence: 0.9,
        title: `${record.name} is deprecated upstream`,
        key: 'dep-deprecated',
        explanation: `Package metadata marks ${record.name} ${record.version} as deprecated${record.replacedBy ? `, recommending ${record.replacedBy}` : ''}.`,
        evidence: [{ path: 'apps/web/package.json', line: 41, symbol: record.name }],
        affectedFiles: ['apps/web/package.json'],
        affectedComponents: ['dashboard'],
        symbols: [record.name],
        consumers: [],
        basis: 'deterministic',
        blocking: false,
        remediation: `Migrate to ${record.replacedBy ?? 'a maintained alternative'} before adding new call sites.`,
      })
    }

    if (record?.internalAlternative) {
      findings.push({
        category: 'dependency',
        severity: 'medium',
        confidence: 0.88,
        title: `An internal abstraction already solves this: ${record.internalAlternative}`,
        key: 'dep-internal',
        explanation: `The repository already provides ${record.internalAlternative}. Adding a third-party package for the same job increases supply-chain surface and splits behaviour across two implementations.`,
        evidence: [{ path: 'apps/api/gateway/ws.py', line: 40, symbol: record.internalAlternative }],
        affectedFiles: ['apps/api/gateway/ws.py'],
        affectedComponents: [record.internalAlternative.split(' ')[0].toLowerCase()],
        symbols: [record.internalAlternative],
        consumers: [],
        basis: 'inference',
        blocking: false,
        remediation: `Extend ${record.internalAlternative} rather than adopting ${displayName}.`,
      })
      steps.push({
        title: `Reuse ${record.internalAlternative} instead of adding ${displayName}`,
        detail: `The existing abstraction already covers the required surface, including auth refresh and backpressure.`,
        resolvesFindingIds: ['dep-internal'],
        layer: 'service',
        files: ['apps/api/gateway/ws.py'],
        owner: 'Platform',
        estimate: '~30m',
      })
    }

    if (findings.length === 0) {
      findings.push({
        category: 'dependency',
        severity: 'info',
        confidence: 0.72,
        title: 'Dependency metadata could not be fully verified',
        key: 'dep-unverified',
        explanation: 'The proposed package was not found in the lockfile, so version, license and deprecation status could not be confirmed from repository evidence. Registry metadata was unavailable in this run.',
        evidence: [{ path: 'apps/web/package.json', line: 1, symbol: 'dependencies' }],
        affectedFiles: ['apps/web/package.json'],
        affectedComponents: [],
        symbols: [],
        consumers: [],
        basis: 'unknown',
        blocking: false,
        remediation: 'Confirm the package on the registry and re-run pre-flight once the lockfile is updated.',
      })
    }

    return {
      findings,
      steps,
      dimensionNotes: { dependencies: 'Policy, lockfile and deprecation metadata checked.' },
      inspected: { dependencies: 126 },
    }
  },
}

/* ================================================================== *
 * 4. Contract agent - breaking renames and field changes
 * ================================================================== */

const contractAgent: Detector = {
  key: 'contract',
  label: 'Contract compatibility',
  test: (t) =>
    /rename|deprecat|change the type|change type|make\s+\w+\s+required|schema change|breaking|drop\s+(the\s+)?\w+\s+field/i.test(t) ||
    /\b(remove|delete|drop|strip)\b[^.]{0,30}\b(field|column|property|param|parameter|key|member)\b/i.test(t),
  run: (t): DetectorOutput => {
    // Identify the affected contract: explicit name first, then the kind of
    // surface the change touches.
    const norm = t.toLowerCase().replace(/[^a-z0-9]/g, '')
    const mentions = (name: string) => norm.includes(name.toLowerCase().replace(/[^a-z0-9]/g, ''))
    const isDb = /column|table|migration|database|sql|schema/i.test(t)
    const isEvent = /\bevent\b|topic|message|avsc|asyncapi|publish|subscribe/i.test(t)

    const named = CONTRACTS.find((c) => mentions(c.name))
    const target: Contract =
      (isDb
        ? CONTRACTS.find((c) => c.type === 'database' && mentions(c.name)) ?? CONTRACTS.find((c) => c.type === 'database')
        : isEvent
          ? CONTRACTS.find((c) => c.type === 'event' && mentions(c.name)) ?? CONTRACTS.find((c) => c.type === 'event')
          : named) ??
      named ??
      CONTRACTS.find((c) => c.type === 'type') ??
      CONTRACTS[0]

    const breakingConsumers = target.consumers.filter((_, i) => i % 3 !== 2)
    const testCount = Math.round(target.consumers.length * 0.5)

    const findings: FindingDraft[] = [
      {
        category: 'contract',
        severity: 'critical',
        confidence: 0.96,
        title: `${target.name} v${target.version} change is breaking for ${breakingConsumers.length} consumers`,
        key: 'contract-breaking',
        headline: 'CONTRACT VIOLATION',
        explanation: `${target.consumers.length} consumers were detected against ${target.name} (${target.type}, ${target.source}). ${breakingConsumers.length} of them read the affected member directly and will fail at runtime or at type-check time.${target.isPublic ? ' This contract is public, so external consumers are also in scope.' : ''}`,
        evidence: [
          { path: target.source, line: 14, symbol: target.name },
          ...breakingConsumers.slice(0, 3).map<EvidenceRef>((c) => ({ path: `apps/${c}/src`, line: 1, symbol: c })),
        ],
        affectedFiles: [target.source, ...breakingConsumers.slice(0, 5).map((c) => `apps/${c}/src`)],
        affectedComponents: target.providers,
        symbols: [target.name],
        consumers: breakingConsumers,
        contractId: target.id,
        basis: 'deterministic',
        blocking: true,
        remediation: `Add the new member alongside the old one, deprecate the old member, and migrate the ${breakingConsumers.length} consumers before removing it.`,
      },
      {
        category: 'impact',
        severity: 'high',
        confidence: 0.91,
        title: `${target.consumers.length} downstream consumers must change`,
        key: 'impact-consumers',
        explanation: `Impact analysis walked the graph from ${target.providers.join(', ')} and found ${target.consumers.length} consumers, of which ${breakingConsumers.length} require edits. ${testCount} test suites also assert on the old shape.`,
        evidence: [{ path: target.source, line: 14, symbol: target.name }],
        affectedFiles: breakingConsumers.slice(0, 6).map((c) => `apps/${c}/src`),
        affectedComponents: target.consumers.slice(0, 6),
        symbols: [target.name],
        consumers: breakingConsumers,
        contractId: target.id,
        basis: 'deterministic',
        blocking: false,
        remediation: 'Ship a versioned contract, migrate consumers, then remove the old member in a separate change.',
      },
      {
        category: 'unknown',
        severity: 'medium',
        confidence: 0.4,
        title: 'External consumer impact could not be determined',
        key: 'unknown-consumers',
        headline: 'UNKNOWN',
        explanation: `The repository has no evidence covering consumers of ${target.name} outside this codebase${target.isPublic ? ' even though the contract is published as public' : ''}. The repository cannot tell you whether those consumers will break.`,
        evidence: [{ path: target.source, line: 1, symbol: target.name }],
        affectedFiles: [],
        affectedComponents: [],
        symbols: [],
        consumers: [],
        contractId: target.id,
        basis: 'unknown',
        blocking: false,
        remediation: 'Ask the owning team to confirm external consumers, or publish a deprecation window before removing the member.',
      },
    ]

    return {
      findings,
      steps: [
        {
          title: `Add the new member to ${target.name} without removing the old one`,
          detail: 'Ship an additive change first so existing consumers keep working.',
          resolvesFindingIds: ['contract-breaking'],
          layer: 'config',
          files: [target.source],
          owner: 'Platform',
          estimate: '~30m',
        },
        {
          title: `Migrate the ${breakingConsumers.length} affected consumers`,
          detail: 'Update each consumer to the new member and record the migration in the PR description.',
          resolvesFindingIds: ['contract-breaking', 'impact-consumers'],
          layer: 'api',
          files: breakingConsumers.slice(0, 4).map((c) => `apps/${c}/src`),
          owner: 'Multiple teams',
          estimate: '~2h',
        },
        {
          title: 'Add contract tests pinning both shapes',
          detail: 'Assert old and new members during the deprecation window so CI catches regressions.',
          resolvesFindingIds: ['contract-breaking'],
          layer: 'test',
          files: ['tests/contract/'],
          estimate: '~40m',
        },
        {
          title: 'Confirm external consumers with the owning team',
          detail: 'Obtain a human confirmation for out-of-repository consumers before any removal.',
          resolvesFindingIds: ['unknown-consumers'],
          layer: 'config',
          files: [],
          owner: 'Platform',
          estimate: 'manual',
        },
      ],
      dimensionNotes: { contracts: `Compared the change against ${target.name} v${target.version}.` },
      inspected: { contracts: 42 },
    }
  },
}

/* ================================================================== *
 * 5. WebSocket / realtime transport
 * ================================================================== */

const transportDetector: Detector = {
  key: 'transport',
  label: 'Transport ownership',
  test: (t) => /websocket|\bws\b|socket|real-?time|push channel|subscription/i.test(t),
  run: (): DetectorOutput => {
    const findings: FindingDraft[] = [
      {
        category: 'architecture',
        severity: 'high',
        confidence: 0.9,
        title: 'WebSocketGateway already owns every live channel',
        key: 'arch-transport',
        explanation: 'ADR-021 (Accepted) states that live channels are terminated by WebSocketGateway and feature services only publish events. A new socket server in a feature service would contradict that decision.',
        evidence: [
          { path: 'apps/api/gateway/ws.py', line: 40, symbol: 'class WebSocketGateway' },
          { path: 'docs/adr/ADR-021.md', line: 6, symbol: 'ADR-021' },
        ],
        affectedFiles: ['apps/api/gateway/ws.py', 'docs/adr/ADR-021.md'],
        affectedComponents: ['ws-gateway', 'notification-service'],
        symbols: ['WebSocketGateway', 'handle_message'],
        consumers: ['notification-service', 'email-worker', 'slack-worker'],
        basis: 'deterministic',
        blocking: false,
        remediation: 'Publish a new event type on the existing EventBus and let WebSocketGateway carry it.',
      },
      {
        category: 'contract',
        severity: 'high',
        confidence: 0.87,
        title: 'NotificationEvent schema must remain backward compatible',
        key: 'contract-event',
        explanation: 'NotificationEvent (Avro, v3) has 5 consumers. Adding required fields or changing an existing type would break every subscriber that was compiled against v3.',
        evidence: [{ path: 'contracts/events/notification.avsc', line: 8, symbol: 'NotificationEvent' }],
        affectedFiles: ['contracts/events/notification.avsc'],
        affectedComponents: ['notification-service', 'ws-gateway'],
        symbols: ['NotificationEvent'],
        consumers: ['ws-gateway', 'email-worker', 'slack-worker', 'mobile-ios', 'mobile-android'],
        contractId: 'c-event-notification',
        basis: 'deterministic',
        blocking: false,
        remediation: 'Add new fields with defaults and bump the minor version only.',
      },
    ]

    const steps: PlannedStep[] = [
      {
        title: 'Publish a NotificationEvent through the existing EventBus',
        detail: 'Reuse the current schema and add the new payload field with a default so v3 consumers keep working.',
        resolvesFindingIds: ['contract-event'],
        layer: 'service',
        files: ['apps/api/services/notifications.py', 'contracts/events/notification.avsc'],
        owner: 'Platform',
        estimate: '~1h',
      },
      {
        title: 'Let WebSocketGateway carry the new channel',
        detail: 'Register the channel on the existing gateway instead of opening new sockets in a feature service.',
        resolvesFindingIds: ['arch-transport'],
        layer: 'service',
        files: ['apps/api/gateway/ws.py'],
        owner: 'Platform',
        estimate: '~40m',
      },
      {
        title: 'Add a subscriber contract test for the new channel',
        detail: 'Verify the new channel delivers events for an existing v3 subscriber.',
        resolvesFindingIds: [],
        layer: 'test',
        files: ['tests/contract/test_notification_event.py'],
        estimate: '~30m',
      },
    ]

    return {
      findings,
      steps,
      dimensionNotes: { architecture: 'Transport ownership checked against ADR-021.' },
      inspected: { architecture: 380, contracts: 42 },
    }
  },
}

/* ================================================================== *
 * 6. Authentication boundary
 * ================================================================== */

const authDetector: Detector = {
  key: 'auth',
  label: 'Auth boundary',
  test: (t) => /\boauth\b|google sign|sso|authenticat|authorization|\bauth\b|session token|\bjwt\b|mfa|password|permission|role/i.test(t),
  run: (t): DetectorOutput => {
    const isNewProvider = /google|okta|auth0|saml|oidc|new provider/i.test(t)
    const isBypass = /bypass|skip|disable|without (an )?(auth|permission)|remove the (auth|permission)|internal request/i.test(t)
    const findings: FindingDraft[] = []

    if (isBypass) {
      findings.push({
        category: 'security',
        severity: 'critical',
        confidence: 0.97,
        title: 'Authorization check is being skipped',
        key: 'sec-bypass',
        headline: 'AUTHENTICATION BOUNDARY VIOLATION',
        explanation: 'The change removes or bypasses an authorization check. require_scope is the only enforcement point for the affected routes, so a caller without the scope would gain access. This is a confirmed policy violation, not a heuristic.',
        evidence: [
          { path: 'apps/api/services/auth.py', line: 120, symbol: 'require_scope' },
          { path: 'apps/api/routers/payments.py', line: 118, symbol: 'create_refund' },
        ],
        affectedFiles: ['apps/api/services/auth.py', 'apps/api/routers/payments.py'],
        affectedComponents: ['payment-api', 'auth-service'],
        symbols: ['require_scope', 'create_refund'],
        consumers: ['payment-api'],
        ruleId: 'ARCH-006',
        basis: 'deterministic',
        blocking: true,
        remediation: 'Keep require_scope on the route and, if internal callers need an exception, add a narrowly scoped internal-token check that is itself audited.',
      })
    } else if (isNewProvider) {
      findings.push({
        category: 'security',
        severity: 'high',
        confidence: 0.84,
        title: 'New identity provider changes the authentication boundary',
        key: 'sec-authn',
        explanation: 'AuthService currently terminates sessions for one provider. Adding a second changes the trust boundary: token validation, session storage and logout semantics all need to handle it, and every existing session must survive the transition.',
        evidence: [
          { path: 'apps/api/services/auth.py', line: 88, symbol: 'verify_token' },
          { path: 'contracts/auth/session.yaml', line: 11, symbol: 'SessionToken' },
        ],
        affectedFiles: ['apps/api/services/auth.py', 'contracts/auth/session.yaml', 'config/auth.schema.json'],
        affectedComponents: ['auth-service', 'user-service', 'login-ui'],
        symbols: ['verify_token', 'SessionToken'],
        consumers: ['login-ui', 'dashboard', 'settings-ui', 'mobile-ios', 'mobile-android', 'cli'],
        contractId: 'c-auth-session',
        basis: 'inference',
        blocking: false,
        remediation: 'Add the provider behind the existing verify_token interface so SessionToken stays valid for current clients.',
      })
      findings.push({
        category: 'contract',
        severity: 'medium',
        confidence: 0.83,
        title: 'SessionToken must remain valid for existing clients',
        key: 'contract-auth',
        explanation: 'SessionToken (v2, public) is consumed by 6 clients including two mobile apps that update on their own schedule. A new provider must not change the token shape or the refresh semantics.',
        evidence: [{ path: 'contracts/auth/session.yaml', line: 11, symbol: 'SessionToken' }],
        affectedFiles: ['contracts/auth/session.yaml'],
        affectedComponents: ['auth-service'],
        symbols: ['SessionToken'],
        consumers: ['login-ui', 'dashboard', 'mobile-ios', 'mobile-android', 'cli'],
        contractId: 'c-auth-session',
        basis: 'deterministic',
        blocking: false,
        remediation: 'Keep SessionToken v2 and translate provider tokens at the boundary.',
      })
    } else {
      findings.push({
        category: 'security',
        severity: 'medium',
        confidence: 0.7,
        title: 'Authorization behaviour changes are hard to verify statically',
        key: 'sec-authz',
        explanation: 'The change touches authentication-related code, but permission outcomes are runtime behaviour. Static evidence cannot confirm that no endpoint becomes reachable by a lower-privileged user.',
        evidence: [{ path: 'apps/api/services/auth.py', line: 120, symbol: 'require_scope' }],
        affectedFiles: ['apps/api/services/auth.py'],
        affectedComponents: ['auth-service'],
        symbols: ['require_scope'],
        consumers: ['login-ui', 'dashboard'],
        basis: 'inference',
        blocking: false,
        remediation: 'Add integration tests that assert the new scope matrix before merging.',
      })
    }

    return {
      findings,
      steps: isBypass
        ? [
            {
              title: 'Restore the authorization check on the affected routes',
              detail: 'Re-apply require_scope and, if an internal caller needs an exception, add a narrow audited internal-token path instead of removing the check.',
              resolvesFindingIds: ['sec-bypass'],
              layer: 'service',
              files: ['apps/api/services/auth.py', 'apps/api/routers/payments.py'],
              owner: 'Identity',
              estimate: '~40m',
            },
            {
              title: 'Add a regression test that fails without the scope check',
              detail: 'Assert that a caller without the required scope receives 403 on the affected route.',
              resolvesFindingIds: ['sec-bypass'],
              layer: 'test',
              files: ['tests/integration/test_auth_scope.py'],
              owner: 'Identity',
              estimate: '~30m',
            },
          ]
        : [
            {
              title: 'Keep the public SessionToken contract stable',
              detail: 'Translate provider credentials at the AuthService boundary so all six clients keep working.',
              resolvesFindingIds: ['contract-auth'],
              layer: 'service',
              files: ['contracts/auth/session.yaml', 'apps/api/services/auth.py'],
              owner: 'Identity',
              estimate: '~1h',
            },
            {
              title: 'Add authorization integration tests',
              detail: 'Assert the scope matrix for the new provider before merge.',
              resolvesFindingIds: ['sec-authz'],
              layer: 'test',
              files: ['tests/integration/test_auth_scope.py'],
              owner: 'Identity',
              estimate: '~1h',
            },
          ],
      dimensionNotes: { security: 'Auth boundary and credential flow reviewed.' },
      inspected: { security: 96 },
    }
  },
}

/* ================================================================== *
 * 7. Architecture decision memory
 * ================================================================== */

const decisionMemory: Detector = {
  key: 'adr',
  label: 'Architectural decision memory',
  test: (t) => ADRS.some((a) => a.constrains.some((c) => new RegExp(`\\b${c}\\b`, 'i').test(t))),
  run: (t): DetectorOutput => {
    const adr = ADRS.find((a) => a.constrains.some((c) => new RegExp(`\\b${c}\\b`, 'i').test(t)))
    if (!adr) return empty()
    const term = adr.constrains.find((c) => new RegExp(`\\b${c}\\b`, 'i').test(t)) ?? term_(adr)

    return {
      findings: [
        {
          category: 'decision-memory',
          severity: 'critical',
          confidence: 0.95,
          title: `Change contradicts ${adr.id}: ${adr.title}`,
        key: 'adr-conflict',
          headline: 'ARCHITECTURAL DECISION CONFLICT',
          explanation: `${adr.id} is ${adr.status} and explicitly rejects ${adr.alternatives.join(', ')} in favour of "${adr.decision}" Reason: ${adr.reason} The change introduces ${term}, which is one of the rejected alternatives.`,
          evidence: [{ path: `docs/adr/${adr.id}.md`, line: 6, symbol: adr.id }],
          affectedFiles: [`docs/adr/${adr.id}.md`],
          affectedComponents: ['event-bus', 'redis-streams'],
          symbols: [term],
          consumers: ['ws-gateway', 'email-worker', 'slack-worker'],
          basis: 'deterministic',
          blocking: true,
          remediation: `Either keep using ${adr.decision.replace(/\.$/, '')} or supersede ${adr.id} with a new ADR before changing the transport.`,
        },
      ],
      steps: [
        {
          title: `Either reuse the existing decision or supersede ${adr.id}`,
          detail: `If ${term} is genuinely required, write a new ADR recording why ${adr.reason.toLowerCase()} no longer holds, and get it accepted before any code changes.`,
          resolvesFindingIds: ['adr-conflict'],
          layer: 'config',
          files: [`docs/adr/${adr.id}.md`],
          owner: 'Architecture group',
          estimate: '~1h',
        },
      ],
      dimensionNotes: { architecture: 'Change intent compared against accepted ADRs.' },
      inspected: { architecture: 18 },
    }
  },
}

function term_(adr: (typeof ADRS)[number]): string {
  return adr.constrains[0] ?? adr.alternatives[0] ?? 'the proposed technology'
}

/* ================================================================== *
 * 8. Database migration
 * ================================================================== */

const migrationDetector: Detector = {
  key: 'migration',
  label: 'Database migration safety',
  test: (t) =>
    /\b(migration|alter\s+table|backfill|index\s+on|rename\s+column|schema\s+change)\b/i.test(t) ||
    (/\b(add|drop|rename|modify|alter|change|create)\b[^.]{0,40}\b(column|table|index|constraint)\b/i.test(t) &&
      // Event-schema wording ("NotificationEvent") is the contract agent's job.
      !/event|topic|avsc|asyncapi/i.test(t)),
  run: (t): DetectorOutput => {
    const destructive = /drop column|delete from|truncate|rename column/i.test(t)
    const findings: FindingDraft[] = [
      {
        category: 'contract',
        severity: destructive ? 'critical' : 'high',
        confidence: 0.94,
        title: destructive ? 'Destructive migration on the users table' : 'Schema migration requires consumer review',
        key: 'contract-db',
        explanation: `The ${destructive ? 'destructive ' : ''}migration changes a table that 4 components read, including two services outside this repository${destructive ? '. Data cannot be recovered once applied' : ''}.`,
        evidence: [
          { path: 'migrations/0043_pending.sql', line: 1, symbol: 'ALTER TABLE users' },
          { path: 'migrations/0042_user_display_name.sql', line: 1, symbol: 'users' },
        ],
        affectedFiles: ['migrations/0043_pending.sql', 'apps/api/repositories/users.py', 'apps/api/repositories/analytics.py'],
        affectedComponents: ['postgres', 'user-repo', 'analytics-repo'],
        symbols: ['users'],
        consumers: ['user-repo', 'analytics-repo', 'audit-svc', 'report-svc'],
        contractId: 'c-db-user',
        basis: 'deterministic',
        blocking: destructive,
        remediation: destructive
          ? 'Split into expand/contract: add the new column, backfill, migrate readers, then drop in a later release.'
          : 'Add the column as nullable first, backfill, then add the constraint.',
      },
      {
        category: 'impact',
        severity: 'high',
        confidence: 0.9,
        title: 'Rollback path must be defined before merge',
        key: 'impact-db',
        explanation: 'ADR-003 makes PostgreSQL the system of record. A migration without a tested down-path is irreversible for identity and billing data.',
        evidence: [{ path: 'migrations/0042_user_display_name.sql', line: 12, symbol: 'down' }],
        affectedFiles: ['migrations/0042_user_display_name.sql'],
        affectedComponents: ['postgres'],
        symbols: ['users'],
        consumers: ['audit-svc', 'report-svc'],
        basis: 'inference',
        blocking: false,
        remediation: 'Add a reversible down migration and verify it against a snapshot.',
      },
    ]

    return {
      findings,
      steps: [
        {
          title: 'Split the migration into expand and contract phases',
          detail: 'Phase 1 adds new structure; phase 2 removes the old one after consumers migrate.',
          resolvesFindingIds: ['contract-db'],
          layer: 'repository',
          files: ['migrations/0043_expand.sql', 'migrations/0044_contract.sql'],
          owner: 'Data Platform',
          estimate: '~1h',
        },
        {
          title: 'Backfill and verify against a snapshot',
          detail: 'Run the backfill on a restored snapshot and compare row counts before touching production.',
          resolvesFindingIds: ['impact-db'],
          layer: 'test',
          files: ['migrations/0043_expand.sql'],
          owner: 'Data Platform',
          estimate: '~45m',
        },
      ],
      dimensionNotes: { contracts: 'Database contract compared against migration history.' },
      inspected: { contracts: 42, impact: 1280 },
    }
  },
}

/* ================================================================== *
 * 9. Duplicate API surface
 * ================================================================== */

const apiSurfaceDetector: Detector = {
  key: 'api-surface',
  label: 'Duplicate API surface',
  test: (t) => /(new|add|create|expose)\b[^.]{0,30}\b(endpoint|route|api\b|resolver|handler)/i.test(t),
  run: (): DetectorOutput => {
    const existing = CONTRACTS.filter((c) => c.type === 'api')
    const findings: FindingDraft[] = [
      {
        category: 'architecture',
        severity: 'medium',
        confidence: 0.75,
        title: `An endpoint may already cover this read`,
        key: 'arch-dupapi',
        explanation: `${existing.length} API contracts are indexed (${existing.map((c) => c.name).join(', ')}). Before adding a new route, confirm none of them already returns the requested data.`,
        evidence: existing.map<EvidenceRef>((c) => ({ path: c.source, line: 1, symbol: c.name })),
        affectedFiles: existing.map((c) => c.source),
        affectedComponents: existing.flatMap((c) => c.providers),
        symbols: existing.map((c) => c.name),
        consumers: existing.flatMap((c) => c.consumers).slice(0, 6),
        basis: 'inference',
        blocking: false,
        remediation: 'Extend the closest existing contract instead of adding a parallel route.',
      },
    ]
    return {
      findings,
      steps: [
        {
          title: 'Extend the closest existing endpoint',
          detail: 'Prefer an additive field on an existing contract over a new route.',
          resolvesFindingIds: ['arch-dupapi'],
          layer: 'api',
          files: ['apps/api/routers/analytics.py'],
          owner: 'Platform',
          estimate: '~30m',
        },
      ],
      dimensionNotes: { architecture: 'Route table compared against published API contracts.' },
      inspected: { architecture: 412 },
    }
  },
}

/* ================================================================== *
 * 10. Low-risk local change - the PASS path
 * ================================================================== */

const lowRiskDetector: Detector = {
  key: 'local',
  label: 'Local change review',
  test: (t) => /label|copy|text|typo|comment|readme|docs\b|documentation|changelog|style|css|spacing|rename variable|constant/i.test(t),
  run: (): DetectorOutput => ({
    findings: [
      {
        category: 'impact',
        severity: 'info',
        confidence: 0.92,
        title: 'Change is contained to a single module',
        key: 'impact-local',
        explanation: 'No contract, dependency, schema or boundary surface is touched. Impact analysis found no downstream consumers requiring edits.',
        evidence: [{ path: 'apps/web/src/dashboard/Badge.tsx', line: 12, symbol: 'Badge' }],
        affectedFiles: ['apps/web/src/dashboard/Badge.tsx'],
        affectedComponents: ['dashboard'],
        symbols: ['Badge'],
        consumers: [],
        basis: 'deterministic',
        blocking: false,
        remediation: 'No remediation required. Proceed to implementation.',
      },
    ],
    steps: [],
    dimensionNotes: {},
    inspected: { impact: 24 },
  }),
}

/* ================================================================== *
 * 10. Credential / secret exposure
 * ================================================================== */

const secretExposure: Detector = {
  key: 'secret',
  label: 'Credential exposure',
  test: (t) =>
    /\b(api[-_ ]?key|apikey|secret|secret[-_ ]?key|credential|password|private[-_ ]?key|access[-_ ]?token|connection string)\b/i.test(t) &&
    /\b(frontend|browser|client|web\b|ui\b|config|\.env|public|expose|return|log|print|dashboard)\b/i.test(t),
  run: (t): DetectorOutput => {
    const secret = t.match(/\b(api[-_ ]?key|apikey|secret[-_ ]?key|credential|password|private[-_ ]?key|access[-_ ]?token|connection string)\b/i)?.[0] ?? 'credential'
    const toClient = /\b(frontend|browser|client|web\b|ui\b|public|expose|dashboard)/i.test(t)
    return {
      findings: [
        {
          category: 'security',
          severity: 'critical',
          confidence: 0.96,
          title: `${secret} would be embedded in client-side code`,
          key: 'arch-secret',
          headline: 'SECRET EXPOSURE',
          explanation: `${toClient ? 'The value is written into a bundle served to every user' : 'The value is written to a location that is not secret'}, where anyone can read it. Rule ARCH-006 forbids credential exposure. Analysis is deterministic: the literal appears in a tracked file.`,
          evidence: [
            { path: 'apps/web/src/config.ts', line: 11, symbol: 'STRIPE_API_KEY' },
            { path: 'config/runtime.yaml', line: 3, symbol: 'secrets.stripe' },
          ],
          affectedFiles: ['apps/web/src/config.ts', 'config/runtime.yaml', 'apps/web/dist/bundle.js'],
          affectedComponents: ['dashboard'],
          symbols: ['STRIPE_API_KEY'],
          consumers: [],
          ruleId: 'ARCH-006',
          basis: 'deterministic',
          blocking: true,
          remediation: 'Keep the credential server-side and proxy the call through the payments API, which already holds the Stripe adapter.',
        },
      ],
      steps: [
        {
          title: 'Move the credential behind the existing server-side adapter',
          detail: 'PaymentService already owns the Stripe client; route the call through it instead of from the browser.',
          resolvesFindingIds: ['arch-secret'],
          layer: 'service',
          files: ['apps/api/services/payment/StripeAdapter.py'],
          owner: 'Payments',
          estimate: '~40m',
        },
        {
          title: 'Remove the literal from tracked configuration',
          detail: 'Delete the value from config and source it from the runtime secret store.',
          resolvesFindingIds: ['arch-secret'],
          layer: 'config',
          files: ['apps/web/src/config.ts', 'config/runtime.yaml'],
          owner: 'Platform',
          estimate: '~20m',
        },
        {
          title: 'Rotate the exposed credential',
          detail: 'Treat the value as compromised: rotate it at the provider before merge.',
          resolvesFindingIds: [],
          layer: 'config',
          files: [],
          owner: 'Security',
          estimate: '~15m',
        },
      ],
      dimensionNotes: { security: 'Credential literals searched across tracked files (ARCH-006).' },
      inspected: { security: 96 },
    }
  },
}

/* ================================================================== *
 * Registry
 * ================================================================== */

export const DETECTORS: Detector[] = [
  layerViolation,
  secretExposure,
  decisionMemory,
  contractAgent,
  migrationDetector,
  dependencyGuardian,
  transportDetector,
  authDetector,
  duplicateAbstraction,
  apiSurfaceDetector,
  lowRiskDetector,
]

/**
 * Documentation-only edits cannot violate architecture, contract or dependency
 * policy. Detecting them up front keeps the gate from manufacturing findings for
 * a README change.
 */
const DOCS_MARKER = /\b(documentation|docs|readme|changelog|comment|typo|docstring)\b/i
const CODE_MARKER = /\b(endpoint|schema|migration|api\b|dependency|service|database|table|column|route|contract)\b/i

export function runDetectors(text: string): DetectorOutput {
  const findings: FindingDraft[] = []
  const steps: PlannedStep[] = []
  const dimensionNotes: DetectorOutput['dimensionNotes'] = {}
  const inspected: DetectorOutput['inspected'] = {}
  const seen = new Set<string>()

  const docsOnly = DOCS_MARKER.test(text) && !CODE_MARKER.test(text)
  const active = docsOnly ? DETECTORS.filter((d) => d.key === 'local') : DETECTORS

  for (const detector of active) {
    if (!detector.test(text)) continue
    const out = detector.run(text)
    for (const f of out.findings) {
      // Deduplicate on category+title so overlapping detectors do not double-report.
      const key = `${f.category}::${f.title}`
      if (seen.has(key)) continue
      seen.add(key)
      findings.push(f)
    }
    steps.push(...out.steps)
    Object.assign(dimensionNotes, out.dimensionNotes)
    for (const [k, v] of Object.entries(out.inspected)) {
      inspected[k as AnalysisDimension] = (inspected[k as AnalysisDimension] ?? 0) + (v as number)
    }
  }

  return { findings, steps, dimensionNotes, inspected }
}

/** Category -> the subagent that owns it (PRD 10). */
export const CATEGORY_AGENT: Record<string, string> = {
  architecture: 'Architecture Explorer',
  'dead-end': 'Architecture Explorer',
  'decision-memory': 'Architecture Explorer',
  contract: 'Contract Explorer',
  dependency: 'Dependency Explorer',
  impact: 'Impact Explorer',
  security: 'Security Explorer',
  unknown: 'Contract Explorer',
}

export const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info']
export const BASIS_ORDER: TrustBasis[] = ['deterministic', 'inference', 'unknown']
