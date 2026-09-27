import{r as c,j as e}from"./reactflow-C7l_rhnD.js";import{c as S,r as J,k as Q,m as V,d as u,e as b,f as P,n as Z,o as ee,p as se,q as te,t as ne,u as ie,h as k,B as F,F as B,U as ae,s as O,v as re,w as oe,a as le,P as ce,L as D,x as H,y as de,z as pe,A as U,D as G,E as R,S as W,X as ue,H as me,C as he,I as xe,J as ye,K as fe,M as ge,N as ve}from"./index-CWTJ8dV-.js";import{w as be,F as je}from"./monaco-zcLYLuwj.js";import{S as we}from"./shield-question-Ps2QuLsJ.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ne=S("ChevronDown",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ke=S("Filter",[["polygon",{points:"22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3",key:"1yg77f"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Se=S("LayoutList",[["rect",{width:"7",height:"7",x:"3",y:"3",rx:"1",key:"1g98yp"}],["rect",{width:"7",height:"7",x:"3",y:"14",rx:"1",key:"1bb6yr"}],["path",{d:"M14 4h7",key:"3xa0d5"}],["path",{d:"M14 9h7",key:"1icrd9"}],["path",{d:"M14 15h7",key:"1mj8o2"}],["path",{d:"M14 20h7",key:"11slyb"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _e=S("Lightbulb",[["path",{d:"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5",key:"1gvzjb"}],["path",{d:"M9 18h6",key:"x1upvd"}],["path",{d:"M10 22h4",key:"ceow96"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Re=S("Link2",[["path",{d:"M9 17H7A5 5 0 0 1 7 7h2",key:"8i5ue5"}],["path",{d:"M15 7h2a5 5 0 1 1 0 10h-2",key:"1b9ql8"}],["line",{x1:"8",x2:"16",y1:"12",y2:"12",key:"1jonct"}]]),Ee={"apps/web/src/dashboard/db-client.ts":`import { Pool } from 'pg'

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
`,"apps/api/routers/analytics.py":`from fastapi import APIRouter
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
`,"apps/api/repositories/analytics.py":`from apps.api.db.pool import get_pool

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
`,"apps/web/src/dashboard/api.ts":`import { apiClient } from '../lib/apiClient'
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
`,"apps/api/services/notifications.py":`from apps.api.events.bus import EventBus
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
`,"apps/api/gateway/ws.py":`"""WebSocketGateway - sole owner of live channels (ADR-021)."""
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
`,"apps/api/services/auth.py":`from apps.api.repositories.users import UserRepository
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
`,"apps/api/routers/payments.py":`from apps.api.services.payment import PaymentService
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
`,"apps/web/src/config.ts":`export const config = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL,
  // Requested change: hold the Stripe key in the frontend so checkout can call
  // Stripe directly. Rule ARCH-006 forbids credentials in a client bundle.
  STRIPE_API_KEY: process.env.NEXT_PUBLIC_STRIPE_KEY,
  featureFlags: { savedFilters: false },
}
`,"apps/api/services/payment/StripeAdapter.py":`"""Existing server-side adapter that already owns the Stripe client."""
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
`,"apps/web/package.json":`{
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
`,"contracts/events/notification.avsc":`{
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
`,"contracts/openapi/analytics.yaml":`openapi: 3.1.0
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
`};function Ce(s){const i=s.split("/").pop()??s,o=`// ${s}`;return/\.ya?ml$/.test(s)?`# ${s}
# Parsed by the repository index; policy evidence is resolved at analysis time.
version: "1.0"
`:/\.json$/.test(s)?`// ${s}
{
  "$comment": "Indexed configuration; values redacted for the evidence view.",
  "source": "${s}"
}
`:/\.md$/.test(s)?`# ${i.replace(/\.md$/,"")}

> ${s}

Status, decision, rationale and rejected alternatives are parsed from this
record by the architecture decision memory detector.
`:/\.sql$/.test(s)?`-- ${s}
-- Migration evidence. Destructive statements are detected deterministically.
BEGIN;
-- 
COMMIT;
`:/\.tsx?$/.test(s)?`${o}
// Repository index recorded this module as part of the change blast radius.
export default function ${i.replace(/\.tsx?$/,"")}() {
  return null
}
`:`${o}
# Indexed source. This file is inside the change blast radius but carries no
# additional rule evidence beyond its location and ownership.
`}function Ae(s){return Ee[s]??Ce(s)}function Pe(s){return/\.ya?ml$/.test(s)?"yaml":/\.tsx?$/.test(s)?"typescript":/\.py$/.test(s)?"python":/\.json$/.test(s)?"json":/\.sql$/.test(s)?"sql":/\.md$/.test(s)?"markdown":/\.avsc$/.test(s)?"json":"plaintext"}function Ie({finding:s}){const[i,o]=c.useState(s.evidence[0]??{path:""}),[l,j]=c.useState(!1),a=s.ruleId?J(s.ruleId):void 0,p=s.contractId?Q(s.contractId):void 0,m=s.headline==="ARCHITECTURAL DECISION CONFLICT"?V("ADR-014"):void 0,d=c.useMemo(()=>i.path?Ae(i.path):"",[i.path]),w=i.path?Pe(i.path):"plaintext";return s.evidence.length===0?e.jsxs(u,{children:[e.jsx(b,{eyebrow:s.id,title:"No repository evidence"}),e.jsx(P,{children:e.jsx("p",{className:"text-sm leading-relaxed text-muted",children:s.explanation})})]}):e.jsxs("div",{className:"space-y-4",children:[e.jsxs(u,{children:[e.jsx(b,{eyebrow:`${s.id} · ${Z[s.category]??"Pre-Flight"}`,title:s.title,action:e.jsxs("div",{className:"flex items-center gap-1.5",children:[e.jsx(ee,{severity:s.severity}),e.jsx(se,{basis:s.basis})]})}),e.jsxs(P,{className:"space-y-4",children:[e.jsxs("div",{className:"flex flex-wrap items-center gap-2",children:[e.jsx(te,{category:s.category}),e.jsx(ne,{value:s.confidence}),e.jsxs("span",{className:k("inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",s.blocking?"border-block/40 bg-block/12 text-block":"border-line bg-raised text-muted"),children:[s.blocking?e.jsx(ie,{className:"size-3"}):null,s.blocking?"Blocking":"Non-blocking"]}),s.headline?e.jsx("span",{className:"inline-flex items-center gap-1 rounded border border-line bg-canvas px-2 py-0.5 font-mono text-[10px] uppercase text-muted",children:s.headline}):null]}),e.jsx("p",{className:"text-sm leading-relaxed text-muted",children:s.explanation}),a?e.jsxs("div",{className:"rounded-md border border-line bg-canvas/60 p-3",children:[e.jsxs("p",{className:"eyebrow",children:["Rule · ",a.id]}),e.jsx("p",{className:"mt-1 text-sm text-fg",children:a.description}),e.jsxs("p",{className:"mt-1 font-mono text-[11px] text-subtle",children:[a.expression," · ",a.enforcement," · ",a.severity]})]}):null,m?e.jsxs("div",{className:"rounded-md border border-review/40 bg-review/[0.06] p-3",children:[e.jsxs("p",{className:"eyebrow text-review",children:["Decision conflict · ",m.id]}),e.jsx("p",{className:"mt-1 text-sm text-fg",children:m.title}),e.jsx("p",{className:"mt-1 text-xs leading-relaxed text-muted",children:m.reason}),e.jsxs("p",{className:"mt-1.5 text-[11px] text-subtle",children:["Rejected alternatives: ",m.alternatives.join(", ")]})]}):null,p?e.jsxs("div",{className:"rounded-md border border-line bg-canvas/60 p-3",children:[e.jsxs("p",{className:"eyebrow",children:["Contract · ",p.type]}),e.jsxs("p",{className:"mt-1 text-sm text-fg",children:[p.name," ",e.jsxs("span",{className:"font-mono text-xs text-subtle",children:["v",p.version]})]}),e.jsxs("p",{className:"mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-subtle",children:[e.jsx("span",{className:"font-mono",children:p.source}),e.jsxs("span",{children:[p.consumers.length," consumers"]}),e.jsx("span",{children:p.isPublic?"public contract":"internal contract"})]})]}):null]})]}),e.jsxs(u,{flush:!0,children:[e.jsx(b,{eyebrow:"9.12 · Evidence explorer",title:"Source evidence",description:"Every claim above is traceable to these files. The active file opens in the editor.",action:e.jsx(F,{size:"sm",variant:"secondary",onClick:()=>j(r=>!r),children:l?"Show file":"Show as diff"})}),e.jsx("ul",{className:"max-h-40 divide-y divide-line overflow-y-auto border-b border-line",children:s.evidence.map(r=>{const x=r.path===i.path&&r.line===i.line;return e.jsx("li",{children:e.jsxs("button",{type:"button",onClick:()=>o(r),className:k("flex w-full items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-raised/60",x&&"bg-raised"),children:[e.jsx(B,{className:"size-3.5 shrink-0 text-subtle"}),e.jsx("span",{className:"truncate font-mono text-[11px] text-fg",children:r.path}),r.line?e.jsxs("span",{className:"tabular shrink-0 font-mono text-[11px] text-accent",children:[":",r.line]}):null,r.symbol?e.jsx("span",{className:"ml-auto shrink-0 truncate font-mono text-[10px] text-subtle",children:r.symbol}):null]})},`${r.path}:${r.line??0}`)})}),e.jsx("div",{className:"h-[26rem]",children:l?e.jsx(be,{height:"100%",language:w,theme:"vs-dark",original:d,modified:d,options:Y}):e.jsx(je,{height:"100%",language:w,theme:"vs-dark",value:d,onMount:(r,x)=>{i.line&&(r.revealLineInCenter(i.line),r.setPosition({lineNumber:i.line,column:1}),x.editor.setModelMarkers(r.getModel(),"preflight",[{severity:x.MarkerSeverity.Error,message:s.title,startLineNumber:i.line,endLineNumber:i.line,startColumn:1,endColumn:200}]),r.focus())},options:Y})})]}),e.jsxs("div",{className:"grid gap-4 lg:grid-cols-2",children:[e.jsx(E,{title:"Affected files",icon:e.jsx(B,{className:"size-3.5"}),items:s.affectedFiles,mono:!0,empty:"No files identified in the blast radius."}),e.jsx(E,{title:"Consumers",icon:e.jsx(ae,{className:"size-3.5"}),items:s.consumers,mono:!0,empty:"No downstream consumers resolved from the graph."}),e.jsx(E,{title:"Symbols",icon:e.jsx(Re,{className:"size-3.5"}),items:s.symbols,mono:!0,empty:"No symbol-level matches."}),e.jsx(E,{title:"Components",icon:e.jsx(we,{className:"size-3.5"}),items:s.affectedComponents,mono:!0,empty:"No component affected."})]}),e.jsxs(u,{children:[e.jsx(b,{eyebrow:"9.13 · Remediation",title:"Suggested action",action:e.jsx(_e,{className:"size-4 text-review"})}),e.jsx(P,{children:e.jsx("p",{className:"text-sm leading-relaxed text-fg",children:s.remediation})})]})]})}const Y={readOnly:!0,domReadOnly:!0,minimap:{enabled:!1},fontSize:12,lineHeight:20,scrollBeyondLastLine:!1,renderLineHighlight:"all",padding:{top:12,bottom:12},fontFamily:"'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace",fontLigatures:!0,tabSize:2};function E({title:s,icon:i,items:o,mono:l,empty:j}){const[a,p]=c.useState(!1),m=a?o:o.slice(0,6);return e.jsxs(u,{children:[e.jsx(b,{title:e.jsxs("span",{className:"flex items-center gap-2",children:[i,s,e.jsx("span",{className:"tabular rounded bg-raised px-1.5 py-px font-mono text-[10px] text-muted",children:o.length})]})}),e.jsx("div",{className:"p-2",children:o.length===0?e.jsx("p",{className:"px-2 py-3 text-xs text-subtle",children:j}):e.jsxs(e.Fragment,{children:[e.jsx("ul",{className:"space-y-0.5",children:m.map(d=>e.jsx("li",{className:k("truncate rounded px-2 py-1 text-[11px] text-muted hover:bg-raised",l&&"font-mono"),title:O(d,80),children:O(d,64)},d))}),o.length>6?e.jsxs("button",{type:"button",onClick:()=>p(d=>!d),className:"mt-1 flex w-full items-center justify-center gap-1 rounded px-2 py-1 text-[11px] text-accent hover:bg-raised",children:[e.jsx(Ne,{className:k("size-3 transition-transform",a&&"rotate-180")}),a?"Show less":`Show all ${o.length}`]}):null]})})]})}function qe(){const{runId:s=""}=re(),[i,o]=oe(),[l,j]=c.useState(),[a,p]=c.useState([]),[m,d]=c.useState(!0),[w,r]=c.useState(),x=i.get("finding"),N=i.get("dimension"),[y,T]=c.useState([]),[f,q]=c.useState([]),[g,M]=c.useState([]);c.useEffect(()=>{let t=!0;return d(!0),(async()=>{try{const n=await le.getRun(s);if(!t)return;j(n.run),p(n.findings)}catch(n){t&&r(n instanceof Error?n.message:"Run not found.")}finally{t&&d(!1)}})(),()=>{t=!1}},[s]);const z=c.useMemo(()=>{const t=new Map;for(const n of(l==null?void 0:l.dimensions)??[])for(const h of n.findingIds)t.set(h,n.dimension);return t},[l]),_=c.useMemo(()=>a.filter(t=>!(N&&z.get(t.id)!==N||y.length&&!y.includes(t.severity)||f.length&&!f.includes(t.basis)||g.length&&!g.includes(t.category))),[a,N,z,y,f,g]),v=a.find(t=>t.id===x)??_[0],I=y.length+f.length+g.length+(N?1:0),L=(t,n)=>{const h=new URLSearchParams(i);n===null?h.delete(t):h.set(t,n),o(h,{replace:!0})},$=(t,n,h)=>h(t.includes(n)?t.filter(K=>K!==n):[...t,n]),X=()=>{T([]),q([]),M([]),L("dimension",null)};return e.jsxs(e.Fragment,{children:[e.jsx(ce,{eyebrow:`Run ${s} · 9.12 Evidence explorer`,title:"Findings and evidence",description:"Every claim the gate made, and the repository lines that prove it. Select a finding to open its evidence.",actions:l?e.jsx(D,{to:`/runs/${s}/remediation`,children:e.jsx(F,{size:"sm",variant:"secondary",icon:e.jsx(H,{className:"size-3.5"}),children:"Remediation plan"})}):null}),l?e.jsx("div",{className:"mb-4 border-b border-line",children:e.jsx(de,{items:[{to:`/runs/${s}`,label:"Dimensions",icon:e.jsx(pe,{className:"size-3.5"}),end:!0},{to:`/runs/${s}/findings`,label:"Findings",icon:e.jsx(U,{className:"size-3.5"}),count:a.length},{to:`/runs/${s}/remediation`,label:"Remediation",icon:e.jsx(H,{className:"size-3.5"})},{to:`/runs/${s}/postflight`,label:"Post-flight",icon:e.jsx(G,{className:"size-3.5"})}]})}):null,w?e.jsx(u,{children:e.jsx(R,{icon:e.jsx(U,{className:"size-6 text-block"}),title:w})}):m?e.jsxs("div",{className:"grid gap-4 lg:grid-cols-2",children:[e.jsx("div",{className:"space-y-2",children:[0,1,2,3].map(t=>e.jsx(W,{className:"h-28"},t))}),e.jsx(W,{className:"h-[40rem]"})]}):a.length===0?e.jsx(u,{children:e.jsx(R,{icon:e.jsx(G,{className:"size-6 text-pass"}),title:"No findings for this run",description:"Every dimension inspected the change and found no violation, no unverified dependency and no decision conflict.",action:e.jsx(D,{to:`/runs/${s}`,children:e.jsx(F,{size:"sm",variant:"secondary",children:"Back to the decision"})})})}):e.jsxs("div",{className:"grid gap-4 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]",children:[e.jsxs("div",{className:"space-y-3",children:[e.jsxs(u,{children:[e.jsx(b,{eyebrow:"Filter",title:e.jsxs("span",{className:"flex items-center gap-2",children:[e.jsx(ke,{className:"size-3.5"}),me(_.length,"finding"),I>0?e.jsxs(he,{children:[I," active"]}):null]}),action:I>0?e.jsxs("button",{type:"button",onClick:X,className:"inline-flex items-center gap-1 text-[11px] text-subtle hover:text-fg",children:[e.jsx(ue,{className:"size-3"})," clear"]}):null}),e.jsxs(P,{className:"space-y-3",children:[l?e.jsx(C,{title:"Dimension",children:l.dimensions.filter(t=>t.dimension!=="repository"&&t.findingIds.length>0).map(t=>{const n=N===t.dimension;return e.jsx(A,{on:n,label:t.label,count:t.findingIds.length,onClick:()=>L("dimension",n?null:t.dimension)},t.dimension)})}):null,e.jsx(C,{title:"Severity",children:xe.filter(t=>a.some(n=>n.severity===t)).map(t=>e.jsx(A,{on:y.includes(t),label:t,count:a.filter(n=>n.severity===t).length,onClick:()=>$(y,t,T)},t))}),e.jsx(C,{title:"Trust basis",children:ye.filter(t=>a.some(n=>n.basis===t)).map(t=>e.jsx(A,{on:f.includes(t),label:t,count:a.filter(n=>n.basis===t).length,onClick:()=>$(f,t,q)},t))}),e.jsx(C,{title:"Category",children:[...new Set(a.map(t=>t.category))].map(t=>e.jsx(A,{on:g.includes(t),label:fe[t],count:a.filter(n=>n.category===t).length,onClick:()=>$(g,t,M)},t))})]})]}),e.jsxs(u,{flush:!0,children:[e.jsx(ge,{}),_.length===0?e.jsx(R,{icon:e.jsx(Se,{className:"size-5"}),title:"No matches",description:"Loosen a filter to see the rest of the run."}):e.jsx("ul",{className:"max-h-[42rem] divide-y divide-line overflow-y-auto",children:_.map(t=>e.jsx("li",{children:e.jsx(ve,{finding:t,runId:s,active:t.id===(v==null?void 0:v.id),onSelect:()=>L("finding",t.id)})},t.id))})]})]}),e.jsx("div",{className:"min-w-0",children:v?e.jsx(Ie,{finding:v},v.id):e.jsx(u,{children:e.jsx(R,{title:"Select a finding",description:"Evidence appears here."})})})]})]})}function C({title:s,children:i}){return e.jsxs("div",{children:[e.jsx("p",{className:"eyebrow",children:s}),e.jsx("div",{className:"mt-1.5 flex flex-wrap gap-1.5",children:i})]})}function A({on:s,label:i,count:o,onClick:l}){return e.jsxs("button",{type:"button",onClick:l,"aria-pressed":s,className:k("inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 text-[10px] font-medium capitalize transition-colors",s?"border-accent/50 bg-accent/12 text-accent":"border-line bg-raised text-muted hover:border-line-strong hover:text-fg"),children:[i,e.jsx("span",{className:"tabular font-mono text-subtle",children:o})]})}export{qe as default};
//# sourceMappingURL=FindingsPage-Dsgde9Dt.js.map
