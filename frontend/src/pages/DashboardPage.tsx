import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Boxes,
  FileCode2,
  FileWarning,
  Gavel,
  HeartPulse,
  Plus,
  ScrollText,
  Timer,
  Waypoints,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/AppShell'
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { DecisionInline } from '@/components/DecisionBanner'
import { EmptyState, Skeleton } from '@/components/ui/Feedback'
import { StatusBadge } from '@/components/ui/Badge'
import { useApp } from '@/store/store'
import { api } from '@/services/api'
import { relativeTime } from '@/lib/format'
import { decisionTone } from '@/lib/status'
import type { Adr, ArchitectureRule, Contract, Decision, DependencyRecord, Relationship } from '@/types'
import { cn } from '@/lib/cn'

export default function DashboardPage() {
  const { project, projectLoading, requests, requestsLoading } = useApp()
  const navigate = useNavigate()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [rules, setRules] = useState<ArchitectureRule[]>([])
  const [adrs, setAdrs] = useState<Adr[]>([])
  const [deps, setDeps] = useState<DependencyRecord[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [c, r, a, d, g] = await Promise.all([
        api.getContracts(),
        api.getRules(),
        api.getAdrs(),
        api.getDependencies(),
        api.getGraph(),
      ])
      if (!alive) return
      setContracts(c)
      setRules(r)
      setAdrs(a)
      setDeps(d)
      setRelationships(g.relationships)
      setLoaded(true)
    })()
    return () => {
      alive = false
    }
  }, [])

  const distribution = useMemo(() => {
    const counts: Record<Decision, number> = { BLOCKED: 0, REVIEW_REQUIRED: 0, CLEARED: 0 }
    for (const r of requests) {
      if (r.decision) counts[r.decision]++
    }
    return counts
  }, [requests])

  const violations = relationships.filter((r) => !r.allowed)
  const deprecatedDeps = deps.filter((d) => d.deprecated)
  const policyDeps = deps.filter((d) => d.policy !== 'allowed')

  const health = useMemo(() => {
    // Architecture health is derived, not asserted: a violated edge in the
    // indexed graph is drift, whatever the dashboard would like to say.
    if (violations.length === 0) return { label: 'Healthy', tone: 'pass' as const }
    if (violations.length <= 2) return { label: `${violations.length} deviations`, tone: 'review' as const }
    return { label: `${violations.length} deviations`, tone: 'block' as const }
  }, [violations.length])

  return (
    <>
      <PageHeader
        eyebrow="Repository · ORCA"
        title="Pre-flight control"
        description="Every change is analysed against the indexed repository before an agent is allowed to write code."
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => navigate('/changes/new')}>
            New pre-flight
          </Button>
        }
      />

      {/* ------------------------------------------------------- Stat grid */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<HeartPulse className="size-4" />}
          label="Architecture"
          value={projectLoading ? null : health.label}
          tone={health.tone}
          hint={projectLoading ? undefined : `${violations.length} rule violations in the indexed graph`}
          to="/architecture"
        />
        <StatCard
          icon={<FileCode2 className="size-4" />}
          label="Contracts discovered"
          value={loaded ? contracts.length : null}
          hint={loaded ? `${contracts.filter((c) => c.breaking).length} breaking-capable · ${contracts.filter((c) => c.isPublic).length} public` : undefined}
        />
        <StatCard
          icon={<Boxes className="size-4" />}
          label="Dependencies"
          value={loaded ? deps.length : null}
          hint={loaded ? `${deprecatedDeps.length} deprecated · ${policyDeps.length} policy-restricted` : undefined}
          tone={loaded && deprecatedDeps.length > 0 ? 'review' : undefined}
        />
        <StatCard
          icon={<Gavel className="size-4" />}
          label="Architecture rules"
          value={loaded ? rules.length : null}
          hint={loaded ? `${rules.filter((r) => r.enforcement === 'block').length} enforced as blocking` : undefined}
          to="/policies"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* -------------------------------------------------- Recent runs */}
        <Panel className="lg:col-span-2" flush>
          <PanelHeader
            eyebrow="Recent changes"
            title={`${requests.length} pre-flight runs`}
            description="Newest first. Every decision keeps its evidence and remediation plan."
            action={
              <Link to="/changes" className="text-xs text-accent hover:underline">
                View all
              </Link>
            }
          />
          {requestsLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <EmptyState
              icon={<FileWarning className="size-6" />}
              title="No pre-flight runs yet"
              description="Describe a change to run the first analysis."
              action={
                <Button variant="primary" size="sm" onClick={() => navigate('/changes/new')}>
                  Describe a change
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {requests.slice(0, 6).map((r) => (
                <li key={r.id}>
                  <Link
                    to={r.runId ? `/runs/${r.runId}` : '/changes'}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-raised/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-fg">{r.description}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-subtle">
                        <span>{r.branch}</span>
                        <span>{r.id}</span>
                        <span>{relativeTime(r.createdAt)}</span>
                        {r.risk.level !== 'LOW' ? <span className="text-review">risk {r.risk.level}</span> : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <StatusBadge status={r.status} />
                      {r.decision ? <DecisionInline decision={r.decision} /> : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* --------------------------------------------------- Gate health */}
        <div className="space-y-4">
          <Panel>
            <PanelHeader eyebrow="Gate outcomes" title="Decision distribution" />
            <PanelBody className="space-y-3">
              {(['BLOCKED', 'REVIEW_REQUIRED', 'CLEARED'] as Decision[]).map((d) => {
                const tone = decisionTone[d]
                const total = Math.max(1, requests.length)
                return (
                  <div key={d}>
                    <div className="flex items-baseline justify-between">
                      <span className={cn('text-xs font-medium', tone.text)}>{tone.label}</span>
                      <span className="tabular font-mono text-[11px] text-muted">{distribution[d]}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full transition-[width] duration-700"
                        style={{ width: `${(distribution[d] / total) * 100}%`, backgroundColor: tone.hex }}
                      />
                    </div>
                  </div>
                )
              })}
            </PanelBody>
            <PanelFooter className="justify-between text-[11px] text-subtle">
              <span>Target: 0 deprecated adoptions</span>
              <Link to="/metrics" className="text-accent hover:underline">
                Benchmark
              </Link>
            </PanelFooter>
          </Panel>

          <Panel>
            <PanelHeader eyebrow="Repository index" title="Graph coverage" />
            <PanelBody>
              <dl className="space-y-2 text-xs">
                {[
                  { label: 'Files indexed', value: project?.index.files },
                  { label: 'Modules', value: project?.index.modules },
                  { label: 'Symbols', value: project?.index.symbols },
                  { label: 'Relationships', value: project?.index.relationships },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <dt className="text-subtle">{row.label}</dt>
                    <dd className="tabular font-mono text-muted">
                      {projectLoading ? '—' : row.value?.toLocaleString()}
                    </dd>
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <dt className="text-subtle">Last indexed</dt>
                  <dd className="flex items-center gap-1.5 text-muted">
                    {projectLoading ? '—' : relativeTime(project!.lastIndexedAt)}
                    <span
                      className="size-1.5 rounded-full bg-pass"
                      title={project?.index.status}
                      aria-label={project?.index.status}
                    />
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-subtle">Index duration</dt>
                  <dd className="tabular font-mono text-muted">{project?.index.durationSeconds}s</dd>
                </div>
              </dl>
            </PanelBody>
          </Panel>
        </div>
      </div>

      {/* ------------------------------------------------------ Entry points */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <EntryCard
          icon={<Waypoints className="size-4" />}
          title="Architecture graph"
          body="Trace Dashboard → API → Service → Repository and inspect any node's dependents, contracts and owners."
          to="/architecture"
        />
        <EntryCard
          icon={<ScrollText className="size-4" />}
          title="Decision records"
          body={`${adrs.length} accepted ADRs are checked against every proposal, so old decisions cannot be silently reversed.`}
          to="/decisions"
        />
        <EntryCard
          icon={<Gavel className="size-4" />}
          title="Architecture-as-code"
          body="Layer permissions, forbidden edges and dependency policy, with the exact expression each rule enforces."
          to="/policies"
        />
        <EntryCard
          icon={<Timer className="size-4" />}
          title="Performance"
          body="Index, analysis and simple-change timings against the targets in the PRD."
          to="/metrics"
        />
      </div>
    </>
  )
}

type Tone = 'pass' | 'review' | 'block' | undefined

function StatCard({
  icon,
  label,
  value,
  hint,
  tone,
  to,
}: {
  icon: React.ReactNode
  label: string
  value: number | string | null
  hint?: string
  tone?: Tone
  to?: string
}) {
  const colour =
    tone === 'pass' ? 'text-pass' : tone === 'review' ? 'text-review' : tone === 'block' ? 'text-block' : 'text-fg'
  const body = (
    <div className="panel h-full p-4 transition-colors hover:border-line-strong">
      <div className="flex items-center justify-between">
        <p className="eyebrow">{label}</p>
        <span className="text-subtle">{icon}</span>
      </div>
      <div className={cn('tabular mt-2 text-2xl font-semibold leading-none', value === null ? 'text-subtle' : colour)}>
        {value === null ? <Skeleton className="h-6 w-16" /> : value}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-subtle">{hint ?? ' '}</p>
    </div>
  )
  return to ? (
    <Link to={to} className="block">
      {body}
    </Link>
  ) : (
    body
  )
}

function EntryCard({ icon, title, body, to }: { icon: React.ReactNode; title: string; body: string; to: string }) {
  return (
    <Link
      to={to}
      className="panel group flex flex-col gap-2 p-4 transition-colors hover:border-accent/40"
    >
      <div className="flex items-center gap-2 text-accent">
        {icon}
        <p className="text-sm font-medium text-fg">{title}</p>
        <ArrowRight className="ml-auto size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <p className="text-xs leading-relaxed text-subtle">{body}</p>
    </Link>
  )
}
