import type {
  Adr,
  ArchitectureRule,
  Component,
  Contract,
  DependencyRecord,
  Project,
  Relationship,
} from '@/types'

/**
 * Indexed repository fixture - "ORCA" from PRD 16/17.
 * Shapes the knowledge graph, contracts, rules and ADRs the pre-flight engine
 * reasons over. Swap for `GET /api/project/:id/graph` when the backend lands.
 */

export const PROJECT: Project = {
  id: 'orca',
  name: 'ORCA',
  repository: 'github.com/orca-platform/orca',
  defaultBranch: 'main',
  createdAt: '2026-02-11T09:00:00.000Z',
  lastIndexedAt: new Date(Date.now() - 2 * 60_000).toISOString(),
  index: {
    status: 'ready',
    files: 3841,
    modules: 412,
    symbols: 18_902,
    relationships: 6_233,
    durationSeconds: 96,
    languages: ['.ts', '.tsx', '.py', '.yaml', '.sql'],
  },
}

export const COMPONENTS: Component[] = [
  // frontend
  { id: 'dashboard', projectId: 'orca', name: 'Dashboard', type: 'frontend', path: 'apps/web/src/dashboard', owner: 'Web Platform', description: 'Analytics dashboard React app' },
  { id: 'settings-ui', projectId: 'orca', name: 'SettingsUI', type: 'frontend', path: 'apps/web/src/settings', owner: 'Web Platform', description: 'User settings and preferences' },
  { id: 'login-ui', projectId: 'orca', name: 'LoginUI', type: 'frontend', path: 'apps/web/src/auth/Login.tsx', owner: 'Web Platform', description: 'Login and SSO entry point' },
  // api
  { id: 'analytics-api', projectId: 'orca', name: 'AnalyticsAPI', type: 'api', path: 'apps/api/routers/analytics.py', owner: 'Platform', description: 'GET /v1/analytics/*' },
  { id: 'user-api', projectId: 'orca', name: 'UserAPI', type: 'api', path: 'apps/api/routers/users.py', owner: 'Identity', description: 'GET/PATCH /v1/users' },
  { id: 'notification-api', projectId: 'orca', name: 'NotificationAPI', type: 'api', path: 'apps/api/routers/notifications.py', owner: 'Platform', description: 'GET /v1/notifications' },
  { id: 'payment-api', projectId: 'orca', name: 'PaymentAPI', type: 'api', path: 'apps/api/routers/payments.py', owner: 'Payments', description: 'POST /v1/payments' },
  // services
  { id: 'analytics-service', projectId: 'orca', name: 'AnalyticsService', type: 'service', path: 'apps/api/services/analytics.py', owner: 'Platform', description: 'Aggregates analytics queries' },
  { id: 'notification-service', projectId: 'orca', name: 'NotificationService', type: 'service', path: 'apps/api/services/notifications.py', owner: 'Platform', description: 'Fan-out delivery over EventBus' },
  { id: 'payment-service', projectId: 'orca', name: 'PaymentService', type: 'service', path: 'apps/api/services/payment', owner: 'Payments', description: 'Payment orchestration with adapters' },
  { id: 'user-service', projectId: 'orca', name: 'UserService', type: 'service', path: 'apps/api/services/users.py', owner: 'Identity', description: 'User lifecycle and profile' },
  { id: 'auth-service', projectId: 'orca', name: 'AuthService', type: 'service', path: 'apps/api/services/auth.py', owner: 'Identity', description: 'Token issuance, sessions' },
  { id: 'ws-gateway', projectId: 'orca', name: 'WebSocketGateway', type: 'service', path: 'apps/api/gateway/ws.py', owner: 'Platform', description: 'Existing WS transport for live updates' },
  // repositories
  { id: 'analytics-repo', projectId: 'orca', name: 'AnalyticsRepository', type: 'repository', path: 'apps/api/repositories/analytics.py', owner: 'Platform' },
  { id: 'user-repo', projectId: 'orca', name: 'UserRepository', type: 'repository', path: 'apps/api/repositories/users.py', owner: 'Identity' },
  { id: 'notification-repo', projectId: 'orca', name: 'NotificationRepository', type: 'repository', path: 'apps/api/repositories/notifications.py', owner: 'Platform' },
  // data + infra
  { id: 'postgres', projectId: 'orca', name: 'PostgreSQL', type: 'database', path: 'infra/postgres', owner: 'Data Platform', description: 'Primary OLTP store' },
  { id: 'redis-streams', projectId: 'orca', name: 'Redis Streams', type: 'database', path: 'infra/redis', owner: 'Data Platform', description: 'Internal event backbone (ADR-014)' },
  { id: 'event-bus', projectId: 'orca', name: 'EventBus', type: 'event', path: 'apps/api/events/bus.py', owner: 'Platform', description: 'Publish/subscribe over Redis Streams' },
  { id: 'design-system', projectId: 'orca', name: 'DesignSystem', type: 'library', path: 'packages/ui', owner: 'Web Platform', description: 'Shared React component library' },
  // external
  { id: 'stripe', projectId: 'orca', name: 'Stripe', type: 'external', path: 'external:stripe', owner: 'Payments' },
  { id: 'google-oauth', projectId: 'orca', name: 'GoogleOAuth', type: 'external', path: 'external:google.identity', owner: 'Identity' },
  { id: 'ws-lib-x', projectId: 'orca', name: 'LibraryX', type: 'external', path: 'external:library-x', owner: 'n/a', description: 'Proposed third-party WebSocket framework' },
]

export const RELATIONSHIPS: Relationship[] = [
  { id: 'r1', projectId: 'orca', source: 'dashboard', target: 'analytics-api', type: 'calls', evidence: [{ path: 'apps/web/src/dashboard/api.ts', line: 18, symbol: 'fetchAnalytics' }], allowed: true },
  { id: 'r2', projectId: 'orca', source: 'dashboard', target: 'notification-api', type: 'consumes', evidence: [{ path: 'apps/web/src/dashboard/NotificationBell.tsx', line: 31 }], allowed: true },
  { id: 'r3', projectId: 'orca', source: 'dashboard', target: 'design-system', type: 'depends_on', evidence: [{ path: 'apps/web/package.json', line: 24 }], allowed: true },
  { id: 'r4', projectId: 'orca', source: 'login-ui', target: 'user-api', type: 'calls', evidence: [{ path: 'apps/web/src/auth/Login.tsx', line: 77 }], allowed: true },
  { id: 'r5', projectId: 'orca', source: 'settings-ui', target: 'user-api', type: 'calls', evidence: [{ path: 'apps/web/src/settings/api.ts', line: 12 }], allowed: true },
  { id: 'r6', projectId: 'orca', source: 'analytics-api', target: 'analytics-service', type: 'provides', evidence: [{ path: 'apps/api/routers/analytics.py', line: 44 }], allowed: true },
  { id: 'r7', projectId: 'orca', source: 'user-api', target: 'user-service', type: 'provides', evidence: [{ path: 'apps/api/routers/users.py', line: 60 }], allowed: true },
  { id: 'r8', projectId: 'orca', source: 'notification-api', target: 'notification-service', type: 'provides', evidence: [{ path: 'apps/api/routers/notifications.py', line: 22 }], allowed: true },
  { id: 'r9', projectId: 'orca', source: 'payment-api', target: 'payment-service', type: 'provides', evidence: [{ path: 'apps/api/routers/payments.py', line: 91 }], allowed: true },
  { id: 'r10', projectId: 'orca', source: 'analytics-service', target: 'analytics-repo', type: 'depends_on', evidence: [{ path: 'apps/api/services/analytics.py', line: 15 }], allowed: true },
  { id: 'r11', projectId: 'orca', source: 'user-service', target: 'user-repo', type: 'depends_on', evidence: [{ path: 'apps/api/services/users.py', line: 12 }], allowed: true },
  { id: 'r12', projectId: 'orca', source: 'notification-service', target: 'notification-repo', type: 'depends_on', evidence: [{ path: 'apps/api/services/notifications.py', line: 9 }], allowed: true },
  { id: 'r13', projectId: 'orca', source: 'analytics-repo', target: 'postgres', type: 'reads', evidence: [{ path: 'apps/api/repositories/analytics.py', line: 30 }], allowed: true },
  { id: 'r14', projectId: 'orca', source: 'user-repo', target: 'postgres', type: 'writes', evidence: [{ path: 'apps/api/repositories/users.py', line: 48 }], allowed: true },
  { id: 'r15', projectId: 'orca', source: 'notification-repo', target: 'postgres', type: 'reads', evidence: [{ path: 'apps/api/repositories/notifications.py', line: 21 }], allowed: true },
  { id: 'r16', projectId: 'orca', source: 'notification-service', target: 'event-bus', type: 'publishes', evidence: [{ path: 'apps/api/services/notifications.py', line: 64, symbol: 'NotificationEvent' }], allowed: true },
  { id: 'r17', projectId: 'orca', source: 'ws-gateway', target: 'event-bus', type: 'subscribes', evidence: [{ path: 'apps/api/gateway/ws.py', line: 40 }], allowed: true },
  { id: 'r18', projectId: 'orca', source: 'event-bus', target: 'redis-streams', type: 'depends_on', evidence: [{ path: 'apps/api/events/bus.py', line: 19 }], allowed: true },
  { id: 'r19', projectId: 'orca', source: 'auth-service', target: 'user-repo', type: 'depends_on', evidence: [{ path: 'apps/api/services/auth.py', line: 14 }], allowed: true },
  { id: 'r20', projectId: 'orca', source: 'auth-service', target: 'google-oauth', type: 'calls', evidence: [{ path: 'apps/api/services/auth/oauth.py', line: 71 }], allowed: true },
  { id: 'r21', projectId: 'orca', source: 'payment-service', target: 'stripe', type: 'calls', evidence: [{ path: 'apps/api/services/payment/StripeAdapter.py', line: 33 }], allowed: true },
  { id: 'r22', projectId: 'orca', source: 'payment-service', target: 'redis-streams', type: 'depends_on', evidence: [{ path: 'apps/api/services/payment/__init__.py', line: 6 }], allowed: true },
  { id: 'r23', projectId: 'orca', source: 'notification-service', target: 'ws-gateway', type: 'calls', evidence: [{ path: 'apps/api/services/notifications.py', line: 88 }], allowed: true },
  // Known pre-existing drift: controller reaching the repository directly.
  { id: 'r24', projectId: 'orca', source: 'user-api', target: 'user-repo', type: 'calls', evidence: [{ path: 'apps/api/routers/users.py', line: 188 }], allowed: false, violatedRuleId: 'ARCH-002' },
]

export const CONTRACTS: Contract[] = [
  { id: 'c-api-user', projectId: 'orca', name: 'UserResponse', type: 'api', source: 'contracts/openapi/users.yaml', version: 'v1', consumers: ['dashboard', 'settings-ui', 'login-ui', 'billing-svc', 'audit-svc', 'report-svc', 'mobile-ios', 'mobile-android'], providers: ['user-api'], breaking: true, isPublic: true },
  { id: 'c-api-analytics', projectId: 'orca', name: 'AnalyticsQuery', type: 'api', source: 'contracts/openapi/analytics.yaml', version: 'v2', consumers: ['dashboard', 'report-svc'], providers: ['analytics-api'], breaking: false, isPublic: false },
  { id: 'c-event-notification', projectId: 'orca', name: 'NotificationEvent', type: 'event', source: 'contracts/events/notification.avsc', version: '3', consumers: ['ws-gateway', 'email-worker', 'slack-worker', 'mobile-ios', 'mobile-android'], providers: ['notification-service'], breaking: true, isPublic: true },
  { id: 'c-type-user', projectId: 'orca', name: 'User', type: 'type', source: 'apps/web/src/types/user.ts', version: '11', consumers: ['dashboard', 'settings-ui', 'login-ui'], providers: ['user-api'], breaking: true, isPublic: false },
  { id: 'c-db-user', projectId: 'orca', name: 'users table', type: 'database', source: 'migrations/0042_user_display_name.sql', version: '42', consumers: ['user-repo', 'analytics-repo', 'audit-svc', 'report-svc'], providers: ['postgres'], breaking: true, isPublic: false },
  { id: 'c-config-auth', projectId: 'orca', name: 'AuthConfig', type: 'configuration', source: 'config/auth.schema.json', version: '6', consumers: ['auth-service', 'login-ui'], providers: ['config'], breaking: false, isPublic: false },
  { id: 'c-auth-session', projectId: 'orca', name: 'SessionToken', type: 'authentication', source: 'contracts/auth/session.yaml', version: '2', consumers: ['login-ui', 'dashboard', 'settings-ui', 'mobile-ios', 'mobile-android', 'cli'], providers: ['auth-service'], breaking: true, isPublic: true },
]

/** Architecture-as-code. Mirrors policies/architecture.yaml (PRD 32). */
export const RULES: ArchitectureRule[] = [
  { id: 'ARCH-001', projectId: 'orca', ruleType: 'layer-boundary', description: 'Frontend must not access database', expression: 'frontend -/-> database', severity: 'critical', enforcement: 'block', enabled: true },
  { id: 'ARCH-002', projectId: 'orca', ruleType: 'layer-boundary', description: 'API must not access database directly', expression: 'api -/-> database', severity: 'high', enforcement: 'block', enabled: true },
  { id: 'ARCH-003', projectId: 'orca', ruleType: 'layer-boundary', description: 'Services must not import another service directly', expression: 'services -/-> services', severity: 'medium', enforcement: 'review', enabled: true },
  { id: 'ARCH-004', projectId: 'orca', ruleType: 'duplicate-abstraction', description: 'Extend an existing equivalent abstraction instead of creating a parallel one', expression: 'abstraction ~= abstraction', severity: 'high', enforcement: 'review', enabled: true },
  { id: 'ARCH-005', projectId: 'orca', ruleType: 'circular-dependency', description: 'No cycles longer than 1 in the component graph', expression: 'acyclic(componentGraph)', severity: 'high', enforcement: 'block', enabled: true },
  { id: 'ARCH-006', projectId: 'orca', ruleType: 'secret-exposure', description: 'Credentials must never reach a client-side bundle', expression: 'no(frontend -/-> secret)', severity: 'critical', enforcement: 'block', enabled: true },
  { id: 'ARCH-007', projectId: 'orca', ruleType: 'layer-boundary', description: 'Frontend may only call the api layer', expression: 'frontend -> {api, ui}', severity: 'medium', enforcement: 'review', enabled: true },
  { id: 'ARCH-008', projectId: 'orca', ruleType: 'dependency-policy', description: 'Forbidden packages must never reach the lockfile', expression: 'not_in(dependency, forbidden)', severity: 'critical', enforcement: 'block', enabled: true },
  { id: 'ARCH-009', projectId: 'orca', ruleType: 'dependency-policy', description: 'Approval-required packages need a recorded approver before the lockfile changes', expression: 'approver(dependency) required', severity: 'high', enforcement: 'block', enabled: true },
]

export const ADRS: Adr[] = [
  {
    id: 'ADR-014',
    projectId: 'orca',
    title: 'Use Redis Streams for internal event processing',
    decision: 'All internal asynchronous events flow through Redis Streams via the shared EventBus.',
    reason: 'Existing infrastructure already operated by the platform team; simplest operational model and lowest incremental cost.',
    status: 'Accepted',
    date: '2026-01-18',
    alternatives: ['RabbitMQ', 'Kafka', 'NATS'],
    constrains: ['message-broker', 'rabbitmq', 'kafka', 'nats', 'amqp'],
    author: 'A. Raghavan',
  },
  {
    id: 'ADR-009',
    projectId: 'orca',
    title: 'Service layer mediates all database access',
    decision: 'Routers and controllers may never issue queries; repositories are only reachable from services.',
    reason: 'Centralises transaction boundaries, auditing and query performance tuning.',
    status: 'Accepted',
    date: '2025-11-02',
    alternatives: ['Active Record in routers', 'Direct ORM in controllers'],
    constrains: ['direct-db-access', 'orm-in-controller'],
    author: 'M. Okafor',
  },
  {
    id: 'ADR-006',
    projectId: 'orca',
    title: 'Single shared design system package',
    decision: 'All web surfaces consume @orca/ui. Feature-local component forks are not permitted.',
    reason: 'Avoided visual and accessibility divergence across the three web apps.',
    status: 'Accepted',
    date: '2025-09-14',
    alternatives: ['Per-app component libraries', 'Unstyled primitives only'],
    constrains: ['local-ui-fork'],
    author: 'L. Fontaine',
  },
  {
    id: 'ADR-021',
    projectId: 'orca',
    title: 'WebSocket transport owned by the platform gateway',
    decision: 'Live channels are terminated by WebSocketGateway. Feature services publish events, they do not own sockets.',
    reason: 'Keeps connection lifecycle, auth refresh and backpressure in one place.',
    status: 'Accepted',
    date: '2026-04-30',
    alternatives: ['Per-feature socket servers', 'Long polling'],
    constrains: ['socket-per-feature', 'raw-websocket-service'],
    author: 'S. Duval',
  },
  {
    id: 'ADR-003',
    projectId: 'orca',
    title: 'PostgreSQL as the only system of record',
    decision: 'PostgreSQL is authoritative. Caches and streams are derived and may be rebuilt.',
    reason: 'Consistency requirements for billing and identity.',
    status: 'Accepted',
    date: '2025-07-08',
    alternatives: ['Polyglot persistence', 'Event sourcing as primary store'],
    constrains: ['mongodb', 'dynamodb', 'event-sourcing-primary'],
    author: 'A. Raghavan',
  },
]

export const DEPENDENCIES: DependencyRecord[] = [
  { name: 'react', version: '19.0.0', scope: 'direct', deprecated: false, license: 'MIT', weeklyDownloads: 24_000_000, policy: 'allowed' },
  { name: '@xyflow/react', version: '12.3.6', scope: 'direct', deprecated: false, license: 'MIT', weeklyDownloads: 780_000, policy: 'allowed' },
  { name: 'fastapi', version: '0.115.2', scope: 'direct', deprecated: false, license: 'MIT', weeklyDownloads: 9_400_000, policy: 'allowed' },
  { name: 'redis', version: '5.1.1', scope: 'direct', deprecated: false, license: 'MIT', weeklyDownloads: 8_100_000, policy: 'allowed', internalAlternative: 'EventBus' },
  { name: 'requests', version: '2.31.0', scope: 'direct', deprecated: false, license: 'Apache-2.0', weeklyDownloads: 62_000_000, policy: 'approval-required' },
  { name: 'moment', version: '2.29.4', scope: 'transitive', deprecated: true, replacedBy: 'date-fns or Temporal API', license: 'MIT', weeklyDownloads: 5_200_000, policy: 'forbidden' },
  { name: 'node-fetch', version: '2.6.7', scope: 'direct', deprecated: true, replacedBy: 'native fetch', license: 'MIT', weeklyDownloads: 18_000_000, policy: 'forbidden' },
  { name: 'library-x', version: '0.4.2', scope: 'direct', deprecated: false, license: 'Apache-2.0', weeklyDownloads: 4_100, policy: 'approval-required', internalAlternative: 'WebSocketGateway' },
  { name: 'rabbitmq', version: '3.13.0', scope: 'direct', deprecated: false, license: 'MPL-2.0', weeklyDownloads: 900_000, policy: 'forbidden', internalAlternative: 'EventBus (Redis Streams, ADR-014)' },
  { name: 'pg', version: '8.13.1', scope: 'direct', deprecated: false, license: 'MIT', weeklyDownloads: 12_000_000, policy: 'approval-required' },
]

export const OWNERS = [
  { team: 'Web Platform', components: ['dashboard', 'settings-ui', 'login-ui', 'design-system'], reviewers: ['L. Fontaine', 'D. Roy'] },
  { team: 'Identity', components: ['user-api', 'user-service', 'auth-service', 'user-repo', 'google-oauth'], reviewers: ['M. Okafor'] },
  { team: 'Platform', components: ['analytics-api', 'notification-api', 'analytics-service', 'notification-service', 'ws-gateway', 'event-bus'], reviewers: ['S. Duval', 'A. Raghavan'] },
  { team: 'Payments', components: ['payment-api', 'payment-service', 'stripe'], reviewers: ['J. Bekele'] },
  { team: 'Data Platform', components: ['postgres', 'redis-streams'], reviewers: ['A. Raghavan'] },
]

export const EXTERNAL_CONSUMERS = [
  { name: 'billing-svc', contract: 'c-api-user', kind: 'service' },
  { name: 'audit-svc', contract: 'c-api-user', kind: 'service' },
  { name: 'report-svc', contract: 'c-api-user', kind: 'service' },
  { name: 'mobile-ios', contract: 'c-auth-session', kind: 'mobile' },
  { name: 'mobile-android', contract: 'c-auth-session', kind: 'mobile' },
  { name: 'cli', contract: 'c-auth-session', kind: 'cli' },
  { name: 'email-worker', contract: 'c-event-notification', kind: 'service' },
  { name: 'slack-worker', contract: 'c-event-notification', kind: 'service' },
]

export function componentById(id: string): Component | undefined {
  return COMPONENTS.find((c) => c.id === id)
}

export function contractById(id: string): Contract | undefined {
  return CONTRACTS.find((c) => c.id === id)
}

export function ruleById(id: string): ArchitectureRule | undefined {
  return RULES.find((r) => r.id === id)
}

export function adrById(id: string): Adr | undefined {
  return ADRS.find((a) => a.id === id)
}

/** Team that owns a component - used for ownership routing (PRD 18.5). */
export function ownerOf(componentId: string): string {
  return OWNERS.find((o) => o.components.includes(componentId))?.team ?? 'Unassigned'
}
