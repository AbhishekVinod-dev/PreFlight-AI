import { Link } from 'react-router-dom'
import { ChevronRight, Loader2 } from 'lucide-react'
import type { AnalysisDimensionResult, Finding, PreflightRun } from '@/types'
import { cn } from '@/lib/cn'
import { dimensionTone } from '@/lib/status'
import { duration } from '@/lib/format'
import { DimensionBadge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/Feedback'

/**
 * The per-dimension rollup shown on the results screen (PRD 9.11 / 16):
 *
 *   Architecture       PASS
 *   Contracts          FAIL
 *   Dependencies       REVIEW
 */
export function DimensionStrip({
  run,
  findings,
  linkFindings = true,
}: {
  run: PreflightRun
  findings: Finding[]
  linkFindings?: boolean
}) {
  return (
    <ul className="divide-y divide-line">
      {run.dimensions
        .filter((d) => d.dimension !== 'repository')
        .map((d) => (
          <DimensionRow
            key={d.dimension}
            result={d}
            findings={findings.filter((f) => d.findingIds.includes(f.id))}
            runId={run.id}
            linkFindings={linkFindings}
          />
        ))}
    </ul>
  )
}

function DimensionRow({
  result,
  findings,
  runId,
  linkFindings,
}: {
  result: AnalysisDimensionResult
  findings: Finding[]
  runId: string
  linkFindings: boolean
}) {
  const tone = dimensionTone[result.status]
  const blocking = findings.filter((f) => f.blocking).length
  const detail =
    findings.length > 0
      ? `${findings.length} finding${findings.length === 1 ? '' : 's'}${blocking ? ` · ${blocking} blocking` : ''}`
      : 'No findings'

  return (
    <li className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-raised/40">
      <span
        className="grid size-6 shrink-0 place-items-center rounded border text-[11px] font-bold"
        style={{
          color: tone.hex,
          borderColor: `color-mix(in oklab, ${tone.hex} 40%, transparent)`,
          backgroundColor: `color-mix(in oklab, ${tone.hex} 12%, transparent)`,
        }}
        aria-hidden
      >
        {result.status === 'pending' ? <Loader2 className="size-3 animate-spin" /> : tone.glyph}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="text-sm font-medium text-fg">{result.label}</p>
          <span className="hidden font-mono text-[10px] text-subtle sm:inline">{result.agent}</span>
        </div>
        <p className="truncate text-xs text-muted" title={result.summary}>
          {result.summary}
        </p>
      </div>

      <div className="hidden w-20 text-right sm:block">
        <p className="tabular text-[11px] text-subtle">{result.inspected.toLocaleString()} read</p>
        <p className="tabular text-[11px] text-subtle">{duration(result.durationMs)}</p>
      </div>

      <div className="w-28 shrink-0 text-right">
        <p className="text-[11px] text-subtle">{detail}</p>
        <ProgressBar value={result.inspected / 4000} status={result.status} className="mt-1" />
      </div>

      <div className="w-24 shrink-0 text-right">
        <DimensionBadge status={result.status} />
      </div>

      {linkFindings && findings.length > 0 ? (
        <Link
          to={`/runs/${runId}/findings?dimension=${result.dimension}`}
          aria-label={`View ${result.label} findings`}
          className="shrink-0 rounded p-1 text-subtle transition-colors hover:bg-raised hover:text-fg"
        >
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className={cn('w-4 shrink-0')} />
      )}
    </li>
  )
}
