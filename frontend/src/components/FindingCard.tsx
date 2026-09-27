import { Link } from 'react-router-dom'
import { AlertOctagon, ArrowUpRight, Ban, FileCode2, GitBranch, Users } from 'lucide-react'
import type { Finding } from '@/types'
import { cn } from '@/lib/cn'
import { severityTone } from '@/lib/status'
import { shortPath } from '@/lib/format'
import { BasisBadge, CategoryChip, ConfidenceBadge, SeverityBadge } from '@/components/ui/Badge'
import { ConfidenceMeter } from '@/components/ui/Feedback'

/** One row in the findings list. Clicking opens the evidence explorer. */
export function FindingCard({
  finding,
  runId,
  active,
  onSelect,
}: {
  finding: Finding
  runId: string
  active?: boolean
  onSelect?: () => void
}) {
  const tone = severityTone[finding.severity]

  return (
    <Link
      to={`/runs/${runId}/findings?finding=${finding.id}`}
      onClick={onSelect}
      className={cn(
        'block border-l-2 px-4 py-3 transition-colors hover:bg-raised/50',
        active ? 'bg-raised' : 'border-l-transparent',
        finding.blocking ? 'border-l-block' : 'border-l-line',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {finding.blocking ? (
              <span className="inline-flex items-center gap-1 rounded border border-block/40 bg-block/12 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-block">
                <Ban className="size-2.5" /> Blocking
              </span>
            ) : null}
            <SeverityBadge severity={finding.severity} />
            <CategoryChip category={finding.category} />
            <span className="font-mono text-[10px] text-subtle">{finding.id}</span>
            {finding.headline ? (
              <span className={cn('text-[10px] font-semibold uppercase tracking-wide', tone.text)}>
                {finding.headline}
              </span>
            ) : null}
          </div>

          <p className="mt-1.5 text-sm font-medium leading-snug text-fg">{finding.title}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{finding.explanation}</p>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-subtle">
              <FileCode2 className="size-3" />
              {finding.evidence.length} evidence
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-subtle">
              <Users className="size-3" />
              {finding.consumers.length} consumers
            </span>
            {finding.affectedFiles.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-subtle">
                <GitBranch className="size-3" />
                {shortPath(finding.affectedFiles[0], 34)}
                {finding.affectedFiles.length > 1 ? ` +${finding.affectedFiles.length - 1}` : ''}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <BasisBadge basis={finding.basis} />
          <ConfidenceMeter value={finding.confidence} />
          <ArrowUpRight className="size-3.5 text-subtle" />
        </div>
      </div>
    </Link>
  )
}

/** Trust-model legend, shown above the findings list. */
export function TrustLegend() {
  const items = [
    { basis: 'deterministic' as const, note: 'Proven from repository evidence (import, lockfile, policy match). Can hard-block.' },
    { basis: 'inference' as const, note: 'AI inference from evidence. Never hard-blocks on its own - routes to review.' },
    { basis: 'unknown' as const, note: 'Repository cannot answer. Escalated to a human instead of guessed.' },
  ]
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line px-4 py-2.5">
      <span className="inline-flex items-center gap-1.5 text-[11px] text-subtle">
        <AlertOctagon className="size-3" />
        Trust model
      </span>
      {items.map((i) => (
        <span key={i.basis} className="flex items-center gap-1.5">
          <BasisBadge basis={i.basis} />
          <span className="text-[11px] text-subtle" title={i.note}>
            {i.basis === 'deterministic' ? 'can block' : i.basis === 'inference' ? 'review only' : 'escalate'}
          </span>
        </span>
      ))}
    </div>
  )
}

export function ConfidenceLegend({ value }: { value: number }) {
  return <ConfidenceBadge value={value} />
}
