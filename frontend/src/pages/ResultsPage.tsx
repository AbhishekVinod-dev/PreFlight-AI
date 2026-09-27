import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ClipboardList,
  FileWarning,
  ListChecks,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Siren,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/AppShell'
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { EmptyState, Skeleton } from '@/components/ui/Feedback'
import { Chip } from '@/components/ui/Badge'
import { DecisionBanner } from '@/components/DecisionBanner'
import { DimensionStrip } from '@/components/DimensionStrip'
import { RiskPanel } from '@/components/RiskPanel'
import { AgentTimeline } from '@/components/AgentTimeline'
import { FindingCard, TrustLegend } from '@/components/FindingCard'
import { api } from '@/services/api'
import { useApp } from '@/store/store'
import { absoluteTime, countLabel, relativeTime } from '@/lib/format'
import type { ChangeRequest, Finding, PreflightRun } from '@/types'

/**
 * 9.11 Results.
 *
 * Order matters here: verdict first, then the reasons, then the raw findings.
 * A reader who stops after the banner should still know what to do next, which
 * is why the next action is wired into the banner itself.
 */
export default function ResultsPage() {
  const { runId = '' } = useParams()
  const navigate = useNavigate()
  const { requests, refreshRequests, notify } = useApp()
  const [run, setRun] = useState<PreflightRun>()
  const [findings, setFindings] = useState<Finding[]>([])
  const [request, setRequest] = useState<ChangeRequest>()
  const [error, setError] = useState<string>()
  const [overriding, setOverriding] = useState(false)

  useEffect(() => {
    let alive = true
    setRun(undefined)
    setFindings([])
    setError(undefined)
    ;(async () => {
      try {
        const res = await api.getRun(runId)
        if (!alive) return
        setRun(res.run)
        setFindings(res.findings)
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Run not found.')
      }
    })()
    return () => {
      alive = false
    }
  }, [runId])

  useEffect(() => {
    const cr = requests.find((r) => r.id === run?.changeRequestId)
    if (cr) setRequest(cr)
  }, [requests, run?.changeRequestId])

  if (error) {
    return (
      <>
        <PageHeader eyebrow="Pre-flight" title="Run unavailable" />
        <Panel>
          <EmptyState
            icon={<Siren className="size-6 text-block" />}
            title={error}
            description="The run may have been created in another session."
            action={
              <Button variant="primary" size="sm" onClick={() => navigate('/changes')}>
                Back to change requests
              </Button>
            }
          />
        </Panel>
      </>
    )
  }

  if (!run) {
    return (
      <>
        <PageHeader eyebrow="Pre-flight" title="Loading decision…" />
        <div className="space-y-4">
          <Skeleton className="h-48" />
          <div className="grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-96 lg:col-span-2" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </>
    )
  }

  const decision = run.decision ?? 'REVIEW_REQUIRED'
  const blocking = findings.filter((f) => f.blocking)
  const topFinding = blocking[0] ?? findings[0]
  const canOverride = decision !== 'CLEARED'

  const override = async () => {
    setOverriding(true)
    try {
      await api.override(run.changeRequestId, `Manual override of ${run.id}`)
      await refreshRequests()
      notify({
        title: 'Override recorded',
        detail: 'The block is bypassed and the decision is attributed to you in the audit trail.',
        tone: 'review',
      })
    } finally {
      setOverriding(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={`Run ${run.id} · ${absoluteTime(run.startedAt)}`}
        title={request?.description ?? 'Pre-flight result'}
        description={
          request?.branch ? (
            <span className="font-mono text-xs">{request.branch}</span>
          ) : (
            'Analysis completed against the indexed default branch.'
          )
        }
        actions={
          <Button variant="secondary" icon={<RotateCcw className="size-3.5" />} onClick={() => navigate('/changes')}>
            All change requests
          </Button>
        }
      />

      <div className="space-y-4">
        <DecisionBanner
          run={run}
          changeLabel={request?.description}
          actions={
            <>
              <Link to={`/runs/${run.id}/findings`}>
                <Button size="sm" variant="secondary" icon={<FileWarning className="size-3.5" />}>
                  {countLabel(findings.length, 'finding')}
                </Button>
              </Link>
              <Link to={`/runs/${run.id}/remediation`}>
                <Button
                  size="sm"
                  variant={decision === 'CLEARED' ? 'secondary' : 'primary'}
                  icon={<ClipboardList className="size-3.5" />}
                >
                  {decision === 'CLEARED' ? 'Review plan' : 'Remediate'}
                </Button>
              </Link>
            </>
          }
        />

        {/* Quick answer: what is the single most important reason? */}
        {topFinding ? (
          <Panel className="border-l-2 border-l-accent">
            <PanelBody>
              <div className="flex flex-wrap items-start gap-4">
                <ShieldAlert className="mt-0.5 size-4 shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <p className="eyebrow">Primary reason</p>
                  <p className="mt-1 text-sm font-medium text-fg">{topFinding.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{topFinding.explanation}</p>
                </div>
                <Link to={`/runs/${run.id}/findings?finding=${topFinding.id}`}>
                  <Button size="sm" variant="secondary">
                    Open evidence
                  </Button>
                </Link>
              </div>
            </PanelBody>
          </Panel>
        ) : (
          <Panel>
            <PanelBody>
              <EmptyState
                icon={<ShieldCheck className="size-6 text-pass" />}
                title="No findings raised"
                description="Every dimension inspected the change and found nothing that violates an enforced rule."
              />
            </PanelBody>
          </Panel>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Panel flush>
              <div className="border-b border-line px-4">
                <Tabs
                  items={[
                    { to: `/runs/${run.id}`, label: 'Dimensions', icon: <ListChecks className="size-3.5" />, end: true },
                    {
                      to: `/runs/${run.id}/findings`,
                      label: 'Findings',
                      icon: <FileWarning className="size-3.5" />,
                      count: findings.length,
                    },
                    {
                      to: `/runs/${run.id}/remediation`,
                      label: 'Remediation',
                      icon: <ClipboardList className="size-3.5" />,
                    },
                    {
                      to: `/runs/${run.id}/postflight`,
                      label: 'Post-flight',
                      icon: <ShieldCheck className="size-3.5" />,
                    },
                  ]}
                />
              </div>
              <PanelHeader
                eyebrow="9.11 · Per-dimension rollup"
                title="What each agent concluded"
                description="Six explorer agents, each answering one dimension with its own evidence."
              />
              <DimensionStrip run={run} findings={findings} />
            </Panel>

            <Panel flush>
              <TrustLegend />
              <PanelHeader
                title={`${findings.length} finding${findings.length === 1 ? '' : 's'}`}
                description="Ranked blocking first, then severity. Every one links to its evidence."
                action={
                  <Link
                    to={`/runs/${run.id}/findings`}
                    className="text-xs text-accent hover:underline"
                  >
                    Full explorer
                  </Link>
                }
              />
              {findings.length === 0 ? (
                <EmptyState
                  icon={<ShieldCheck className="size-6 text-pass" />}
                  title="Nothing to remediate"
                  description="The gate found no violations, no unverified dependencies and no decision conflicts."
                />
              ) : (
                <ul className="max-h-[32rem] divide-y divide-line overflow-y-auto">
                  {findings.slice(0, 8).map((f) => (
                    <li key={f.id}>
                      <FindingCard finding={f} runId={run.id} />
                    </li>
                  ))}
                </ul>
              )}
              {findings.length > 8 ? (
                <PanelFooter>
                  <Link
                    to={`/runs/${run.id}/findings`}
                    className="text-xs text-accent hover:underline"
                  >
                    {countLabel(findings.length - 8, 'more finding')} →
                  </Link>
                </PanelFooter>
              ) : null}
            </Panel>
          </div>

          <div className="space-y-4">
            <RiskPanel risk={run.risk} />

            <Panel flush>
              <PanelHeader
                eyebrow="Audit trail"
                title="Run record"
                description="Everything needed to reconstruct why this decision was made."
              />
              <PanelBody>
                <dl className="space-y-2 text-xs">
                  {[
                    { label: 'Started', value: relativeTime(run.startedAt) },
                    { label: 'Stage', value: run.stage },
                    { label: 'Decision', value: decision.replace('_', ' ') },
                    { label: 'Blocking', value: String(run.blockingCount) },
                    { label: 'Warnings', value: String(run.warningCount) },
                    { label: 'Needs human', value: String(run.reviewCount) },
                    { label: 'Files read', value: run.affectedFileCount.toLocaleString() },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-3">
                      <dt className="text-subtle">{row.label}</dt>
                      <dd className="truncate font-mono text-muted">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </PanelBody>
            </Panel>

            <Panel flush>
              <PanelHeader
                eyebrow="10 · Orchestrator"
                title="Agent transcript"
                description="Expand a step to read what that subagent actually did."
              />
              <AgentTimeline agents={run.agents} stage={run.stage} />
            </Panel>

            {canOverride ? (
              <Panel className="border-review/30">
                <PanelHeader
                  eyebrow="Escape hatch"
                  title="Override the gate"
                  description="Available when the engine is wrong. Recorded against your name in the audit trail."
                />
                <PanelBody className="space-y-3">
                  <p className="text-xs leading-relaxed text-muted">
                    Overrides do not delete findings. The decision stays BLOCKED in the history and a
                    parallel <Chip>OVERRIDDEN</Chip> entry records who accepted the risk.
                  </p>
                  <Button
                    variant="danger"
                    size="sm"
                    className="w-full"
                    loading={overriding}
                    onClick={override}
                  >
                    Override and continue
                  </Button>
                </PanelBody>
              </Panel>
            ) : null}
          </div>
        </div>
      </div>
    </>
  )
}
