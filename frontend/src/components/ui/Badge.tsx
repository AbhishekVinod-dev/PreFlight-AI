import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import {
  basisTone,
  confidenceLabel,
  decisionTone,
  dimensionTone,
  riskTone,
  severityTone,
  statusTone,
  type Tone,
} from '@/lib/status'
import type {
  ChangeRequestStatus,
  Decision,
  DimensionStatus,
  FindingCategory,
  RiskLevel,
  Severity,
  TrustBasis,
} from '@/types'

/** Neutral pill for counts, ids and metadata. */
export function Chip({
  children,
  className,
  mono,
}: {
  children: ReactNode
  className?: string
  mono?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border border-line bg-raised px-1.5 py-0.5 text-[10px] font-medium text-muted',
        mono && 'font-mono tracking-tight',
        className,
      )}
    >
      {children}
    </span>
  )
}

function Pill({ tone, children, className, mono }: { tone: Tone; children: ReactNode; className?: string; mono?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        tone.text,
        tone.border,
        tone.bg,
        mono && 'font-mono normal-case tracking-normal',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function StatusBadge({
  status,
  className,
  showGlyph = true,
}: {
  status: ChangeRequestStatus
  className?: string
  showGlyph?: boolean
}) {
  const tone = statusTone[status]
  return (
    <Pill tone={tone} className={className}>
      {showGlyph ? <span aria-hidden>{tone.glyph}</span> : null}
      {tone.label}
    </Pill>
  )
}

export function DecisionBadge({ decision, className }: { decision: Decision; className?: string }) {
  const tone = decisionTone[decision]
  return (
    <Pill tone={tone} className={className}>
      <span aria-hidden>{tone.glyph}</span>
      {tone.label}
    </Pill>
  )
}

export function DimensionBadge({
  status,
  label,
  className,
}: {
  status: DimensionStatus
  label?: string
  className?: string
}) {
  const tone = dimensionTone[status]
  return (
    <Pill tone={tone} className={className}>
      <span aria-hidden>{tone.glyph}</span>
      {label ?? tone.label}
    </Pill>
  )
}

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const tone = severityTone[severity]
  return (
    <Pill tone={tone} className={className}>
      {tone.label}
    </Pill>
  )
}

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  const tone = riskTone[level]
  return (
    <Pill tone={tone} className={className}>
      {tone.label}
    </Pill>
  )
}

/** Trust basis (PRD 15) - deterministic / AI inference / unknown. */
export function BasisBadge({ basis, className }: { basis: TrustBasis; className?: string }) {
  const tone = basisTone[basis]
  return (
    <Pill tone={tone} className={className}>
      <span aria-hidden>{tone.glyph}</span>
      {tone.label}
    </Pill>
  )
}

export function ConfidenceBadge({ value, className }: { value: number; className?: string }) {
  const label = confidenceLabel(value)
  const tone = value >= 0.9 ? dimensionTone.pass : value >= 0.7 ? dimensionTone.review : dimensionTone.unknown
  return (
    <Pill tone={tone} className={className} mono>
      {value.toFixed(2)} · {label}
    </Pill>
  )
}

const CATEGORY_LABEL: Record<FindingCategory, string> = {
  architecture: 'Architecture',
  contract: 'Contract',
  dependency: 'Dependency',
  impact: 'Impact',
  security: 'Security',
  'decision-memory': 'Decision memory',
  'dead-end': 'Dead-end',
  unknown: 'Unknown',
}

export function CategoryChip({ category, className }: { category: FindingCategory; className?: string }) {
  return <Chip className={className}>{CATEGORY_LABEL[category]}</Chip>
}

export { CATEGORY_LABEL }
