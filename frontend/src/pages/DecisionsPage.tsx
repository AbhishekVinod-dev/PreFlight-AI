import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, CircleSlash, Clock, FileText, ScrollText, Users, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/layout/AppShell'
import { Panel, PanelBody, PanelHeader } from '@/components/ui/Panel'
import { Chip } from '@/components/ui/Badge'
import { EmptyState, Skeleton } from '@/components/ui/Feedback'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { api } from '@/services/api'
import { cn } from '@/lib/cn'
import type { Adr, AdrStatus } from '@/types'

/**
 * 9.9 Architecture decision records.
 *
 * An ADR is only useful if a change cannot quietly reverse it, so this screen
 * pairs the record with the entities it constrains - the terms the decision
 * memory detector looks for in a proposal.
 */

const STATUS_TONE: Record<AdrStatus, { tone: string; icon: React.ReactNode }> = {
  Accepted: { tone: 'text-pass', icon: <CheckCircle2 className="size-3" /> },
  Proposed: { tone: 'text-review', icon: <Clock className="size-3" /> },
  Deprecated: { tone: 'text-subtle', icon: <CircleSlash className="size-3" /> },
  Superseded: { tone: 'text-subtle', icon: <ScrollText className="size-3" /> },
  Rejected: { tone: 'text-block', icon: <XCircle className="size-3" /> },
}

const FILTERS = ['All', 'Accepted', 'Proposed', 'Deprecated', 'Superseded', 'Rejected'] as const

export default function DecisionsPage() {
  const [adrs, setAdrs] = useState<Adr[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All')
  const [openId, setOpenId] = useState<string>()

  useEffect(() => {
    let alive = true
    ;(async () => {
      const a = await api.getAdrs()
      if (!alive) return
      setAdrs(a)
      setOpenId(a[0]?.id)
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  const visible = useMemo(
    () => (filter === 'All' ? adrs : adrs.filter((a) => a.status === filter)),
    [adrs, filter],
  )

  const open = adrs.find((a) => a.id === openId) ?? visible[0]

  if (loading) {
    return (
      <>
        <PageHeader eyebrow="9.9 · Decision memory" title="Architecture decision records" />
        <Skeleton className="h-96" />
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="9.9 · Decision memory"
        title="Architecture decision records"
        description="Why the system looks the way it does. Every proposal is checked against these records, so a rejected alternative cannot be reintroduced silently."
      />

      <div className="mb-4 flex flex-wrap items-center gap-1 border-b border-line">
        {FILTERS.map((f) => {
          const count = f === 'All' ? adrs.length : adrs.filter((a) => a.status === f).length
          if (count === 0 && f !== 'All') return null
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-current={filter === f}
              className={cn(
                'flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors',
                filter === f ? 'border-accent text-fg' : 'border-transparent text-subtle hover:text-muted',
              )}
            >
              {f}
              <span className="tabular rounded bg-raised px-1.5 py-px font-mono text-[10px] text-muted">{count}</span>
            </button>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Panel flush>
          <PanelHeader
            eyebrow="Records"
            title={`${visible.length} decision${visible.length === 1 ? '' : 's'}`}
            description="Newest first. Select one to read the full record and the file it came from."
          />
          {visible.length === 0 ? (
            <EmptyState icon={<ScrollText className="size-5" />} title="No records with that status" />
          ) : (
            <ul className="max-h-[42rem] divide-y divide-line overflow-y-auto">
              {visible.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(a.id)}
                    className={cn(
                      'w-full px-4 py-3 text-left transition-colors hover:bg-raised/50',
                      open?.id === a.id && 'bg-raised shadow-[inset_2px_0_0_0_var(--color-accent)]',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Chip mono>{a.id}</Chip>
                      <span className={cn('flex items-center gap-1 text-[11px]', STATUS_TONE[a.status].tone)}>
                        {STATUS_TONE[a.status].icon}
                        {a.status}
                      </span>
                      <span className="ml-auto shrink-0 font-mono text-[10px] text-subtle">{a.date}</span>
                    </div>
                    <p className="mt-1.5 text-sm font-medium leading-snug text-fg">{a.title}</p>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-subtle">{a.decision}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* ------------------------------------------------- Full record */}
        {open ? (
          <div className="space-y-4">
            <Panel>
              <PanelHeader
                eyebrow={`${open.id} · ${open.status} · ${open.date}`}
                title={open.title}
                description={`Authored by ${open.author}`}
                action={
                  <span className={cn('flex items-center gap-1 text-[11px]', STATUS_TONE[open.status].tone)}>
                    {STATUS_TONE[open.status].icon}
                    {open.status}
                  </span>
                }
              />
              <PanelBody className="space-y-4">
                <div>
                  <p className="eyebrow">Decision</p>
                  <p className="mt-1 text-sm leading-relaxed text-fg">{open.decision}</p>
                </div>
                <div>
                  <p className="eyebrow">Reasoning</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{open.reason}</p>
                </div>

                <div>
                  <p className="eyebrow">Rejected alternatives</p>
                  <ul className="mt-1.5 space-y-1">
                    {open.alternatives.map((alt) => (
                      <li key={alt} className="flex items-start gap-2 text-xs text-muted">
                        <XCircle className="mt-0.5 size-3 shrink-0 text-block/70" />
                        {alt}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] leading-relaxed text-subtle">
                    A proposal that reintroduces one of these is reported as a decision-memory conflict
                    rather than treated as a new idea.
                  </p>
                </div>

                <div>
                  <p className="eyebrow">Constrained entities</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {open.constrains.map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1 rounded border border-line bg-canvas/60 px-1.5 py-0.5 font-mono text-[10px] text-muted"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-subtle">
                    <FileText className="mt-0.5 size-3 shrink-0" />
                    These are the terms matched against change intent. Naming the technology in a change
                    request is what triggers the conflict check.
                  </p>
                </div>

                {open.supersedes ? (
                  <p className="rounded-md border border-line bg-canvas/60 p-3 text-xs text-muted">
                    Supersedes {open.supersedes}
                  </p>
                ) : null}
              </PanelBody>
            </Panel>

            <Panel flush>
              <PanelHeader
                eyebrow="Source"
                title={`docs/adr/${open.id.toLowerCase()}.md`}
                description="The record as it exists in the repository. The indexer parses status, decision, rationale and rejected alternatives from this file."
                action={
                  <span className="inline-flex items-center gap-1 text-[11px] text-subtle">
                    <Users className="size-3" />
                    {open.author}
                  </span>
                }
              />
              <CodeBlock
                code={adrMarkdown(open)}
                path={`docs/adr/${open.id.toLowerCase()}.md`}
                maxHeight={360}
              />
            </Panel>
          </div>
        ) : (
          <Panel>
            <EmptyState icon={<ScrollText className="size-6" />} title="Select a record" />
          </Panel>
        )}
      </div>
    </>
  )
}

/**
 * Render the record in its on-disk Markdown shape. The decision-memory
 * detector parses exactly these sections, so showing them makes the parsing
 * contract visible rather than implied.
 */
function adrMarkdown(a: Adr): string {
  return [
    `# ${a.id} — ${a.title}`,
    '',
    `- Status: ${a.status}`,
    `- Date: ${a.date}`,
    `- Author: ${a.author}`,
    a.supersedes ? `- Supersedes: ${a.supersedes}` : null,
    '',
    '## Decision',
    '',
    a.decision,
    '',
    '## Reasoning',
    '',
    a.reason,
    '',
    '## Rejected alternatives',
    '',
    ...a.alternatives.flatMap((alt) => [`- ${alt}`, '']),
    '## Constrained entities',
    '',
    ...a.constrains.map((c) => `- \`${c}\``),
    '',
  ]
    .filter((l): l is string => l !== null)
    .join('\n')
}
