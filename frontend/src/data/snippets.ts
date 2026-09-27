/**
 * Source excerpts for the evidence explorer.
 *
 * In production these come from the indexed repository (`GET /api/file?path=…`).
 * Locally they are a curated subset of the ORCA fixture, with a generated stub
 * as a fallback so every evidence link resolves to something readable.
 */

const SNIPPETS: Record<string, string> = {
  'apps/web/src/dashboard/db-client.ts': `import { Pool } from 'pg'

// Requested by the change under review: open Postgres straight from the
// browser bundle instead of going through AnalyticsAPI.
const pool = new Pool({
  connectionString: process.env.NEXT_PUBLIC_DATABASE_URL, // ARCH-006: leaks the credential
  ssl: { rejectUnauthorized: false },
  max: 10,
})

export async function querySeries(range: string) {
  const { rows } = await pool.query(
    'SELECT bucket, value FROM analytics_series WHERE bucket >= $1',
    [range],
  )
  return rows
}

export async function queryTotals() {
  const { rows } = await pool.query('SELECT count(*) FROM analytics_series')
  return rows[0]
}
`,

  'apps/api/routers/analytics.py': `from fastapi import APIRouter
from apps.api.services.analytics import AnalyticsService

router = APIRouter(prefix="/v1/analytics")
service = AnalyticsService()


@router.get("/series")
async def get_series(range: str = "7d"):
    return await service.series(range)


@router.get("/totals")
async def get_totals():
    return await service.totals()


# Layer rule ARCH-002: a router must not reach the data layer directly.
# This import is the violation the pre-flight run blocks.
from apps.api.repositories.analytics import AnalyticsRepository  # noqa: E402

_repo = AnalyticsRepository()


@router.get("/raw")
async def get_raw_series():
    return await _repo.raw_query("SELECT * FROM analytics_series")
`,

  'apps/api/repositories/analytics.py': `from apps.api.db.pool import get_pool

# ADR-009: repositories are the only component allowed to hold a SQL string.
# Reached exclusively from AnalyticsService, which owns the transaction boundary.
class AnalyticsRepository:
    def __init__(self, pool=None):
        self._pool = pool or get_pool()

    async def query(self, range: str):
        async with self._pool.acquire() as conn:
            return await conn.fetch(
                "SELECT bucket, value FROM analytics_series WHERE bucket >= $1",
                range,
            )

    async def raw_query(self, sql: str):
        async with self._pool.acquire() as conn:
            return await conn.fetch(sql)
`,

  'apps/web/src/dashboard/api.ts': `import { apiClient } from '../lib/apiClient'
import type { AnalyticsSeries } from '../types/analytics'

// The compliant path: the dashboard calls the API, never the database.
// This is what remediation restores.
export async function fetchSeries(range: string): Promise<AnalyticsSeries> {
  const res = await apiClient.get(\`/v1/analytics/series?range=\${range}\`)
  if (!res.ok) throw new Error(\`analytics series failed: \${res.status}\`)
  return res.json()
}

export async function fetchTotals() {
  const res = await apiClient.get('/v1/analytics/totals')
  return res.json()
}
`,

  'apps/api/services/notifications.py': `from apps.api.events.bus import EventBus
from apps.api.repositories.notifications import NotificationRepository
from apps.api.gateway.ws import WebSocketGateway
from apps.api.contracts import NotificationEvent

bus = EventBus()
repo = NotificationRepository()
gateway = WebSocketGateway()


# Already owns fan-out delivery. A second NotificationService (or a new
# socket server) would duplicate this, which is ARCH-004.
class NotificationService:
    async def notify(self, user_id: str, payload: dict) -> NotificationEvent:
        event = NotificationEvent(
            schema_version=3,
            user_id=user_id,
            channel="in_app",
            **payload,
        )
        await repo.insert(event)
        await bus.publish(event)
        return event

    async def register_channel(self, name: str) -> None:
        # Transport stays owned by the platform gateway (ADR-021).
        await gateway.register_channel(name)
`,

  'apps/api/gateway/ws.py': `"""WebSocketGateway - sole owner of live channels (ADR-021)."""
from apps.api.events.bus import EventBus

bus = EventBus()


class WebSocketGateway:
    """Terminates every socket. Feature services publish; they never listen."""

    def __init__(self) -> None:
        self._channels: dict[str, set] = {}
        bus.subscribe("NotificationEvent", self._fan_out)

    async def register_channel(self, name: str) -> None:
        self._channels.setdefault(name, set())

    async def _fan_out(self, event) -> None:
        for socket in self._channels.get(event.channel, ()):
            await socket.send(event.to_dict())

    async def handle_message(self, socket, raw: str) -> None:
        # Auth refresh and backpressure are handled here, once.
        await self.authenticate(socket)
        await self.enqueue(raw)
`,

  'apps/api/services/auth.py': `from apps.api.repositories.users import UserRepository
from contracts.auth.session import SessionToken, verify_token

repo = UserRepository()
SCOPES = {"admin", "billing", "support"}


async def verify_token(raw: str) -> SessionToken:
    # Single enforcement point for every authenticated route. Removing or
    # bypassing this is the ARCH-006 violation the gate blocks.
    token = decode(raw)
    if token.expired:
        raise Unauthenticated()
    return token


async def require_scope(token: SessionToken, scope: str) -> None:
    if scope not in SCOPES:
        raise Forbidden()
    if scope not in token.scopes:
        raise Forbidden()


async def issue_session(user_id: str, provider: str) -> SessionToken:
    # Adding a provider must not change the SessionToken shape: six clients
    # (web, two mobile apps, CLI) depend on v2.
    return SessionToken(subject=user_id, scopes=["admin"], provider=provider)
`,

  'apps/api/routers/payments.py': `from apps.api.services.payment import PaymentService
from apps.api.services.auth import require_scope

service = PaymentService()
router = APIRouter(prefix="/v1/payments")


@router.post("/refunds")
async def create_refund(payload: RefundRequest, token = Depends(current_token)):
    await require_scope(token, "billing")   # <-- proposed removal
    return await service.refund(payload.payment_id, payload.amount)


@router.post("/invoices")
async def create_invoice(payload: InvoiceRequest, token = Depends(current_token)):
    # Requested change: "skip the authorization check for internal requests".
    # Removing require_scope here makes the route reachable by any valid token.
    return await service.invoice(payload)
`,

  'apps/web/src/config.ts': `export const config = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL,
  // Requested change: hold the Stripe key in the frontend so checkout can call
  // Stripe directly. Rule ARCH-006 forbids credentials in a client bundle.
  STRIPE_API_KEY: process.env.NEXT_PUBLIC_STRIPE_KEY,
  featureFlags: { savedFilters: false },
}
`,

  'apps/api/services/payment/StripeAdapter.py': `"""Existing server-side adapter that already owns the Stripe client."""
import stripe

from apps.api.config import settings

stripe.api_key = settings.stripe_secret_key  # server-side only


class StripeAdapter:
    async def charge(self, amount: int, currency: str) -> str:
        intent = await stripe.PaymentIntent.create(
            amount=amount, currency=currency
        )
        return intent["id"]

    async def refund(self, charge_id: str) -> None:
        await stripe.Refund.create(charge=charge_id)


# Remediation for the frontend-key finding: the browser calls PaymentAPI,
# which delegates here. The credential never leaves the server.
`,

  'apps/web/package.json': `{
  "name": "@orca/web",
  "version": "4.2.0",
  "dependencies": {
    "react": "19.0.0",
    "@orca/ui": "workspace:*",
    "moment": "2.29.4",
    "node-fetch": "2.6.7"
  },
  "//": "moment and node-fetch are listed under forbidden in policies/dependencies.yaml"
}
`,

  'contracts/events/notification.avsc': `{
  "type": "record",
  "name": "NotificationEvent",
  "namespace": "com.orca.events",
  "version": "3",
  "fields": [
    { "name": "schema_version", "type": "int" },
    { "name": "user_id", "type": "string" },
    { "name": "channel", "type": "string" },
    { "name": "body", "type": "string" }
  ]
}
// 5 consumers: ws-gateway, email-worker, slack-worker, mobile-ios,
// mobile-android. Making "channel" required is a breaking change for all of
// them, so remediation adds a defaulted field and bumps only the minor version.
`,

  'contracts/openapi/analytics.yaml': `openapi: 3.1.0
info:
  title: ORCA Analytics API
  version: "2.4.0"
paths:
  /v1/analytics/series:
    get:
      operationId: getAnalyticsSeries
      responses:
        "200":
          description: Analytics series
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AnalyticsSeries"
components:
  schemas:
    AnalyticsSeries:
      type: object
      required: [bucket, value]
      properties:
        bucket: { type: string, format: date-time }
        value: { type: number }
`,
}

/** Fallback: derive a readable stub from the path so no evidence link is dead. */
function stubFor(path: string): string {
  const name = path.split('/').pop() ?? path
  const line = `// ${path}`
  if (/\.ya?ml$/.test(path)) {
    return `# ${path}\n# Parsed by the repository index; policy evidence is resolved at analysis time.\nversion: "1.0"\n`
  }
  if (/\.json$/.test(path)) {
    return `// ${path}\n{\n  "$comment": "Indexed configuration; values redacted for the evidence view.",\n  "source": "${path}"\n}\n`
  }
  if (/\.md$/.test(path)) {
    return `# ${name.replace(/\.md$/, '')}\n\n> ${path}\n\nStatus, decision, rationale and rejected alternatives are parsed from this\nrecord by the architecture decision memory detector.\n`
  }
  if (/\.sql$/.test(path)) {
    return `-- ${path}\n-- Migration evidence. Destructive statements are detected deterministically.\nBEGIN;\n-- \nCOMMIT;\n`
  }
  if (/\.tsx?$/.test(path)) {
    return `${line}\n// Repository index recorded this module as part of the change blast radius.\nexport default function ${name.replace(/\.tsx?$/, '')}() {\n  return null\n}\n`
  }
  return `${line}\n# Indexed source. This file is inside the change blast radius but carries no\n# additional rule evidence beyond its location and ownership.\n`
}

export function fileContent(path: string): string {
  return SNIPPETS[path] ?? stubFor(path)
}

export function languageOf(path: string): string {
  if (/\.ya?ml$/.test(path)) return 'yaml'
  if (/\.tsx?$/.test(path)) return 'typescript'
  if (/\.py$/.test(path)) return 'python'
  if (/\.json$/.test(path)) return 'json'
  if (/\.sql$/.test(path)) return 'sql'
  if (/\.md$/.test(path)) return 'markdown'
  if (/\.avsc$/.test(path)) return 'json'
  return 'plaintext'
}

export const HAS_RICH_SNIPPET = (path: string) => path in SNIPPETS
