import { useEffect, useMemo, useState } from 'react'
import {
  Ban,
  CheckCircle2,
  FileCode2,
  Gavel,
  Package,
  ShieldAlert,
  ShieldQuestion,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/AppShell'
import { Panel, PanelBody, PanelHeader } from '@/components/ui/Panel'
import { Chip, SeverityBadge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Feedback'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { api } from '@/services/api'
import { cn } from '@/lib/cn'
import { compactNumber } from '@/lib/number'
import { EXTERNAL_CONSUMERS } from '@/data/repository'
import type { ArchitectureRule, DependencyRecord, Relationship, RuleEnforcement } from '@/types'

/**
 * 32 Architecture-as-code.
 *
 * The rules are shown twice on purpose: as a table a reviewer can scan, and as
 * the literal YAML the indexer reads. If those two ever disagree the gate is
 * lying, so the source of truth is right there next to the rendering.
 */
export default function PoliciesPage() {
  const [rules, setRules] = useState<ArchitectureRule[]>([])
  const [deps, setDeps] = useState<DependencyRecord[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [tab, setTab] = useState<'rules' | 'dependencies' | 'source'>('rules')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [r, d, g] = await Promise.all([api.getRules(), api.getDependencies(), api.getGraph()])
      if (!alive) return
      setRules(r)
      setDeps(d)
      setRelationships(g.relationships)
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  const violationsByRule = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of relationships) {
      if (r.violatedRuleId) m.set(r.violatedRuleId, (m.get(r.violatedRuleId) ?? 0) + 1)
    }
    return m
  }, [relationships])

  const architectureYaml = useMemo(() => renderArchitectureYaml(rules, violationsByRule), [rules, violationsByRule])
  const dependenciesYaml = useMemo(() => renderDependenciesYaml(deps), [deps])

  if (loading) {
    return (
      <>
        <PageHeader eyebrow="32 · Architecture-as-code" title="Policies" />
        <Skeleton className="h-96" />
      </>
    )
  }

  const blocking = rules.filter((r) => r.enforcement === 'block').length
  const forbidden = deps.filter((d) => d.policy === 'forbidden')
  const needsApproval = deps.filter((d) => d.policy === 'approval-required')
  const deprecated = deps.filter((d) => d.deprecated)

  return (
    <>
      <PageHeader
        eyebrow="32 · Architecture-as-code"
        title="Rules and policies"
        description="The same files the indexer reads at run time. A rule can block, request review, or warn; only deterministic rule hits ever hard-block."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Rules" value={rules.length} hint={`${blocking} block · ${rules.length - blocking} review`} />
        <Tile label="Forbidden packages" value={forbidden.length} hint="cannot be added" tone="block" />
        <Tile label="Approval required" value={needsApproval.length} hint="policy gate" tone="review" />
        <Tile label="Deprecated in use" value={deprecated.length} hint="still in the lockfile" tone="review" />
      </div>

      <SegmentedTab
        value={tab}
        onChange={setTab}
        options={[
          { key: 'rules', label: 'Rules', count: rules.length, icon: <Gavel className="size-3.5" /> },
          { key: 'dependencies', label: 'Dependencies', count: deps.length, icon: <Package className="size-3.5" /> },
          { key: 'source', label: 'Source files', icon: <FileCode2 className="size-3.5" /> },
        ]}
      />

      {tab === 'rules' ? (
        <div className="space-y-4">
          <Panel flush>
            <PanelHeader
              eyebrow="Layer permissions"
              title="Enforced rules"
              description="Ordered by severity. `block` rules stop implementation; `review` and `warn` route to a human."
            />
            <ul className="divide-y divide-line">
              {rules.map((r) => (
                <RuleRow key={r.id} rule={r} violations={violationsByRule.get(r.id) ?? 0} />
              ))}
            </ul>
          </Panel>

          <Panel>
            <PanelHeader
              eyebrow="Trust model"
              title="Why only some rules can block"
              description="A blocking verdict must be reproducible from the repository, so inference-based findings are structurally incapable of producing one."
            />
            <PanelBody className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  icon: <CheckCircle2 className="size-4" />,
                  tone: 'text-pass',
                  title: 'Deterministic',
                  body: 'Import graphs, lockfile entries and policy matches. These can hard-block.',
                },
                {
                  icon: <ShieldAlert className="size-4" />,
                  tone: 'text-agent',
                  title: 'AI inference',
                  body: 'Plausible but unproven. Always routes to review, never blocks on its own.',
                },
                {
                  icon: <ShieldQuestion className="size-4" />,
                  tone: 'text-unknown',
                  title: 'Unknown',
                  body: 'The repository cannot answer. Escalated to a human instead of guessed.',
                },
              ].map((c) => (
                <div key={c.title} className="rounded-md border border-line bg-canvas/50 p-3">
                  <p className={cn('flex items-center gap-2 text-xs font-medium', c.tone)}>
                    {c.icon}
                    {c.title}
                  </p>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-subtle">{c.body}</p>
                </div>
              ))}
            </PanelBody>
          </Panel>
        </div>
      ) : tab === 'dependencies' ? (
        <div className="space-y-4">
          <Panel flush>
            <PanelHeader
              eyebrow="policies/dependencies.yaml"
              title="Dependency policy"
              description="Matched against the lockfile on every run. `forbidden` blocks, `approval-required` routes to review."
            />
            <ul className="divide-y divide-line">
              {deps.map((d) => (
                <DependencyRow key={d.name} dep={d} />
              ))}
            </ul>
          </Panel>

          {EXTERNAL_CONSUMERS.length > 0 ? (
            <Panel>
              <PanelHeader
                eyebrow="Blast radius"
                title="Consumers outside this repository"
                description="The gate cannot read their code. It can only reason about the contract, so it reports low confidence instead of guessing."
              />
              <PanelBody className="flex flex-wrap gap-1.5">
                {EXTERNAL_CONSUMERS.map((e) => (
                  <span
                    key={e.name}
                    className="inline-flex items-center gap-1.5 rounded border border-line bg-raised px-2 py-1 font-mono text-[11px] text-muted"
                  >
                    {e.name}
                    <Chip>{e.kind}</Chip>
                  </span>
                ))}
              </PanelBody>
            </Panel>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel flush>
            <PanelHeader
              eyebrow="Read by the indexer"
              title="policies/architecture.yaml"
              description="Layer permissions, forbidden edges and the enforcement level of each rule."
            />
            <CodeBlock code={architectureYaml} path="policies/architecture.yaml" maxHeight={620} />
          </Panel>
          <Panel flush>
            <PanelHeader
              eyebrow="Read by the indexer"
              title="policies/dependencies.yaml"
              description="Package policy, deprecation and the internal alternative the guardian looks for. `forbidden` and `approval-required` both block; only a recorded approver clears the latter."
            />
            <CodeBlock code={dependenciesYaml} path="policies/dependencies.yaml" maxHeight={620} />
          </Panel>
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ *
 * Rows
 * ------------------------------------------------------------------ */

const ENFORCEMENT_COPY: Record<RuleEnforcement, { label: string; tone: string; note: string }> = {
  block: { label: 'Blocks', tone: 'text-block', note: 'Implementation cannot start while this is violated.' },
  review: { label: 'Review', tone: 'text-review', note: 'Routes to a human approver; never hard-blocks on its own.' },
  warn: { label: 'Warn', tone: 'text-subtle', note: 'Recorded in the report, no approval required.' },
}

function RuleRow({ rule, violations }: { rule: ArchitectureRule; violations: number }) {
  const e = ENFORCEMENT_COPY[rule.enforcement]
  return (
    <li className="flex flex-wrap items-start gap-4 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip mono>{rule.id}</Chip>
          <SeverityBadge severity={rule.severity} />
          <Chip className={e.tone}>{e.label}</Chip>
          {violations > 0 ? <Chip className="text-block">{violations} present</Chip> : null}
          {!rule.enabled ? <Chip>disabled</Chip> : null}
        </div>
        <p className="mt-1.5 text-sm text-fg">{rule.description}</p>
        <p className="mt-1 font-mono text-[11px] text-accent">{rule.expression}</p>
        <p className="mt-1 text-[11px] text-subtle">{e.note}</p>
      </div>
      <Chip className="shrink-0 capitalize">{rule.ruleType.replace(/-/g, ' ')}</Chip>
    </li>
  )
}

const POLICY_TONE: Record<DependencyRecord['policy'], { label: string; tone: string; icon: React.ReactNode }> = {
  allowed: { label: 'Allowed', tone: 'text-pass', icon: <CheckCircle2 className="size-3" /> },
  'approval-required': { label: 'Approval required', tone: 'text-review', icon: <ShieldAlert className="size-3" /> },
  forbidden: { label: 'Forbidden', tone: 'text-block', icon: <Ban className="size-3" /> },
}

function DependencyRow({ dep }: { dep: DependencyRecord }) {
  const p = POLICY_TONE[dep.policy]
  return (
    <li className="flex flex-wrap items-start gap-4 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-xs font-medium text-fg">{dep.name}</span>
          <Chip mono>{dep.version}</Chip>
          <Chip>{dep.scope}</Chip>
          {dep.deprecated ? <Chip className="text-review">deprecated</Chip> : null}
        </div>
        <p className={cn('mt-1.5 flex items-center gap-1.5 text-xs', p.tone)}>
          {p.icon}
          {p.label}
        </p>
        {dep.replacedBy ? (
          <p className="mt-0.5 text-[11px] text-subtle">Replaced by {dep.replacedBy}</p>
        ) : null}
        {dep.internalAlternative ? (
          <p className="mt-0.5 text-[11px] text-accent">
            Internal alternative already exists: {dep.internalAlternative}
          </p>
        ) : null}
      </div>
      <div className="shrink-0 text-right text-[11px] text-subtle">
        <p className="font-mono text-muted">{dep.license}</p>
        <p className="tabular">{compactNumber(dep.weeklyDownloads)}/wk</p>
      </div>
    </li>
  )
}

function Tile({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: number
  hint?: string
  tone?: 'block' | 'review'
}) {
  return (
    <div className="panel p-4">
      <p className="eyebrow">{label}</p>
      <p
        className={cn(
          'tabular mt-1.5 text-2xl font-semibold leading-none',
          tone === 'block' ? 'text-block' : tone === 'review' ? 'text-review' : 'text-fg',
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-[11px] text-subtle">{hint}</p> : null}
    </div>
  )
}

function SegmentedTab<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { key: T; label: string; count?: number; icon?: React.ReactNode }[]
}) {
  return (
    <div className="mb-4 flex items-center gap-1 border-b border-line">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          aria-current={value === o.key}
          className={cn(
            'flex items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors',
            value === o.key
              ? 'border-accent text-fg'
              : 'border-transparent text-subtle hover:text-muted',
          )}
        >
          {o.icon}
          {o.label}
          {o.count !== undefined ? (
            <span className="tabular rounded bg-raised px-1.5 py-px font-mono text-[10px] text-muted">
              {o.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * YAML rendering - derived from the same objects the engine evaluates,
 * so the displayed policy can never drift from the enforced policy.
 * ------------------------------------------------------------------ */

function yamlValue(v: string | number | boolean): string {
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return /^[A-Za-z0-9_./-]+$/.test(v) ? v : JSON.stringify(v)
}

function renderArchitectureYaml(rules: ArchitectureRule[], violations: Map<string, number>): string {
  const lines: string[] = [
    '# Architecture-as-code - read by the repository indexer at run time.',
    '# Every rule below is evaluated against the indexed knowledge graph.',
    'version: 1',
    '',
  ]

  const byType = new Map<string, ArchitectureRule[]>()
  for (const r of rules) {
    if (!byType.has(r.ruleType)) byType.set(r.ruleType, [])
    byType.get(r.ruleType)!.push(r)
  }

  for (const [type, group] of byType) {
    lines.push(`${type}:`)
    for (const r of group) {
      const present = violations.get(r.id) ?? 0
      lines.push(`  - id: ${r.id}`)
      lines.push(`    description: ${JSON.stringify(r.description)}`)
      lines.push(`    expression: ${JSON.stringify(r.expression)}`)
      lines.push(`    severity: ${r.severity}`)
      lines.push(`    enforcement: ${r.enforcement}`)
      lines.push(`    enabled: ${r.enabled}`)
      if (present > 0) lines.push(`    # ${present} violation(s) already present in the indexed graph`)
    }
    lines.push('')
  }

  lines.push('# Enforcement levels:')
  lines.push('#   block  - deterministic violation stops implementation')
  lines.push('#   review - routes to a human approver, never blocks alone')
  lines.push('#   warn   - recorded only')
  lines.push('')
  lines.push('# Only findings with basis=deterministic can produce a block.')
  return lines.join('\n')
}

function renderDependenciesYaml(deps: DependencyRecord[]): string {
  const lines: string[] = [
    '# Dependency policy - matched against the lockfile on every pre-flight run.',
    'version: 1',
    '',
    'policy:',
  ]

  for (const d of deps) {
    lines.push(`  - name: ${yamlValue(d.name)}`)
    lines.push(`    policy: ${d.policy}`)
    if (d.deprecated) {
      lines.push('    deprecated: true')
      if (d.replacedBy) lines.push(`    replaced_by: ${JSON.stringify(d.replacedBy)}`)
    }
    if (d.license) lines.push(`    license: ${yamlValue(d.license)}`)
    if (d.internalAlternative) {
      lines.push(`    internal_alternative: ${JSON.stringify(d.internalAlternative)}`)
    }
  }

  lines.push('')
  lines.push('# The guardian also searches the component index for an existing')
  lines.push('# internal abstraction before it reports a new dependency.')
  return lines.join('\n')
}
