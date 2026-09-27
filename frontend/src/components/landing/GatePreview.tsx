import { Ban, FileCode2, GitBranch, ShieldAlert, Terminal, Waypoints, Boxes } from 'lucide-react'
import { cn } from '@/lib/cn'
import { decisionTone, dimensionTone } from '@/lib/status'
import type { DimensionStatus } from '@/types'
import { PROJECT } from '@/data/repository'

interface Row {
  label: string
  icon: React.ElementType
  status: DimensionStatus
  summary: string
}

const ROWS: Row[] = [
  { label: 'Architecture', icon: Waypoints,   status: 'block',  summary: 'frontend -/-> database violates ARCH-001' },
  { label: 'Contracts',    icon: FileCode2,   status: 'pass',   summary: 'AnalyticsQuery is untouched by this change' },
  { label: 'Dependencies', icon: Boxes,       status: 'block',  summary: 'pg in a client bundle requires approval' },
  { label: 'Impact',       icon: GitBranch,   status: 'review', summary: '17 files · 2 services · 1 table · 5 consumers' },
  { label: 'Security',     icon: ShieldAlert, status: 'block',  summary: 'NEXT_PUBLIC_DATABASE_URL ships the credential' },
]

const EVIDENCE = [
  { k: 'Rule',       v: 'ARCH-001 · frontend -/-> database' },
  { k: 'Location',   v: 'apps/web/src/dashboard/db-client.ts:4' },
  { k: 'Basis',      v: 'Deterministic' },
  { k: 'Confidence', v: '94%' },
]

const REMEDIATION = [
  'Remove the client-side pool from the dashboard bundle',
  'Add the missing range filter to GET /v1/analytics/series',
  'Route the dashboard through apps/web/src/dashboard/api.ts',
  'Add a contract test for AnalyticsQuery, then run tests',
]

export function GatePreview({ className }: { className?: string }) {
  void decisionTone.BLOCKED

  return (
    <div className={cn('relative', className)}>
      {/* Soft glow behind the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 -z-10 rounded-3xl opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(ellipse at 60% 40%, #4f46e5 0%, transparent 70%)' }}
      />

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-200/80">

        {/* ── Title bar ── */}
        <div className="flex items-center gap-2.5 border-b border-gray-100 bg-gray-50 px-4 py-3">
          {/* Traffic-light dots */}
          <span className="flex gap-1.5">
            <span className="size-3 rounded-full bg-red-400" />
            <span className="size-3 rounded-full bg-amber-400" />
            <span className="size-3 rounded-full bg-indigo-400" />
          </span>
          <span className="flex items-center gap-1.5 pl-1">
            <Terminal className="size-3.5 text-gray-400" />
            <p className="font-mono text-[11px] text-gray-400">
              {PROJECT.name.toLowerCase()}@{PROJECT.defaultBranch}
            </p>
          </span>
          <span className="ml-auto rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-rose-600">
            pre-flight
          </span>
        </div>

        {/* ── Change under review ── */}
        <div className="border-b border-gray-100 px-5 py-4">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Change under review
          </p>
          <p className="text-[14px] font-semibold leading-snug text-gray-900">
            "Connect the dashboard directly to PostgreSQL for faster analytics."
          </p>
          <span className="mt-2 inline-block rounded-md bg-gray-100 px-2 py-0.5 font-mono text-[10px] text-gray-500">
            feat/dashboard-direct-db
          </span>
        </div>

        {/* ── Check rows ── */}
        <ul className="divide-y divide-gray-100">
          {ROWS.map((row, i) => {
            const t = dimensionTone[row.status]
            return (
              <li
                key={row.label}
                className="flex animate-rise items-center gap-3 px-5 py-3 motion-reduce:animate-none"
                style={{ animationDelay: `${100 + i * 65}ms` }}
              >
                {/* Status icon badge */}
                <span
                  className="grid size-6 shrink-0 place-items-center rounded-lg text-[11px] font-bold"
                  style={{
                    color: t.hex,
                    backgroundColor: `color-mix(in oklab, ${t.hex} 12%, transparent)`,
                    border: `1.5px solid color-mix(in oklab, ${t.hex} 30%, transparent)`,
                  }}
                >
                  {t.glyph}
                </span>

                {/* Check name + icon */}
                <span className="flex w-28 shrink-0 items-center gap-1.5">
                  <row.icon className="size-3.5 shrink-0 text-gray-400" />
                  <span className="text-[13px] font-semibold text-gray-900">{row.label}</span>
                </span>

                {/* Summary */}
                <span className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-gray-400">
                  {row.summary}
                </span>

                {/* Verdict pill */}
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  style={{
                    color: t.hex,
                    backgroundColor: `color-mix(in oklab, ${t.hex} 10%, transparent)`,
                  }}
                >
                  {t.label}
                </span>
              </li>
            )
          })}
        </ul>

        {/* ── Verdict bar ── */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-rose-100 bg-rose-50 px-5 py-3.5">
          <span className="flex items-center gap-2">
            <Ban className="size-4 text-rose-600" />
            <span className="text-sm font-bold uppercase tracking-wide text-rose-700">
              Result: Blocked
            </span>
          </span>
          <div className="ml-auto flex gap-4 font-mono text-[11px]">
            <span className="flex items-center gap-1">
              <span className="text-gray-400">blocking</span>
              <span className="font-bold text-rose-600">3</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-gray-400">warnings</span>
              <span className="font-bold text-amber-600">1</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-gray-400">files</span>
              <span className="font-bold text-gray-700">17</span>
            </span>
          </div>
        </div>

        {/* ── Evidence + Remediation ── */}
        <div className="grid sm:grid-cols-2">
          {/* Evidence */}
          <div className="border-b border-gray-100 px-5 py-4 sm:border-b-0 sm:border-r">
            <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Evidence
            </p>
            <dl className="space-y-1.5">
              {EVIDENCE.map((e) => (
                <div key={e.k} className="flex gap-3">
                  <dt className="w-20 shrink-0 font-mono text-[10px] text-gray-400">{e.k}</dt>
                  <dd className="min-w-0 flex-1 break-words font-mono text-[10.5px] font-medium text-gray-700">
                    {e.v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Remediation */}
          <div className="px-5 py-4">
            <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Remediation
            </p>
            <ol className="space-y-2">
              {REMEDIATION.map((step, i) => (
                <li key={step} className="flex gap-2.5">
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-mono text-[9px] font-bold text-indigo-700">
                    {i + 1}
                  </span>
                  <span className="text-[11.5px] leading-relaxed text-gray-600">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

      </div>
    </div>
  )
}
