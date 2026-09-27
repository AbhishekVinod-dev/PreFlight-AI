import { useEffect, useRef, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Cpu, Layers, Radar } from 'lucide-react'
import { PageHeader } from '@/components/layout/AppShell'
import { Panel, PanelBody, PanelHeader } from '@/components/ui/Panel'
import { Chip, RiskBadge, StatusBadge } from '@/components/ui/Badge'
import { ProgressBar, Spinner } from '@/components/ui/Feedback'
import { AgentTimeline } from '@/components/AgentTimeline'
import { DimensionStrip } from '@/components/DimensionStrip'
import { api } from '@/services/api'
import { useApp } from '@/store/store'
import { AGENT_PLAN, DECISION_AT, runProgress } from '@/engine/run'
import { duration } from '@/lib/format'
import type { ChangeRequest, PreflightRun } from '@/types'

/**
 * 9.11 / PRD 16 "Analysis screen".
 *
 * The gate is deliberately transparent while it runs: which agent is active,
 * what it read, and how far along the decision is. A black-box spinner is the
 * fastest way to lose a developer's trust in a tool that is allowed to block them.
 */
export default function AnalysisPage() {
  const { changeRequestId = '' } = useParams()
  const { requests, refreshRequests, notify } = useApp()
  const [request, setRequest] = useState<ChangeRequest>()
  const [run, setRun] = useState<PreflightRun>()
  const [elapsed, setElapsed] = useState(0)
  const started = useRef(false)

  // The store already holds the list, so the header can render immediately
  // while the run streams in behind it.
  useEffect(() => {
    const known = requests.find((r) => r.id === changeRequestId)
    if (known) setRequest(known)
  }, [requests, changeRequestId])

  useEffect(() => {
    if (started.current) return
    started.current = true
    let alive = true

    ;(async () => {
      const { run: finished } = await api.runPreflight(changeRequestId, (snapshot, ms) => {
        if (!alive) return
        setRun(snapshot)
        setElapsed(ms)
      })
      if (!alive) return
      setRun(finished)
      await refreshRequests()
      notify({
        title: `Run complete · ${finished.decision?.replace('_', ' ') ?? 'decided'}`,
        detail: `${finished.blockingCount} blocking · ${finished.warningCount} warnings · ${finished.affectedFileCount} files`,
        tone:
          finished.decision === 'CLEARED' ? 'pass' : finished.decision === 'BLOCKED' ? 'block' : 'review',
      })
    })()

    return () => {
      alive = false
    }
  }, [changeRequestId, refreshRequests, notify])

  if (!run) {
    return (
      <>
        <PageHeader eyebrow="Pre-flight" title={request?.description ?? 'Analysing change'} />
        <Panel>
          <PanelBody>
            <div className="grid min-h-[40vh] place-items-center gap-3">
              <Spinner className="size-5" />
              <p className="text-sm text-muted">Preparing the run…</p>
            </div>
          </PanelBody>
        </Panel>
      </>
    )
  }

  // The decision is on its own screen; hand off as soon as it exists.
  if (run.stage === 'decided') return <Navigate to={`/runs/${run.id}`} replace />

  const progress = runProgress(elapsed)
  const activeIndex = run.agents.findIndex((a) => a.status === 'running')
  const current = activeIndex >= 0 ? AGENT_PLAN[activeIndex] : undefined

  return (
    <>
      <PageHeader
        eyebrow={`Run ${run.id} · ${request?.branch ?? 'working tree'}`}
        title={request?.description ?? 'Analysing change'}
        description="The orchestrator has read the repository and spawned the explorer subagents. Nothing is written or changed during this phase."
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Panel>
            <PanelHeader
              eyebrow="Orchestrator"
              title={STAGE_LABEL[run.stage]}
              description={current ? `${current.label} · ${current.agent}` : 'All agents have returned.'}
              action={
                <div className="flex items-center gap-2">
                  <span className="tabular font-mono text-[11px] text-muted">
                    {(elapsed / 1000).toFixed(1)}s
                  </span>
                  <StatusBadge status="analyzing" />
                </div>
              }
            />
            <div className="px-4 pt-3">
              <ProgressBar value={progress} status="pending" height={6} label="Pre-flight progress" />
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-subtle">
                <span>{Math.round(progress * 100)}% complete</span>
                <span className="tabular font-mono">
                  {run.agents.filter((a) => a.status === 'done').length}/{run.agents.length} agents
                </span>
              </div>
            </div>
            <AgentTimeline agents={run.agents} stage={run.stage} className="mt-3 border-t border-line" />
          </Panel>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Panel>
            <PanelHeader eyebrow="9.11 · Dimensions" title="Rolling verdicts" />
            <DimensionStrip run={run} findings={[]} linkFindings={false} />
          </Panel>

          <Panel>
            <PanelHeader eyebrow="Working set" title="Blast radius so far" />
            <PanelBody className="space-y-3">
              <dl className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { label: 'APIs', value: run.coverage.apis },
                  { label: 'Services', value: run.coverage.services },
                  { label: 'Data objects', value: run.coverage.databaseObjects },
                  { label: 'Consumers', value: run.coverage.consumers },
                ].map((c) => (
                  <div key={c.label}>
                    <dt className="eyebrow">{c.label}</dt>
                    <dd className="tabular mt-0.5 text-lg font-semibold text-fg">{c.value}</dd>
                  </div>
                ))}
              </dl>
              {request && request.proposal.affectedDomains.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
                  {request.proposal.affectedDomains.map((d) => (
                    <Chip key={d}>{d}</Chip>
                  ))}
                </div>
              ) : null}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              eyebrow="Risk floor"
              title="Preliminary"
              description="The final score is emitted only once the deterministic policy engine has run."
              action={<RiskBadge level={request?.proposal.expectedRisk ?? 'LOW'} />}
            />
            <PanelBody className="space-y-3">
              <ProgressBar value={progress} status="pending" label="Risk accumulation" />
              <p className="text-xs leading-relaxed text-subtle">
                Risk accumulates as agents return findings; no score is published before every dimension
                has reported.
              </p>
              <p className="flex items-center gap-1.5 text-[11px] text-accent">
                <Layers className="size-3" />
                {duration(DECISION_AT)} expected total
              </p>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader eyebrow="Read-only" title="What this phase does not do" />
            <PanelBody>
              <ul className="space-y-1.5 text-[11px] leading-relaxed text-subtle">
                {[
                  'No file is written, moved or deleted.',
                  'No branch is created or modified.',
                  'Findings are reproducible from the same indexed revision.',
                ].map((line) => (
                  <li key={line} className="flex gap-2">
                    <Radar className="mt-0.5 size-3 shrink-0 text-subtle/70" />
                    {line}
                  </li>
                ))}
              </ul>
              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-subtle">
                <Cpu className="size-3" />
                Subagents run in isolated read-only contexts.
              </p>
            </PanelBody>
          </Panel>
        </div>
      </div>
    </>
  )
}

const STAGE_LABEL: Record<PreflightRun['stage'], string> = {
  queued: 'Queued',
  context: 'Loading repository context',
  agents: 'Explorer agents in flight',
  aggregating: 'Aggregating evidence',
  decided: 'Decision emitted',
  failed: 'Run failed',
}
