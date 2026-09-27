import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { GitPullRequestArrow, Plus, Search, ShieldAlert, Timer } from 'lucide-react'
import { PageHeader } from '@/components/layout/AppShell'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { Chip, DecisionBadge, RiskBadge, StatusBadge } from '@/components/ui/Badge'
import { EmptyState, Skeleton } from '@/components/ui/Feedback'
import { useApp } from '@/store/store'
import { cn } from '@/lib/cn'
import { countLabel, relativeTime } from '@/lib/format'
import { decisionTone } from '@/lib/status'
import type { ChangeRequest, Decision } from '@/types'

type Filter = 'all' | Decision

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'BLOCKED', label: 'Blocked' },
  { key: 'REVIEW_REQUIRED', label: 'Review' },
  { key: 'CLEARED', label: 'Cleared' },
]

/**
 * 16 Change history.
 *
 * Every gate decision ever made on this repository, with enough context to
 * decide whether an old BLOCKED verdict is still the right call. The value here
 * is auditability, not a pretty list.
 */
export default function ChangesPage() {
  const { requests, requestsLoading, refreshRequests } = useApp()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    void refreshRequests()
  }, [refreshRequests])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return requests.filter((r) => {
      if (filter !== 'all' && r.decision !== filter) return false
      if (!q) return true
      return (
        r.description.toLowerCase().includes(q) ||
        r.branch?.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      )
    })
  }, [requests, query, filter])

  const counts = useMemo(() => {
    const c: Record<Decision, number> = { BLOCKED: 0, REVIEW_REQUIRED: 0, CLEARED: 0 }
    for (const r of requests) if (r.decision) c[r.decision]++
    return c
  }, [requests])

  return (
    <>
      <PageHeader
        eyebrow="16 · Change history"
        title="Pre-flight decisions"
        description="Every change that was analysed against this repository, with its verdict, risk score and full evidence trail."
        actions={
          <Link to="/changes/new">
            <Button variant="primary" icon={<Plus className="size-4" />}>
              New pre-flight
            </Button>
          </Link>
        }
      />

      {/* --------------------------------------------------- Summary row */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile label="Total runs" value={requests.length} />
        {(['BLOCKED', 'REVIEW_REQUIRED', 'CLEARED'] as Decision[]).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setFilter(filter === d ? 'all' : d)}
            className={cn(
              'panel flex items-center justify-between p-4 text-left transition-colors hover:border-line-strong',
              filter === d && 'border-accent/50',
            )}
          >
            <div>
              <p className={cn('eyebrow', decisionTone[d].text)}>{decisionTone[d].label}</p>
              <p className="tabular mt-1.5 text-2xl font-semibold leading-none text-fg">{counts[d]}</p>
            </div>
            <DecisionBadge decision={d} />
          </button>
        ))}
      </div>

      <Panel flush>
        <PanelHeader
          eyebrow="Filter"
          title={countLabel(filtered.length, 'change request')}
          description="Search descriptions, branches and ids."
          action={
            <div className="relative w-56">
              <Search className="pointer-events-none absolute left-2.5 top-2 size-3.5 text-subtle" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search changes…"
                className="w-full rounded-md border border-line-strong bg-canvas/60 py-1.5 pl-7 pr-2 text-xs text-fg placeholder:text-subtle/70 focus:border-accent/60 focus:outline-none"
              />
            </div>
          }
        />

        <div className="flex items-center gap-1 border-b border-line px-4 py-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                'rounded px-2 py-1 text-[11px] font-medium transition-colors',
                filter === f.key ? 'bg-raised text-fg' : 'text-subtle hover:text-muted',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {requestsLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<GitPullRequestArrow className="size-6" />}
            title={requests.length === 0 ? 'No change requests yet' : 'No matches'}
            description={
              requests.length === 0
                ? 'Describe a change to run the first pre-flight analysis.'
                : 'Try a different search term or reset the decision filter.'
            }
            action={
              requests.length === 0 ? (
                <Link to="/changes/new">
                  <Button size="sm" variant="primary">
                    Describe a change
                  </Button>
                </Link>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setQuery('')
                    setFilter('all')
                  }}
                >
                  Reset filters
                </Button>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map((r) => (
              <li key={r.id}>
                <RequestRow request={r} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  )
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel p-4">
      <p className="eyebrow">{label}</p>
      <p className="tabular mt-1.5 text-2xl font-semibold leading-none text-fg">{value}</p>
    </div>
  )
}

function RequestRow({ request }: { request: ChangeRequest }) {
  const target = request.runId ? `/runs/${request.runId}` : '/changes'
  const domains = request.proposal.affectedDomains

  return (
    <Link
      to={target}
      className="flex flex-wrap items-start gap-4 px-4 py-3 transition-colors hover:bg-raised/40"
    >
      {/* Decision stripe */}
      <span
        aria-hidden
        className="mt-1 h-10 w-0.5 shrink-0 rounded-full"
        style={{
          backgroundColor: request.decision ? decisionTone[request.decision].hex : '#2a3949',
        }}
      />

      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-fg">{request.description}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-subtle">
          <span>{request.branch ?? 'no branch'}</span>
          <span>{request.id}</span>
          <span className="inline-flex items-center gap-1">
            <Timer className="size-3" />
            {relativeTime(request.createdAt)}
          </span>
          {request.runId ? <span>{request.runId}</span> : null}
        </div>
        {domains.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {domains.slice(0, 6).map((d) => (
              <Chip key={d}>{d}</Chip>
            ))}
            {domains.length > 6 ? <Chip>+{domains.length - 6}</Chip> : null}
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <div className="flex items-center gap-1.5">
          <StatusBadge status={request.status} />
          {request.risk.level !== 'LOW' ? <RiskBadge level={request.risk.level} /> : null}
        </div>
        {request.decision ? <DecisionBadge decision={request.decision} /> : <ShieldAlert className="size-3.5 text-subtle" />}
        {request.proposal.clarifications && request.proposal.clarifications.length > 0 ? (
          <span className="text-[10px] text-subtle">
            {countLabel(request.proposal.clarifications.length, 'clarification')}
          </span>
        ) : null}
      </div>
    </Link>
  )
}
