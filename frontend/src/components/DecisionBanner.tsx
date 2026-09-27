import { Link } from 'react-router-dom'
import { ArrowRight, Ban, FileWarning, ShieldCheck, TriangleAlert } from 'lucide-react'
import type { Decision, PreflightRun } from '@/types'
import { cn } from '@/lib/cn'
import { decisionTone } from '@/lib/status'
import { RiskBadge } from '@/components/ui/Badge'
import { countLabel } from '@/lib/format'

const VERDICT_COPY: Record<Decision, { headline: string; body: string; icon: typeof ShieldCheck }> = {
  BLOCKED: {
    headline: 'Blocked',
    body: 'At least one enforced rule or verified contract is violated. Implementation must not start.',
    icon: Ban,
  },
  REVIEW_REQUIRED: {
    headline: 'Review required',
    body: 'No enforced rule is violated, but the change is high-impact or the evidence is incomplete. A human must approve it.',
    icon: TriangleAlert,
  },
  CLEARED: {
    headline: 'Cleared',
    body: 'No blocking, high-severity or unverified findings. Implementation may proceed.',
    icon: ShieldCheck,
  },
}

/**
 * The gate verdict. Deliberately the loudest element on the results screen -
 * this is the single thing the product exists to communicate.
 */
export function DecisionBanner({
  run,
  changeLabel,
  actions,
}: {
  run: PreflightRun
  changeLabel?: string
  actions?: React.ReactNode
}) {
  const decision = run.decision ?? 'REVIEW_REQUIRED'
  const tone = decisionTone[decision]
  const copy = VERDICT_COPY[decision]
  const Icon = copy.icon

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-xl border bg-panel',
        tone.border,
        decision === 'BLOCKED' && 'hatch-block',
      )}
    >
      <div className={cn('absolute inset-y-0 left-0 w-1', tone.bg)} style={{ backgroundColor: tone.hex }} />
      <div className="flex flex-wrap items-start gap-5 p-5 pl-6">
        <div className="flex items-center gap-4">
          <div
            className={cn('grid size-12 shrink-0 place-items-center rounded-lg border', tone.border)}
            style={{ backgroundColor: `color-mix(in oklab, ${tone.hex} 14%, transparent)` }}
          >
            <Icon className={cn('size-6', tone.text)} />
          </div>
          <div>
            <p className="eyebrow">Pre-flight result</p>
            <h2 className={cn('text-2xl font-semibold tracking-tight', tone.text)}>{copy.headline}</h2>
          </div>
        </div>

        <div className="min-w-[16rem] flex-1">
          <p className="text-sm leading-relaxed text-muted">{copy.body}</p>
          {run.recommendedApproach ? (
            <p className="mt-2 text-xs leading-relaxed text-subtle">{run.recommendedApproach}</p>
          ) : null}
          {changeLabel ? (
            <p className="mt-2 truncate font-mono text-[11px] text-subtle">“{changeLabel}”</p>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-3">
          <RiskBadge level={run.risk.level} />
          <dl className="flex gap-5 text-right">
            <Metric label="Blocking" value={run.blockingCount} tone={run.blockingCount ? 'text-block' : 'text-fg'} />
            <Metric label="Warnings" value={run.warningCount} tone={run.warningCount ? 'text-review' : 'text-fg'} />
            <Metric
              label="Files"
              value={run.affectedFileCount}
              tone={run.affectedFileCount > 15 ? 'text-review' : 'text-fg'}
            />
          </dl>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      </div>

      {/* Coverage strip: PRD 9.6 impact figures. */}
      <div className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'APIs affected', value: run.coverage.apis },
          { label: 'Services', value: run.coverage.services },
          { label: 'Data objects', value: run.coverage.databaseObjects },
          { label: 'Tests', value: run.coverage.tests },
          { label: 'Consumers', value: run.coverage.consumers },
          { label: 'Risk score', value: `${run.risk.score}/100` },
        ].map((cell) => (
          <div key={cell.label} className="bg-panel px-4 py-2.5">
            <p className="eyebrow">{cell.label}</p>
            <p className={cn('tabular mt-0.5 text-sm font-semibold', cell.value === 0 ? 'text-subtle' : 'text-fg')}>
              {cell.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className={cn('tabular mt-0.5 text-lg font-semibold leading-none', tone)}>{value}</dd>
    </div>
  )
}

/** Compact verdict used in lists and the dashboard. */
export function DecisionInline({ decision, to }: { decision: Decision; to?: string }) {
  const tone = decisionTone[decision]
  const body = (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide', tone.text)}>
      <span aria-hidden>{tone.glyph}</span>
      {tone.label}
      {to ? <ArrowRight className="size-3 opacity-50" /> : null}
    </span>
  )
  return to ? (
    <Link to={to} className="hover:underline underline-offset-2">
      {body}
    </Link>
  ) : (
    body
  )
}

export function FindingCountLink({ count, to }: { count: number; to: string }) {
  if (count === 0) return <span className="text-xs text-subtle">No findings</span>
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium hover:underline underline-offset-2',
        'text-muted',
      )}
    >
      <FileWarning className="size-3.5" />
      {countLabel(count, 'finding')}
    </Link>
  )
}
