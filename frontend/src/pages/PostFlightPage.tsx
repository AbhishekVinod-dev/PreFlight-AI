import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ClipboardList,
  FileWarning,
  ListChecks,
  RefreshCw,
  Rocket,
  ShieldCheck,
  ShieldQuestion,
  SquareCheckBig,
  TriangleAlert,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/AppShell'
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { EmptyState, Skeleton } from '@/components/ui/Feedback'
import { Chip } from '@/components/ui/Badge'
import { api, type PostFlightReport } from '@/services/api'
import { cn } from '@/lib/cn'
import { countLabel } from '@/lib/format'
import type { PreflightRun } from '@/types'

/**
 * 9.14 Post-flight.
 *
 * Closes the loop: the same five dimensions are re-evaluated against the
 * implemented diff rather than the proposal, so a remediation that only looked
 * correct on paper is caught here.
 */
export default function PostFlightPage() {
  const { runId = '' } = useParams()
  const [run, setRun] = useState<PreflightRun>()
  const [report, setReport] = useState<PostFlightReport>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [res, post] = await Promise.all([api.getRun(runId), api.getPostFlight(runId)])
        if (!alive) return
        setRun(res.run)
        setReport(post)
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Could not build a post-flight report.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [runId])

  const recheck = async () => {
    setVerifying(true)
    try {
      setReport(await api.getPostFlight(runId))
    } finally {
      setVerifying(false)
    }
  }

  const passed = report?.checks.filter((c) => c.status === 'pass').length ?? 0

  return (
    <>
      <PageHeader
        eyebrow={`Run ${runId} · 9.14 Post-flight`}
        title="Verify the remediation"
        description="The gate runs again after implementation. Passing here is what moves the change request to verified."
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className="size-3.5" />}
            loading={verifying}
            onClick={recheck}
            disabled={!report}
          >
            Re-check
          </Button>
        }
      />

      {run ? (
        <div className="mb-4 border-b border-line">
          <Tabs
            items={[
              { to: `/runs/${runId}`, label: 'Dimensions', icon: <ListChecks className="size-3.5" />, end: true },
              { to: `/runs/${runId}/findings`, label: 'Findings', icon: <FileWarning className="size-3.5" />, count: run.findingIds.length },
              { to: `/runs/${runId}/remediation`, label: 'Remediation', icon: <ClipboardList className="size-3.5" /> },
              { to: `/runs/${runId}/postflight`, label: 'Post-flight', icon: <ShieldCheck className="size-3.5" /> },
            ]}
          />
        </div>
      ) : null}

      {error ? (
        <Panel>
          <EmptyState icon={<TriangleAlert className="size-6 text-block" />} title={error} />
        </Panel>
      ) : loading || !report ? (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {/* --------------------------------------------------- Verdict */}
            <Panel className={report.cleared ? 'border-pass/40' : 'border-review/40'}>
              <div className="flex flex-wrap items-center gap-4 p-5">
                <div
                  className={cn(
                    'grid size-12 shrink-0 place-items-center rounded-lg border',
                    report.cleared ? 'border-pass/40 text-pass' : 'border-review/40 text-review',
                  )}
                  style={{
                    backgroundColor: report.cleared ? 'color-mix(in oklab, #35d6a0 14%, transparent)' : undefined,
                  }}
                >
                  {report.cleared ? <ShieldCheck className="size-6" /> : <ShieldQuestion className="size-6" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="eyebrow">Post-flight result</p>
                  <h2 className={cn('text-xl font-semibold tracking-tight', report.cleared ? 'text-pass' : 'text-review')}>
                    {report.cleared ? 'Verified' : 'Not yet verified'}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {report.cleared
                      ? 'Every blocking finding is covered by an approved remediation step and no dimension regressed.'
                      : 'Some dimensions still need attention, or no remediation step has been approved yet.'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="eyebrow">Checks passed</p>
                  <p className="tabular mt-0.5 text-3xl font-semibold text-fg">
                    {passed}
                    <span className="text-lg text-subtle">/{report.checks.length}</span>
                  </p>
                </div>
              </div>
            </Panel>

            {/* --------------------------------------------------- Checks */}
            <Panel flush>
              <PanelHeader
                eyebrow="9.14 · Verification"
                title="Dimension checks"
                description="Same agents, same rules, now reading the implemented diff instead of the proposal."
              />
              <ul className="divide-y divide-line">
                {report.checks.map((c) => (
                  <li key={c.label} className="flex items-start gap-3 px-4 py-3">
                    <span
                      className={cn(
                        'mt-0.5 grid size-6 shrink-0 place-items-center rounded border',
                        c.status === 'pass'
                          ? 'border-pass/40 bg-pass/10 text-pass'
                          : 'border-review/40 bg-review/10 text-review',
                      )}
                    >
                      {c.status === 'pass' ? <SquareCheckBig className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-fg">{c.label}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted">{c.detail}</p>
                    </div>
                    <Chip className={c.status === 'pass' ? 'text-pass' : 'text-review'}>
                      {c.status === 'pass' ? 'Pass' : 'Review'}
                    </Chip>
                  </li>
                ))}
              </ul>
              <PanelFooter>
                <Link to={`/runs/${runId}/remediation`}>
                  <Button size="sm" variant="secondary" icon={<ClipboardList className="size-3.5" />}>
                    Back to the plan
                  </Button>
                </Link>
              </PanelFooter>
            </Panel>
          </div>

          {/* ---------------------------------------------- Side rail */}
          <div className="space-y-4">
            <Panel>
              <PanelHeader eyebrow="State machine" title="Where this run sits" />
              <PanelBody>
                <ol className="space-y-0">
                  {LIFECYCLE.map((s, i) => {
                    const reached = LIFECYCLE.findIndex((x) => x.key === run?.stage) >= i || report.cleared
                    return (
                      <li key={s.key} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span
                            className={cn(
                              'grid size-5 shrink-0 place-items-center rounded-full border text-[10px]',
                              reached ? 'border-accent/50 bg-accent/10 text-accent' : 'border-line bg-raised text-subtle',
                            )}
                          >
                            {i + 1}
                          </span>
                          {i < LIFECYCLE.length - 1 ? <span className="my-0.5 w-px flex-1 bg-line-strong" /> : null}
                        </div>
                        <div className="min-w-0 pb-4">
                          <p className={cn('text-xs font-medium', reached ? 'text-fg' : 'text-subtle')}>{s.label}</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-subtle">{s.detail}</p>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader eyebrow="Next" title="Merge" />
              <PanelBody className="space-y-3">
                {report.cleared ? (
                  <>
                    <p className="text-xs leading-relaxed text-muted">
                      The change request moves to <Chip>VERIFIED</Chip>. A passing post-flight is the only
                      thing that writes that status.
                    </p>
                    <Button variant="primary" size="sm" className="w-full" icon={<Rocket className="size-3.5" />}>
                      Merge branch
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-xs leading-relaxed text-muted">
                      Approve the outstanding remediation steps, then re-check. Post-flight reads the plan
                      as well as the diff.
                    </p>
                    <Link to={`/runs/${runId}/remediation`} className="block">
                      <Button variant="secondary" size="sm" className="w-full" loading={verifying}>
                        Open remediation plan
                      </Button>
                    </Link>
                  </>
                )}
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader eyebrow="Summary" title="Run at a glance" />
              <PanelBody>
                <dl className="space-y-2 text-xs">
                  {[
                    { label: 'Findings', value: countLabel(run?.findingIds.length ?? 0, 'item') },
                    { label: 'Blocking', value: String(run?.blockingCount ?? 0) },
                    { label: 'Checks run', value: String(report.checks.length) },
                    { label: 'Verdict', value: report.cleared ? 'verified' : 'pending' },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-3">
                      <dt className="text-subtle">{row.label}</dt>
                      <dd className="font-mono text-muted">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </PanelBody>
            </Panel>
          </div>
        </div>
      )}
    </>
  )
}

const LIFECYCLE = [
  { key: 'queued', label: 'Queued', detail: 'Change request accepted.' },
  { key: 'context', label: 'Context loaded', detail: 'Repository index and policy read.' },
  { key: 'agents', label: 'Pre-flight', detail: 'Six explorer agents report findings.' },
  { key: 'decided', label: 'Decision', detail: 'Gate emits CLEARED / REVIEW / BLOCKED.' },
  { key: 'postflight', label: 'Remediation + verify', detail: 'Same rules, implemented diff.' },
]
