import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  ClipboardList,
  FileWarning,
  GitBranch,
  ListChecks,
  Route,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/AppShell'
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { Chip } from '@/components/ui/Badge'
import { api } from '@/services/api'
import { useApp } from '@/store/store'
import { cn } from '@/lib/cn'
import { relativeTime } from '@/lib/format'
import type { PreflightRun, RemediationPlan, RemediationStep, RemediationStepStatus } from '@/types'

const LAYER_ORDER = ['api', 'service', 'repository', 'frontend', 'config', 'test'] as const

/**
 * 9.13 Remediation planner.
 *
 * The plan is a sequence of concrete edits, each resolving named findings, each
 * routed to the team that owns the layer. Approving a step is the only state
 * transition that matters here, so it is the only thing that writes.
 */
export default function RemediationPage() {
  const { runId = '' } = useParams()
  const { notify, refreshRequests } = useApp()
  const [run, setRun] = useState<PreflightRun>()
  const [plan, setPlan] = useState<RemediationPlan>()
  const [generating, setGenerating] = useState(true)
  const [error, setError] = useState<string>()
  const [busyStep, setBusyStep] = useState<string>()

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        // Reuse an existing plan if this run was remediated before; the mock
        // backend keeps them, so returning to the screen is not lossy.
        const existing = await api.getRemediation(runId)
        if (existing && alive) {
          setPlan(existing)
          setGenerating(false)
        }
        const res = await api.getRun(runId)
        if (!alive) return
        setRun(res.run)
        if (!existing) {
          const fresh = await api.generateRemediation(runId)
          if (!alive) return
          setPlan(fresh)
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Could not build a remediation plan.')
      } finally {
        if (alive) setGenerating(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [runId])

  const setStatus = useCallback(
    async (stepId: string, status: RemediationStepStatus) => {
      if (!plan) return
      setBusyStep(stepId)
      try {
        setPlan(await api.setStepStatus(plan.id, stepId, status))
        if (status === 'approved') await refreshRequests()
      } finally {
        setBusyStep(undefined)
      }
    },
    [plan, refreshRequests],
  )

  const setAll = useCallback(
    async (status: RemediationStepStatus) => {
      if (!plan) return
      setBusyStep('*')
      try {
        setPlan(await api.setStepStatuses(plan.id, status))
        await refreshRequests()
        notify({
          title: status === 'approved' ? 'Plan approved' : 'Plan rejected',
          detail:
            status === 'approved'
              ? `${plan.steps.length} steps queued for implementation.`
              : 'The run stays blocked; nothing was changed.',
          tone: status === 'approved' ? 'pass' : 'review',
        })
      } finally {
        setBusyStep(undefined)
      }
    },
    [plan, refreshRequests, notify],
  )

  const tabs = [
    { to: `/runs/${runId}`, label: 'Dimensions', icon: <ListChecks className="size-3.5" />, end: true },
    { to: `/runs/${runId}/findings`, label: 'Findings', icon: <FileWarning className="size-3.5" />, count: run?.findingIds.length },
    { to: `/runs/${runId}/remediation`, label: 'Remediation', icon: <ClipboardList className="size-3.5" /> },
    { to: `/runs/${runId}/postflight`, label: 'Post-flight', icon: <ShieldCheck className="size-3.5" /> },
  ]

  if (error) {
    return (
      <>
        <PageHeader eyebrow="9.13 · Remediation" title="Plan unavailable" />
        <Panel>
          <EmptyState icon={<FileWarning className="size-6 text-block" />} title={error} />
        </Panel>
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow={`Run ${runId} · 9.13 Remediation planner`}
        title="How to unblock this change"
        description="A compliant path through the existing repository, step by step. Every step resolves at least one named finding and reuses an abstraction that already exists."
      />

      {run ? (
        <div className="mb-4 border-b border-line">
          <Tabs items={tabs} />
        </div>
      ) : null}

      {generating ? (
        <Panel>
          <PanelBody>
            <div className="grid min-h-[30vh] place-items-center gap-3">
              <Spinner className="size-5" />
              <div className="text-center">
                <p className="text-sm text-fg">Building the remediation plan</p>
                <p className="mt-1 text-xs text-subtle">
                  Matching each blocking finding to an existing component that already satisfies it.
                </p>
              </div>
            </div>
          </PanelBody>
        </Panel>
      ) : !plan ? (
        <Panel>
          <EmptyState title="No plan" description="Nothing to remediate for this run." />
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {/* ------------------------------------------------- Summary */}
            <Panel>
              <PanelHeader
                eyebrow="Plan"
                title={plan.summary}
                description={plan.approach}
                action={
                  <div className="flex items-center gap-1.5">
                    <Chip>{plan.steps.length} steps</Chip>
                    <Chip mono>{plan.id}</Chip>
                  </div>
                }
              />
              <PanelFooter className="flex-wrap justify-between gap-3">
                <p className="text-[11px] text-subtle">
                  Generated {relativeTime(plan.createdAt)}
                  {plan.approvedAt ? ` · approved ${relativeTime(plan.approvedAt)} by ${plan.approvedBy ?? 'you'}` : ''}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={busyStep === '*'}
                    onClick={() => setAll('rejected')}
                    icon={<X className="size-3.5" />}
                  >
                    Reject all
                  </Button>
                  <Button
                    size="sm"
                    variant="success"
                    loading={busyStep === '*'}
                    onClick={() => setAll('approved')}
                    icon={<Check className="size-3.5" />}
                  >
                    Approve all
                  </Button>
                </div>
              </PanelFooter>
            </Panel>

            {/* ---------------------------------------------------- Steps */}
            <Panel flush>
              <PanelHeader
                eyebrow="Implementation order"
                title="Steps"
                description="Run them in order; each one unblocks the next."
              />
              <ol className="divide-y divide-line">
                {plan.steps.map((step) => (
                  <StepRow
                    key={step.id}
                    step={step}
                    busy={busyStep === step.id}
                    onApprove={() => setStatus(step.id, 'approved')}
                    onReject={() => setStatus(step.id, 'rejected')}
                    onReset={() => setStatus(step.id, 'pending')}
                    runId={runId}
                  />
                ))}
              </ol>
            </Panel>
          </div>

          {/* ------------------------------------------------- Side rail */}
          <div className="space-y-4">
            <Panel>
              <PanelHeader
                eyebrow="Recommended call path"
                title="Compliant architecture"
                description="The path that satisfies every rule this run checked."
                action={<Route className="size-4 text-accent" />}
              />
              <PanelBody>
                <ol className="space-y-0">
                  {plan.recommendedArchitecture.map((layer, i) => (
                    <li key={layer.layer} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className="grid size-5 shrink-0 place-items-center rounded-full border border-accent/40 bg-accent/10 font-mono text-[10px] text-accent">
                          {i + 1}
                        </span>
                        {i < plan.recommendedArchitecture.length - 1 ? (
                          <span className="my-0.5 w-px flex-1 bg-line-strong" />
                        ) : null}
                      </div>
                      <div className="min-w-0 pb-4">
                        <p className="text-xs font-medium text-fg">{layer.layer}</p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-subtle">{layer.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </PanelBody>
            </Panel>

            <LayerBreakdown steps={plan.steps} />

            <Panel>
              <PanelHeader
                eyebrow="Next"
                title="After you approve"
                description="Post-flight re-runs the same dimensions against the implemented diff."
                action={<Sparkles className="size-4 text-agent" />}
              />
              <PanelBody className="space-y-3">
                <p className="text-xs leading-relaxed text-muted">
                  Approving changes the change-request status to <Chip>REMEDIATING</Chip>. Nothing is
                  written to the repository by this screen.
                </p>
                <Link to={`/runs/${runId}/postflight`} className="block">
                  <Button size="sm" variant="secondary" className="w-full" icon={<ShieldCheck className="size-3.5" />}>
                    Open post-flight
                  </Button>
                </Link>
              </PanelBody>
            </Panel>
          </div>
        </div>
      )}
    </>
  )
}

function StepRow({
  step,
  busy,
  onApprove,
  onReject,
  onReset,
  runId,
}: {
  step: RemediationStep
  busy: boolean
  onApprove: () => void
  onReject: () => void
  onReset: () => void
  runId: string
}) {
  return (
    <li className="flex gap-3 px-4 py-3.5">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            'grid size-6 shrink-0 place-items-center rounded-full border font-mono text-[11px]',
            step.status === 'approved' && 'border-pass/50 bg-pass/12 text-pass',
            step.status === 'done' && 'border-pass/50 bg-pass/12 text-pass',
            step.status === 'rejected' && 'border-block/50 bg-block/12 text-block',
            step.status === 'pending' && 'border-line-strong bg-raised text-subtle',
          )}
        >
          {step.status === 'approved' || step.status === 'done' ? (
            <Check className="size-3.5" />
          ) : step.status === 'rejected' ? (
            <X className="size-3.5" />
          ) : (
            step.order
          )}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-medium text-fg">{step.title}</p>
          <Chip className="capitalize">{step.layer}</Chip>
          {step.owner ? <Chip>{step.owner}</Chip> : null}
          {step.estimate ? <Chip mono>{step.estimate}</Chip> : null}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted">{step.detail}</p>

        {step.files.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {step.files.map((f) => (
              <li
                key={f}
                className="inline-flex items-center gap-1 rounded border border-line bg-canvas/60 px-1.5 py-0.5 font-mono text-[10px] text-subtle"
              >
                <GitBranch className="size-2.5" />
                {f}
              </li>
            ))}
          </ul>
        ) : null}

        {step.resolvesFindingIds.length > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wide text-subtle">Resolves</span>
            {step.resolvesFindingIds.map((id) => (
              <Link
                key={id}
                to={`/runs/${runId}/findings?finding=${id}`}
                className="inline-flex items-center gap-0.5 rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-[10px] text-muted transition-colors hover:border-accent/50 hover:text-accent"
              >
                {id}
                <ArrowRight className="size-2.5" />
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {step.status === 'pending' ? (
          <>
            <Button size="sm" variant="success" loading={busy} onClick={onApprove} icon={<Check className="size-3" />}>
              Approve
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={onReject}>
              Reject
            </Button>
          </>
        ) : (
          <Button size="sm" variant="quiet" disabled={busy} onClick={onReset}>
            Undo
          </Button>
        )}
      </div>
    </li>
  )
}

function LayerBreakdown({ steps }: { steps: RemediationStep[] }) {
  const byLayer = LAYER_ORDER.map((l) => ({ layer: l, count: steps.filter((s) => s.layer === l).length })).filter(
    (g) => g.count > 0,
  )
  const total = Math.max(1, steps.length)

  return (
    <Panel>
      <PanelHeader eyebrow="Ownership routing" title="Where the work lands" />
      <PanelBody className="space-y-2.5">
        {byLayer.map((g) => (
          <div key={g.layer}>
            <div className="flex items-baseline justify-between">
              <span className="text-xs capitalize text-fg">{g.layer}</span>
              <span className="tabular font-mono text-[11px] text-muted">{g.count}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-500"
                style={{ width: `${(g.count / total) * 100}%` }}
              />
            </div>
          </div>
        ))}
        <p className="pt-1 text-[11px] leading-relaxed text-subtle">
          Each layer maps to the team that already owns it, so approval routes to a real reviewer.
        </p>
      </PanelBody>
    </Panel>
  )
}
