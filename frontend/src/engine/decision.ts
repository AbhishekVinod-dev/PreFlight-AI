import type {
  AnalysisDimension,
  AnalysisDimensionResult,
  Decision,
  DimensionStatus,
  Finding,
  RiskBreakdown,
  RiskFactor,
  RiskLevel,
  Severity,
} from '@/types'

/**
 * 9.11 Pre-Flight Decision Engine + 14. Risk Model.
 *
 * Deterministic policy first, probabilistic reasoning second. A hard block is
 * only ever produced by a deterministic finding - AI inference and unknowns
 * can raise the decision to REVIEW, never to BLOCK (PRD 28).
 */

const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 14,
  high: 9,
  medium: 4,
  low: 1.5,
  info: 0.5,
}

/* ------------------------------------------------------------------ *
 * Risk
 * ------------------------------------------------------------------ */

interface RiskDimension {
  key: string
  label: string
  max: number
  categories: string[]
}

const RISK_DIMENSIONS: RiskDimension[] = [
  { key: 'architecture', label: 'Architecture impact', max: 25, categories: ['architecture', 'dead-end', 'decision-memory'] },
  { key: 'contract', label: 'Contract impact', max: 20, categories: ['contract'] },
  { key: 'dependency', label: 'Dependency impact', max: 15, categories: ['dependency'] },
  { key: 'security', label: 'Security impact', max: 20, categories: ['security'] },
  { key: 'surface', label: 'Change surface', max: 12, categories: ['impact'] },
  { key: 'uncertainty', label: 'Uncertainty', max: 8, categories: ['unknown'] },
]

export function computeRisk(findings: Finding[], affectedFileCount: number): RiskBreakdown {
  const factors: RiskFactor[] = []

  for (const dim of RISK_DIMENSIONS) {
    const scoped = findings.filter((f) => dim.categories.includes(f.category))
    let weight = scoped.reduce((sum, f) => sum + SEVERITY_WEIGHT[f.severity], 0)

    if (dim.key === 'surface') {
      // Surface scales with blast radius, independent of finding count.
      const byFiles = Math.min(dim.max, affectedFileCount * 0.35)
      weight = Math.min(dim.max, Math.max(weight, byFiles))
    }

    if (dim.key === 'uncertainty') {
      // Uncertainty is the inverse of confidence: low-confidence and
      // unknown-basis findings are what force a human into the loop.
      const lowConfidence = findings.filter((f) => f.confidence < 0.7 && f.category !== 'unknown').length
      weight = Math.min(dim.max, scoped.length * 3 + lowConfidence * 2)
    }

    const capped = Math.min(dim.max, weight)
    factors.push({
      key: dim.key,
      label: dim.label,
      weight: Math.round(capped * 10) / 10,
      max: dim.max,
      detail: describeFactor(dim, scoped, affectedFileCount, capped),
    })
  }

  const score = Math.min(100, Math.round(factors.reduce((s, f) => s + f.weight, 0)))
  let level: RiskLevel =
    score >= 75 ? 'CRITICAL' : score >= 50 ? 'HIGH' : score >= 25 ? 'MEDIUM' : 'LOW'

  // Floor the level from hard evidence so a modest score cannot hide a
  // confirmed policy violation.
  if (findings.some((f) => f.blocking && f.basis === 'deterministic')) {
    if (level === 'LOW') level = 'HIGH'
    if (findings.some((f) => f.blocking && f.severity === 'critical')) level = 'CRITICAL'
  }

  const drivers = factors
    .filter((f) => f.weight > 0)
    .sort((a, b) => b.weight / b.max - a.weight / a.max)
    .slice(0, 3)
    .map((f) => `${f.label} (${f.weight}/${f.max})`)

  return { level, score, factors, drivers }
}

function describeFactor(dim: RiskDimension, scoped: Finding[], files: number, value: number): string {
  if (value === 0) return 'No contribution.'
  if (dim.key === 'surface') return `${files} file${files === 1 ? '' : 's'} in the blast radius, estimated from graph reachability.`
  if (dim.key === 'uncertainty') {
    return `${scoped.length} unverified area${scoped.length === 1 ? '' : 's'} where repository evidence was insufficient.`
  }
  const blocking = scoped.filter((f) => f.blocking).length
  return `${scoped.length} finding${scoped.length === 1 ? '' : 's'} (${blocking} blocking) across ${scoped
    .map((f) => f.category)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(', ')}.`
}

/* ------------------------------------------------------------------ *
 * Decision
 * ------------------------------------------------------------------ */

export function decide(findings: Finding[]): { decision: Decision; rationale: string } {
  const blockingDeterministic = findings.filter((f) => f.blocking && f.basis === 'deterministic')
  if (blockingDeterministic.length > 0) {
    return {
      decision: 'BLOCKED',
      rationale: `${blockingDeterministic.length} enforced rule${blockingDeterministic.length === 1 ? '' : 's'} violated with deterministic evidence.`,
    }
  }

  // A blocking flag without deterministic evidence is a policy error; the safe
  // reading is "ask a human", never "allow".
  const blockingUnverified = findings.filter((f) => f.blocking && f.basis !== 'deterministic')
  if (blockingUnverified.length > 0) {
    return {
      decision: 'REVIEW_REQUIRED',
      rationale: `${blockingUnverified.length} finding${blockingUnverified.length === 1 ? '' : 's'} marked blocking but based on inference. Held for human approval rather than allowed or hard-blocked.`,
    }
  }

  const notable = findings.filter(
    (f) => f.severity === 'critical' || f.severity === 'high' || f.basis === 'unknown' || f.confidence < 0.7,
  )
  if (notable.length > 0) {
    return {
      decision: 'REVIEW_REQUIRED',
      rationale: `No enforced rule violated, but ${notable.length} high-impact or unverified finding${notable.length === 1 ? '' : 's'} need human approval.`,
    }
  }

  if (findings.some((f) => f.severity === 'medium')) {
    return { decision: 'REVIEW_REQUIRED', rationale: 'Change is plausible but touches more than one surface. Approval recommended.' }
  }

  return { decision: 'CLEARED', rationale: 'No blocking, high-severity or unverified findings. Implementation may proceed.' }
}

/* ------------------------------------------------------------------ *
 * Per-dimension rollup
 * ------------------------------------------------------------------ */

const DIMENSION_META: Record<AnalysisDimension, { label: string; agent: string; categories: string[] }> = {
  repository: { label: 'Repository', agent: 'Index context loader', categories: [] },
  architecture: { label: 'Architecture', agent: 'Architecture Explorer', categories: ['architecture', 'dead-end', 'decision-memory'] },
  contracts: { label: 'Contracts', agent: 'Contract Explorer', categories: ['contract', 'unknown'] },
  dependencies: { label: 'Dependencies', agent: 'Dependency Explorer', categories: ['dependency'] },
  impact: { label: 'Impact', agent: 'Impact Explorer', categories: ['impact'] },
  security: { label: 'Security', agent: 'Security Explorer', categories: ['security'] },
}

const PASS_SUMMARY: Record<AnalysisDimension, string> = {
  repository: 'Knowledge graph loaded and current.',
  architecture: 'No layer, boundary or decision-record violations found.',
  contracts: 'No contract is modified in a breaking way.',
  dependencies: 'No policy or deprecation violation found.',
  impact: 'Change surface is contained; no downstream edits required.',
  security: 'No authentication, credential or data-flow concerns found.',
}

export function buildDimensions(
  findings: Finding[],
  notes: Partial<Record<AnalysisDimension, string>>,
  inspected: Partial<Record<AnalysisDimension, number>>,
  durations: Partial<Record<AnalysisDimension, number>>,
): AnalysisDimensionResult[] {
  return (Object.keys(DIMENSION_META) as AnalysisDimension[]).map((dimension) => {
    const meta = DIMENSION_META[dimension]
    const scoped = findings.filter((f) => meta.categories.includes(f.category))
    const status = statusFor(scoped)
    const summary = notes[dimension] ?? summarise(scoped) ?? PASS_SUMMARY[dimension]

    return {
      dimension,
      label: meta.label,
      status,
      findingIds: scoped.map((f) => f.id),
      summary,
      durationMs: durations[dimension] ?? 0,
      inspected: inspected[dimension] ?? (dimension === 'repository' ? 3841 : 0),
      agent: meta.agent,
    }
  })
}

function statusFor(scoped: Finding[]): DimensionStatus {
  if (scoped.length === 0) return 'pass'
  if (scoped.some((f) => f.blocking)) return 'block'
  if (scoped.some((f) => f.severity === 'critical' || f.severity === 'high' || f.basis === 'unknown' || f.confidence < 0.7)) return 'review'
  return 'pass'
}

function summarise(scoped: Finding[]): string | undefined {
  if (scoped.length === 0) return undefined
  const worst = [...scoped].sort((a, b) => SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity])[0]
  const others = scoped.length - 1
  return others === 0 ? worst.title : `${worst.title} (+${others} lower-severity finding${others === 1 ? '' : 's'})`
}
