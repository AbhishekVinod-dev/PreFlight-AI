import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Award,
  CheckCircle2,
  Clock,
  FileWarning,
  Gauge,
  PackageX,
  Timer,
  TrendingUp,
  XCircle,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/AppShell'
import { Panel, PanelBody, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { Chip, DecisionBadge, SeverityBadge } from '@/components/ui/Badge'
import { EmptyState, ProgressBar, Skeleton } from '@/components/ui/Feedback'
import { api } from '@/services/api'
import { cn } from '@/lib/cn'
import { compactNumber } from '@/lib/number'
import { countLabel } from '@/lib/format'
import { decisionTone, severityTone } from '@/lib/status'
import type { BenchmarkScenario, ProjectMetrics } from '@/types'

/**
 * 21 Success metrics + 22 Evaluation benchmark.
 *
 * The headline numbers are *measured*: `createBenchmark()` runs the real engine
 * over 24 seeded scenarios and compares its verdict to the ground truth a human
 * architect signed off. Nothing on this page is a target copied from the PRD.
 */

const CATEGORY_LABEL: Record<BenchmarkScenario['category'], string> = {
  architecture: 'Architecture',
  contract: 'Contract',
  dependency: 'Dependency',
  refactoring: 'Refactoring',
  security: 'Security',
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<ProjectMetrics>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [onlyWrong, setOnlyWrong] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const m = await api.getMetrics()
        if (!alive) return
        setMetrics(m)
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Could not compute metrics.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const byCategory = useMemo(() => {
    const m = new Map<BenchmarkScenario['category'], { total: number; correct: number }>()
    for (const b of metrics?.benchmark ?? []) {
      const row = m.get(b.category) ?? { total: 0, correct: 0 }
      row.total++
      if (b.correct) row.correct++
      m.set(b.category, row)
    }
    return [...m.entries()]
  }, [metrics])

  if (error) {
    return (
      <>
        <PageHeader eyebrow="21 · Metrics" title="Metrics unavailable" />
        <Panel>
          <EmptyState icon={<XCircle className="size-6 text-block" />} title={error} />
        </Panel>
      </>
    )
  }

  if (loading || !metrics) {
    return (
      <>
        <PageHeader eyebrow="21 · Success metrics" title="Metrics and benchmark" />
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </>
    )
  }

  const correct = metrics.benchmark.filter((b) => b.correct).length
  const wrong = metrics.benchmark.filter((b) => !b.correct)
  const rows = onlyWrong ? wrong : metrics.benchmark

  return (
    <>
      <PageHeader
        eyebrow="21 · Success metrics · 22 · Benchmark"
        title="Metrics and benchmark"
        description="The benchmark runs this engine over 24 seeded changes and compares each verdict to the ground truth a human architect signed off. Every number below is measured, not targeted."
        actions={
          <Button variant="secondary" size="sm" icon={<Activity className="size-3.5" />} onClick={() => window.location.reload()}>
            Re-run benchmark
          </Button>
        }
      />

      {/* ------------------------------------------------- Headline tiles */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          icon={<Award className="size-4" />}
          label="Findings precision"
          value={`${metrics.findingsPrecisionPct}%`}
          hint={`${correct} of ${metrics.benchmark.length} verdicts match ground truth`}
          tone={metrics.findingsPrecisionPct >= 90 ? 'pass' : metrics.findingsPrecisionPct >= 75 ? 'review' : 'block'}
          progress={metrics.findingsPrecisionPct / 100}
        />
        <MetricTile
          icon={<Clock className="size-4" />}
          label="Pre-flight time"
          value={`${metrics.preflightDurationSeconds}s`}
          hint="mean wall clock across the benchmark"
          tone="pass"
          progress={Math.min(1, metrics.preflightDurationSeconds / 5)}
        />
        <MetricTile
          icon={<Gauge className="size-4" />}
          label="Contract coverage"
          value={`${metrics.contractCoveragePct}%`}
          hint="scenarios where contract analysis actually ran"
          tone={metrics.contractCoveragePct >= 90 ? 'pass' : 'review'}
          progress={metrics.contractCoveragePct / 100}
        />
        <MetricTile
          icon={<PackageX className="size-4" />}
          label="Deprecated adoptions prevented"
          value={metrics.deprecatedAdoptionsPrevented}
          hint="forbidden packages caught at proposal time"
          tone="pass"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* -------------------------------------------- Avoided rework */}
        <Panel className="lg:col-span-2" flush>
          <PanelHeader
            eyebrow="21.1"
            title="Rework avoided"
            description="Per scenario: minutes a dead-end change would have cost after implementation, minus the seconds pre-flight spent finding out."
          />
          <ReworkChart points={metrics.avoidedRework} />
        </Panel>

        {/* ------------------------------------------------ Quality mix */}
        <div className="space-y-4">
          <Panel>
            <PanelHeader eyebrow="21.2" title="Quality and trust" />
            <PanelBody className="space-y-3">
              {[
                { label: 'False positive rate', value: metrics.falsePositiveRatePct, good: 'low' as const },
                { label: 'Remediation acceptance', value: metrics.remediationAcceptancePct, good: 'high' as const },
                { label: 'Human override rate', value: metrics.humanOverridePct, good: 'low' as const },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-fg">{row.label}</span>
                    <span className="tabular font-mono text-[11px] text-muted">{row.value}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full transition-[width] duration-700"
                      style={{
                        width: `${row.value}%`,
                        backgroundColor: row.good === 'low' ? (row.value <= 10 ? '#35d6a0' : '#f6b545') : row.value >= 70 ? '#35d6a0' : '#f6b545',
                      }}
                    />
                  </div>
                </div>
              ))}
              <p className="pt-1 text-[11px] leading-relaxed text-subtle">
                A high override rate would mean the gate is wrong often enough that developers route
                around it. This is the metric that decides whether the product survives.
              </p>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              eyebrow="22"
              title="Accuracy by category"
              description="Where the engine is strong, and where it is not."
            />
            <PanelBody className="space-y-2.5">
              {byCategory.map(([category, row]) => (
                <div key={category}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-fg">{CATEGORY_LABEL[category]}</span>
                    <span className="tabular font-mono text-[11px] text-muted">
                      {row.correct}/{row.total}
                    </span>
                  </div>
                  <ProgressBar
                    value={row.correct / row.total}
                    status={row.correct === row.total ? 'pass' : row.correct / row.total >= 0.6 ? 'review' : 'block'}
                    className="mt-1"
                  />
                </div>
              ))}
            </PanelBody>
          </Panel>
        </div>
      </div>

      {/* --------------------------------------------------- Benchmark table */}
      <Panel flush className="mt-4">
        <PanelHeader
          eyebrow="22 · Evaluation benchmark"
          title={`${metrics.benchmark.length} controlled changes`}
          description="Each row is one scenario: what a human architect decided, and what this engine returned."
          action={
            <Button
              size="sm"
              variant={onlyWrong ? 'primary' : 'secondary'}
              onClick={() => setOnlyWrong((v) => !v)}
              disabled={wrong.length === 0}
            >
              {onlyWrong ? `Showing ${wrong.length} misses` : 'Show misses only'}
            </Button>
          }
        />
        {rows.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="size-6 text-pass" />}
            title="No misses"
            description="Every benchmark scenario matched the ground truth verdict."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left">
              <thead>
                <tr className="border-b border-line">
                  {['Id', 'Scenario', 'Category', 'Ground truth', 'Engine', 'Files', 'Findings', 'Time', 'Conf.'].map((h) => (
                    <th key={h} className="eyebrow px-4 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((b) => (
                  <tr key={b.id} className={cn('transition-colors hover:bg-raised/40', !b.correct && 'bg-block/[0.04]')}>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-subtle">{b.id}</td>
                    <td className="px-4 py-2.5">
                      <p className="text-xs font-medium text-fg">{b.name}</p>
                      <p className="mt-0.5 text-[10px] text-subtle">{b.groundTruthLabel}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <Chip>{CATEGORY_LABEL[b.category]}</Chip>
                    </td>
                    <td className="px-4 py-2.5">
                      <DecisionBadge decision={b.groundTruth} />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <DecisionBadge decision={b.toolResult} />
                        {b.correct ? (
                          <CheckCircle2 className="size-3.5 text-pass" />
                        ) : (
                          <XCircle className="size-3.5 text-block" />
                        )}
                      </div>
                    </td>
                    <td className="tabular px-4 py-2.5 font-mono text-[11px] text-muted">{b.filesIdentified}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5">
                        <FileWarning className="size-3 text-subtle" />
                        <span className="tabular font-mono text-[11px] text-muted">{b.findingsRaised}</span>
                        <SeverityBadge severity={b.severity} />
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1">
                        <Timer className="size-3 text-subtle" />
                        <span className="tabular font-mono text-[11px] text-muted">{b.timeSeconds}s</span>
                      </span>
                    </td>
                    <td className="tabular px-4 py-2.5 font-mono text-[11px] text-muted">{b.confidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <p className="mt-3 text-[11px] leading-relaxed text-subtle">
        {countLabel(metrics.benchmark.length, 'scenario')} executed. Total time avoided across the set:{' '}
        <span className="tabular font-mono text-muted">
          {compactNumber(
            Math.round(metrics.avoidedRework.reduce((s, p) => s + p.value, 0) / 60),
          )}
        </span>{' '}
        hours. Contract analysis ran on{' '}
        {metrics.benchmark.filter((b) => b.contractAnalysisRan).length} of them.
      </p>
    </>
  )
}

/* ------------------------------------------------------------------ *
 * Pieces
 * ------------------------------------------------------------------ */

function MetricTile({
  icon,
  label,
  value,
  hint,
  tone,
  progress,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  hint: string
  tone: 'pass' | 'review' | 'block'
  progress?: number
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <p className="eyebrow">{label}</p>
        <span className={cn(tone === 'pass' ? 'text-pass' : tone === 'review' ? 'text-review' : 'text-block')}>
          {icon}
        </span>
      </div>
      <p
        className={cn(
          'tabular mt-2 text-2xl font-semibold leading-none',
          tone === 'pass' ? 'text-pass' : tone === 'review' ? 'text-review' : 'text-block',
        )}
      >
        {value}
      </p>
      {progress !== undefined ? (
        <ProgressBar value={progress} status={tone} className="mt-2.5" label={label} />
      ) : null}
      <p className="mt-2 text-[11px] leading-relaxed text-subtle">{hint}</p>
    </div>
  )
}

/** Horizontal bars: rework minutes avoided per scenario, against the cost without pre-flight. */
function ReworkChart({ points }: { points: ProjectMetrics['avoidedRework'] }) {
  const max = Math.max(1, ...points.map((p) => p.value))
  const total = points.reduce((s, p) => s + p.value, 0)

  return (
    <div>
      <div className="flex items-baseline justify-between border-b border-line px-4 py-2.5">
        <p className="flex items-center gap-1.5 text-[11px] text-subtle">
          <TrendingUp className="size-3.5" />
          {compactNumber(Math.round(total / 60))} hours avoided in total
        </p>
        <p className="text-[11px] text-subtle">fill = saved, outline = cost without pre-flight</p>
      </div>
      <ul className="divide-y divide-line">
        {points.map((p) => {
          const saved = p.value > 0
          return (
            <li key={p.label} className="px-4 py-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-[11px] text-muted">{p.label}</span>
                <span
                  className={cn(
                    'tabular shrink-0 font-mono text-[11px]',
                    saved ? 'text-pass' : 'text-subtle',
                  )}
                >
                  {saved ? `${p.value} min saved` : 'not saved'}
                </span>
              </div>
              <div className="relative mt-1 h-2 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-line-strong"
                  style={{ width: `${((p.baseline ?? 0) / max) * 100}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700"
                  style={{
                    width: `${(p.value / max) * 100}%`,
                    backgroundColor: saved ? decisionTone.CLEARED.hex : severityTone.info.hex,
                  }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
