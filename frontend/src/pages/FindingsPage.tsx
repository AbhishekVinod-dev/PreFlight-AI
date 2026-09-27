import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ClipboardList, FileWarning, Filter, LayoutList, ListChecks, ShieldCheck, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/AppShell'
import { Panel, PanelBody, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { EmptyState, Skeleton } from '@/components/ui/Feedback'
import { CATEGORY_LABEL, Chip } from '@/components/ui/Badge'
import { FindingCard, TrustLegend } from '@/components/FindingCard'
import { EvidencePanel } from '@/components/EvidencePanel'
import { api } from '@/services/api'
import { SEVERITY_ORDER, BASIS_ORDER } from '@/engine/detectors'
import { cn } from '@/lib/cn'
import { countLabel } from '@/lib/format'
import type {
  AnalysisDimension,
  Finding,
  FindingCategory,
  PreflightRun,
  Severity,
  TrustBasis,
} from '@/types'

/**
 * 9.12 Evidence Explorer.
 *
 * Findings on the left, proof on the right. Selection lives in the URL so a
 * reviewer can paste `?finding=F-3` to a colleague and land on exactly the same
 * evidence, which is the whole point of an auditable gate.
 */
export default function FindingsPage() {
  const { runId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const [run, setRun] = useState<PreflightRun>()
  const [findings, setFindings] = useState<Finding[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  const activeFindingId = params.get('finding')
  const dimensionFilter = params.get('dimension') as AnalysisDimension | null
  const [severityFilter, setSeverityFilter] = useState<Severity[]>([])
  const [basisFilter, setBasisFilter] = useState<TrustBasis[]>([])
  const [categoryFilter, setCategoryFilter] = useState<FindingCategory[]>([])

  useEffect(() => {
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const res = await api.getRun(runId)
        if (!alive) return
        setRun(res.run)
        setFindings(res.findings)
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Run not found.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [runId])

  // Dimension is derived from the run, not stored per finding.
  const dimensionOf = useMemo(() => {
    const map = new Map<string, AnalysisDimension>()
    for (const d of run?.dimensions ?? []) for (const id of d.findingIds) map.set(id, d.dimension)
    return map
  }, [run])

  const filtered = useMemo(
    () =>
      findings.filter((f) => {
        if (dimensionFilter && dimensionOf.get(f.id) !== dimensionFilter) return false
        if (severityFilter.length && !severityFilter.includes(f.severity)) return false
        if (basisFilter.length && !basisFilter.includes(f.basis)) return false
        if (categoryFilter.length && !categoryFilter.includes(f.category)) return false
        return true
      }),
    [findings, dimensionFilter, dimensionOf, severityFilter, basisFilter, categoryFilter],
  )

  const active = findings.find((f) => f.id === activeFindingId) ?? filtered[0]
  const filtersOn = severityFilter.length + basisFilter.length + categoryFilter.length + (dimensionFilter ? 1 : 0)

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value === null) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const toggle = <T,>(list: T[], value: T, apply: (v: T[]) => void) =>
    apply(list.includes(value) ? list.filter((x) => x !== value) : [...list, value])

  const clearAll = () => {
    setSeverityFilter([])
    setBasisFilter([])
    setCategoryFilter([])
    setParam('dimension', null)
  }

  return (
    <>
      <PageHeader
        eyebrow={`Run ${runId} · 9.12 Evidence explorer`}
        title="Findings and evidence"
        description="Every claim the gate made, and the repository lines that prove it. Select a finding to open its evidence."
        actions={
          run ? (
            <Link to={`/runs/${runId}/remediation`}>
              <Button size="sm" variant="secondary" icon={<ClipboardList className="size-3.5" />}>
                Remediation plan
              </Button>
            </Link>
          ) : null
        }
      />

      {run ? (
        <div className="mb-4 border-b border-line">
          <Tabs
            items={[
              { to: `/runs/${runId}`, label: 'Dimensions', icon: <ListChecks className="size-3.5" />, end: true },
              { to: `/runs/${runId}/findings`, label: 'Findings', icon: <FileWarning className="size-3.5" />, count: findings.length },
              { to: `/runs/${runId}/remediation`, label: 'Remediation', icon: <ClipboardList className="size-3.5" /> },
              { to: `/runs/${runId}/postflight`, label: 'Post-flight', icon: <ShieldCheck className="size-3.5" /> },
            ]}
          />
        </div>
      ) : null}

      {error ? (
        <Panel>
          <EmptyState icon={<FileWarning className="size-6 text-block" />} title={error} />
        </Panel>
      ) : loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-[40rem]" />
        </div>
      ) : findings.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<ShieldCheck className="size-6 text-pass" />}
            title="No findings for this run"
            description="Every dimension inspected the change and found no violation, no unverified dependency and no decision conflict."
            action={
              <Link to={`/runs/${runId}`}>
                <Button size="sm" variant="secondary">
                  Back to the decision
                </Button>
              </Link>
            }
          />
        </Panel>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          {/* ------------------------------------------------- Filter rail */}
          <div className="space-y-3">
            <Panel>
              <PanelHeader
                eyebrow="Filter"
                title={
                  <span className="flex items-center gap-2">
                    <Filter className="size-3.5" />
                    {countLabel(filtered.length, 'finding')}
                    {filtersOn > 0 ? <Chip>{filtersOn} active</Chip> : null}
                  </span>
                }
                action={
                  filtersOn > 0 ? (
                    <button
                      type="button"
                      onClick={clearAll}
                      className="inline-flex items-center gap-1 text-[11px] text-subtle hover:text-fg"
                    >
                      <X className="size-3" /> clear
                    </button>
                  ) : null
                }
              />
              <PanelBody className="space-y-3">
                {run ? (
                  <FacetGroup title="Dimension">
                    {run.dimensions
                      .filter((d) => d.dimension !== 'repository' && d.findingIds.length > 0)
                      .map((d) => {
                        const on = dimensionFilter === d.dimension
                        return (
                          <Facet
                            key={d.dimension}
                            on={on}
                            label={d.label}
                            count={d.findingIds.length}
                            onClick={() => setParam('dimension', on ? null : d.dimension)}
                          />
                        )
                      })}
                  </FacetGroup>
                ) : null}

                <FacetGroup title="Severity">
                  {SEVERITY_ORDER.filter((s) => findings.some((f) => f.severity === s)).map((s) => (
                    <Facet
                      key={s}
                      on={severityFilter.includes(s)}
                      label={s}
                      count={findings.filter((f) => f.severity === s).length}
                      onClick={() => toggle(severityFilter, s, setSeverityFilter)}
                    />
                  ))}
                </FacetGroup>

                <FacetGroup title="Trust basis">
                  {BASIS_ORDER.filter((b) => findings.some((f) => f.basis === b)).map((b) => (
                    <Facet
                      key={b}
                      on={basisFilter.includes(b)}
                      label={b}
                      count={findings.filter((f) => f.basis === b).length}
                      onClick={() => toggle(basisFilter, b, setBasisFilter)}
                    />
                  ))}
                </FacetGroup>

                <FacetGroup title="Category">
                  {[...new Set(findings.map((f) => f.category))].map((c) => (
                    <Facet
                      key={c}
                      on={categoryFilter.includes(c)}
                      label={CATEGORY_LABEL[c]}
                      count={findings.filter((f) => f.category === c).length}
                      onClick={() => toggle(categoryFilter, c, setCategoryFilter)}
                    />
                  ))}
                </FacetGroup>
              </PanelBody>
            </Panel>

            <Panel flush>
              <TrustLegend />
              {filtered.length === 0 ? (
                <EmptyState
                  icon={<LayoutList className="size-5" />}
                  title="No matches"
                  description="Loosen a filter to see the rest of the run."
                />
              ) : (
                <ul className="max-h-[42rem] divide-y divide-line overflow-y-auto">
                  {filtered.map((f) => (
                    <li key={f.id}>
                      <FindingCard
                        finding={f}
                        runId={runId}
                        active={f.id === active?.id}
                        onSelect={() => setParam('finding', f.id)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          {/* ---------------------------------------------------- Evidence */}
          <div className="min-w-0">
            {active ? (
              <EvidencePanel key={active.id} finding={active} />
            ) : (
              <Panel>
                <EmptyState title="Select a finding" description="Evidence appears here." />
              </Panel>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function FacetGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow">{title}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function Facet({
  on,
  label,
  count,
  onClick,
}: {
  on: boolean
  label: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        'inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 text-[10px] font-medium capitalize transition-colors',
        on
          ? 'border-accent/50 bg-accent/12 text-accent'
          : 'border-line bg-raised text-muted hover:border-line-strong hover:text-fg',
      )}
    >
      {label}
      <span className="tabular font-mono text-subtle">{count}</span>
    </button>
  )
}
