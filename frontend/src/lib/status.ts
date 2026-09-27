import type {
  Decision,
  DimensionStatus,
  RiskLevel,
  Severity,
  TrustBasis,
  ChangeRequestStatus,
} from '@/types'

/**
 * Single source of truth for how a decision state is rendered.
 * Every status badge, dot, border and chart in the app reads from here so the
 * visual language never drifts between screens.
 */

export type Tone = {
  /** Text colour class. */
  text: string
  /** Border colour class. */
  border: string
  /** Background colour class. */
  bg: string
  /** Faint background for list rows. */
  soft: string
  /** Raw CSS colour, for canvas / SVG usage. */
  hex: string
  label: string
  glyph: string
}

export const decisionTone: Record<Decision, Tone> = {
  CLEARED: {
    text: 'text-pass',
    border: 'border-pass/40',
    bg: 'bg-pass/12',
    soft: 'bg-pass/5',
    hex: '#35d6a0',
    label: 'Cleared',
    glyph: '✓',
  },
  BLOCKED: {
    text: 'text-block',
    border: 'border-block/40',
    bg: 'bg-block/12',
    soft: 'bg-block/5',
    hex: '#fb7185',
    label: 'Blocked',
    glyph: '✕',
  },
  REVIEW_REQUIRED: {
    text: 'text-review',
    border: 'border-review/40',
    bg: 'bg-review/12',
    soft: 'bg-review/5',
    hex: '#f6b545',
    label: 'Review required',
    glyph: '⚠',
  },
}

export const dimensionTone: Record<DimensionStatus, Tone> = {
  pass: {
    text: 'text-pass',
    border: 'border-pass/40',
    bg: 'bg-pass/12',
    soft: 'bg-pass/5',
    hex: '#35d6a0',
    label: 'Pass',
    glyph: '✓',
  },
  review: {
    text: 'text-review',
    border: 'border-review/40',
    bg: 'bg-review/12',
    soft: 'bg-review/5',
    hex: '#f6b545',
    label: 'Review',
    glyph: '⚠',
  },
  block: {
    text: 'text-block',
    border: 'border-block/40',
    bg: 'bg-block/12',
    soft: 'bg-block/5',
    hex: '#fb7185',
    label: 'Fail',
    glyph: '✕',
  },
  unknown: {
    text: 'text-unknown',
    border: 'border-unknown/40',
    bg: 'bg-unknown/12',
    soft: 'bg-unknown/5',
    hex: '#22d3ee',
    label: 'Unknown',
    glyph: '?',
  },
  pending: {
    text: 'text-subtle',
    border: 'border-line',
    bg: 'bg-white/5',
    soft: 'bg-white/3',
    hex: '#64748b',
    label: 'Pending',
    glyph: '·',
  },
}

export const severityTone: Record<Severity, Tone> = {
  critical: { ...dimensionTone.block, label: 'Critical' },
  high: { ...dimensionTone.block, label: 'High' },
  medium: { ...dimensionTone.review, label: 'Medium' },
  low: { ...dimensionTone.unknown, label: 'Low' },
  info: { ...dimensionTone.pending, label: 'Info' },
}

export const riskTone: Record<RiskLevel, Tone> = {
  LOW: { ...dimensionTone.pass, label: 'Low' },
  MEDIUM: { ...dimensionTone.review, label: 'Medium' },
  HIGH: { ...dimensionTone.block, label: 'High' },
  CRITICAL: { ...dimensionTone.block, label: 'Critical' },
}

export const basisTone: Record<TrustBasis, Tone> = {
  deterministic: {
    text: 'text-pass',
    border: 'border-pass/40',
    bg: 'bg-pass/10',
    soft: 'bg-pass/5',
    hex: '#35d6a0',
    label: 'Deterministic',
    glyph: '⚙',
  },
  inference: {
    text: 'text-agent',
    border: 'border-agent/40',
    bg: 'bg-agent/10',
    soft: 'bg-agent/5',
    hex: '#a78bfa',
    label: 'AI inference',
    glyph: '✦',
  },
  unknown: {
    text: 'text-unknown',
    border: 'border-unknown/40',
    bg: 'bg-unknown/10',
    soft: 'bg-unknown/5',
    hex: '#22d3ee',
    label: 'Unknown',
    glyph: '?',
  },
}

export const statusTone: Record<ChangeRequestStatus, Tone> = {
  draft: { ...dimensionTone.pending, label: 'Draft' },
  analyzing: { ...dimensionTone.pending, label: 'Analyzing', hex: '#4d8dff', text: 'text-accent', border: 'border-accent/40', bg: 'bg-accent/12' },
  blocked: decisionTone.BLOCKED,
  review_required: decisionTone.REVIEW_REQUIRED,
  cleared: decisionTone.CLEARED,
  remediating: { ...dimensionTone.unknown, label: 'Remediating' },
  implementing: { ...dimensionTone.pending, label: 'Implementing', hex: '#4d8dff', text: 'text-accent', border: 'border-accent/40', bg: 'bg-accent/12' },
  verified: { ...decisionTone.CLEARED, label: 'Verified' },
  overridden: { ...dimensionTone.review, label: 'Overridden' },
}

export function dimensionColor(status: DimensionStatus): string {
  return dimensionTone[status].hex
}

export function confidenceLabel(c: number): string {
  if (c >= 0.9) return 'High'
  if (c >= 0.7) return 'Medium'
  if (c >= 0.5) return 'Low'
  return 'Speculative'
}
