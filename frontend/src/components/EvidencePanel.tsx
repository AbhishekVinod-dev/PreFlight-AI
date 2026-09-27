import { useMemo, useState } from 'react'
import Editor, { DiffEditor } from '@monaco-editor/react'
import { Ban, ChevronDown, FileCode2, Lightbulb, Link2, ShieldQuestion, Users } from 'lucide-react'
import type { EvidenceRef, Finding } from '@/types'
import { cn } from '@/lib/cn'
import { adrById, contractById, ruleById } from '@/data/repository'
import { fileContent, languageOf } from '@/data/snippets'
import { CATEGORY_AGENT } from '@/engine/detectors'
import { BasisBadge, CategoryChip, ConfidenceBadge, SeverityBadge } from '@/components/ui/Badge'
import { Panel, PanelBody, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { shortPath } from '@/lib/format'

/**
 * 9.12 Evidence Explorer.
 *
 * PRD: "AI-generated governance without evidence is difficult to trust."
 * Every finding is rendered with the rule it hit, the files that prove it, the
 * consumers it reaches, the contract it affects, and its confidence.
 */
export function EvidencePanel({ finding }: { finding: Finding }) {
  const [active, setActive] = useState<EvidenceRef>(finding.evidence[0] ?? { path: '' })
  const [showDiff, setShowDiff] = useState(false)

  const rule = finding.ruleId ? ruleById(finding.ruleId) : undefined
  const contract = finding.contractId ? contractById(finding.contractId) : undefined
  const adr = finding.headline === 'ARCHITECTURAL DECISION CONFLICT' ? adrById('ADR-014') : undefined

  const content = useMemo(() => (active.path ? fileContent(active.path) : ''), [active.path])
  const language = active.path ? languageOf(active.path) : 'plaintext'

  if (finding.evidence.length === 0) {
    return (
      <Panel>
        <PanelHeader eyebrow={finding.id} title="No repository evidence" />
        <PanelBody>
          <p className="text-sm leading-relaxed text-muted">{finding.explanation}</p>
        </PanelBody>
      </Panel>
    )
  }

  return (
    <div className="space-y-4">
      {/* ---------------------------------------------------------- Verdict */}
      <Panel>
        <PanelHeader
          eyebrow={`${finding.id} · ${CATEGORY_AGENT[finding.category] ?? 'Pre-Flight'}`}
          title={finding.title}
          action={
            <div className="flex items-center gap-1.5">
              <SeverityBadge severity={finding.severity} />
              <BasisBadge basis={finding.basis} />
            </div>
          }
        />
        <PanelBody className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryChip category={finding.category} />
            <ConfidenceBadge value={finding.confidence} />
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                finding.blocking
                  ? 'border-block/40 bg-block/12 text-block'
                  : 'border-line bg-raised text-muted',
              )}
            >
              {finding.blocking ? <Ban className="size-3" /> : null}
              {finding.blocking ? 'Blocking' : 'Non-blocking'}
            </span>
            {finding.headline ? (
              <span className="inline-flex items-center gap-1 rounded border border-line bg-canvas px-2 py-0.5 font-mono text-[10px] uppercase text-muted">
                {finding.headline}
              </span>
            ) : null}
          </div>

          <p className="text-sm leading-relaxed text-muted">{finding.explanation}</p>

          {rule ? (
            <div className="rounded-md border border-line bg-canvas/60 p-3">
              <p className="eyebrow">Rule · {rule.id}</p>
              <p className="mt-1 text-sm text-fg">{rule.description}</p>
              <p className="mt-1 font-mono text-[11px] text-subtle">
                {rule.expression} · {rule.enforcement} · {rule.severity}
              </p>
            </div>
          ) : null}

          {adr ? (
            <div className="rounded-md border border-review/40 bg-review/[0.06] p-3">
              <p className="eyebrow text-review">Decision conflict · {adr.id}</p>
              <p className="mt-1 text-sm text-fg">{adr.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{adr.reason}</p>
              <p className="mt-1.5 text-[11px] text-subtle">
                Rejected alternatives: {adr.alternatives.join(', ')}
              </p>
            </div>
          ) : null}

          {contract ? (
            <div className="rounded-md border border-line bg-canvas/60 p-3">
              <p className="eyebrow">Contract · {contract.type}</p>
              <p className="mt-1 text-sm text-fg">
                {contract.name} <span className="font-mono text-xs text-subtle">v{contract.version}</span>
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-subtle">
                <span className="font-mono">{contract.source}</span>
                <span>{contract.consumers.length} consumers</span>
                <span>{contract.isPublic ? 'public contract' : 'internal contract'}</span>
              </p>
            </div>
          ) : null}
        </PanelBody>
      </Panel>

      {/* -------------------------------------------------------- Evidence */}
      <Panel flush>
        <PanelHeader
          eyebrow="9.12 · Evidence explorer"
          title="Source evidence"
          description="Every claim above is traceable to these files. The active file opens in the editor."
          action={
            <Button size="sm" variant="secondary" onClick={() => setShowDiff((v) => !v)}>
              {showDiff ? 'Show file' : 'Show as diff'}
            </Button>
          }
        />

        {/* File picker */}
        <ul className="max-h-40 divide-y divide-line overflow-y-auto border-b border-line">
          {finding.evidence.map((ref) => {
            const isActive = ref.path === active.path && ref.line === active.line
            return (
              <li key={`${ref.path}:${ref.line ?? 0}`}>
                <button
                  type="button"
                  onClick={() => setActive(ref)}
                  className={cn(
                    'flex w-full items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-raised/60',
                    isActive && 'bg-raised',
                  )}
                >
                  <FileCode2 className="size-3.5 shrink-0 text-subtle" />
                  <span className="truncate font-mono text-[11px] text-fg">{ref.path}</span>
                  {ref.line ? (
                    <span className="tabular shrink-0 font-mono text-[11px] text-accent">:{ref.line}</span>
                  ) : null}
                  {ref.symbol ? (
                    <span className="ml-auto shrink-0 truncate font-mono text-[10px] text-subtle">
                      {ref.symbol}
                    </span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>

        {/* Editor */}
        <div className="h-[26rem]">
          {showDiff ? (
            <DiffEditor
              height="100%"
              language={language}
              theme="vs-dark"
              original={content}
              modified={content}
              options={readOnlyOptions}
            />
          ) : (
            <Editor
              height="100%"
              language={language}
              theme="vs-dark"
              value={content}
              onMount={(editor, monaco) => {
                if (!active.line) return
                editor.revealLineInCenter(active.line)
                editor.setPosition({ lineNumber: active.line, column: 1 })
                monaco.editor.setModelMarkers(
                  editor.getModel()!,
                  'preflight',
                  [
                    {
                      severity: monaco.MarkerSeverity.Error,
                      message: finding.title,
                      startLineNumber: active.line,
                      endLineNumber: active.line,
                      startColumn: 1,
                      endColumn: 200,
                    },
                  ],
                )
                editor.focus()
              }}
              options={readOnlyOptions}
            />
          )}
        </div>
      </Panel>

      {/* --------------------------------------------------------- Impact */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ListPanel
          title="Affected files"
          icon={<FileCode2 className="size-3.5" />}
          items={finding.affectedFiles}
          mono
          empty="No files identified in the blast radius."
        />
        <ListPanel
          title="Consumers"
          icon={<Users className="size-3.5" />}
          items={finding.consumers}
          mono
          empty="No downstream consumers resolved from the graph."
        />
        <ListPanel
          title="Symbols"
          icon={<Link2 className="size-3.5" />}
          items={finding.symbols}
          mono
          empty="No symbol-level matches."
        />
        <ListPanel
          title="Components"
          icon={<ShieldQuestion className="size-3.5" />}
          items={finding.affectedComponents}
          mono
          empty="No component affected."
        />
      </div>

      {/* ----------------------------------------------------- Remediation */}
      <Panel>
        <PanelHeader
          eyebrow="9.13 · Remediation"
          title="Suggested action"
          action={<Lightbulb className="size-4 text-review" />}
        />
        <PanelBody>
          <p className="text-sm leading-relaxed text-fg">{finding.remediation}</p>
        </PanelBody>
      </Panel>
    </div>
  )
}

const readOnlyOptions = {
  readOnly: true,
  domReadOnly: true,
  minimap: { enabled: false },
  fontSize: 12,
  lineHeight: 20,
  scrollBeyondLastLine: false,
  renderLineHighlight: 'all' as const,
  padding: { top: 12, bottom: 12 },
  fontFamily: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
  fontLigatures: true,
  tabSize: 2,
}

function ListPanel({
  title,
  icon,
  items,
  mono,
  empty,
}: {
  title: string
  icon: React.ReactNode
  items: string[]
  mono?: boolean
  empty: string
}) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? items : items.slice(0, 6)

  return (
    <Panel>
      <PanelHeader
        title={
          <span className="flex items-center gap-2">
            {icon}
            {title}
            <span className="tabular rounded bg-raised px-1.5 py-px font-mono text-[10px] text-muted">
              {items.length}
            </span>
          </span>
        }
      />
      <div className="p-2">
        {items.length === 0 ? (
          <p className="px-2 py-3 text-xs text-subtle">{empty}</p>
        ) : (
          <>
            <ul className="space-y-0.5">
              {visible.map((item) => (
                <li
                  key={item}
                  className={cn(
                    'truncate rounded px-2 py-1 text-[11px] text-muted hover:bg-raised',
                    mono && 'font-mono',
                  )}
                  title={shortPath(item, 80)}
                >
                  {shortPath(item, 64)}
                </li>
              ))}
            </ul>
            {items.length > 6 ? (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-1 flex w-full items-center justify-center gap-1 rounded px-2 py-1 text-[11px] text-accent hover:bg-raised"
              >
                <ChevronDown className={cn('size-3 transition-transform', expanded && 'rotate-180')} />
                {expanded ? 'Show less' : `Show all ${items.length}`}
              </button>
            ) : null}
          </>
        )}
      </div>
    </Panel>
  )
}
