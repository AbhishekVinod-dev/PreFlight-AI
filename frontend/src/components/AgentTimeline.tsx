import { useEffect, useRef, useState } from 'react'
import { Check, ChevronRight, Loader2, Minus, X } from 'lucide-react'
import type { AgentRunStep, RunStage } from '@/types'
import { cn } from '@/lib/cn'

/**
 * PRD 16 "Analysis screen": the orchestrator's live view of itself.
 *
 * The pre-flight orchestrator runs PLAN, spawns the read-only explorer
 * subagents in parallel, and only then applies the policy engine. Showing the
 * subagent context explicitly is the point - it makes the "who decided this"
 * question answerable.
 */
export function AgentTimeline({
  agents,
  stage,
  className,
}: {
  agents: AgentRunStep[]
  stage: RunStage
  className?: string
}) {
  return (
    <ol className={cn('divide-y divide-line', className)}>
      {agents.map((agent) => (
        <AgentRow key={agent.key} agent={agent} stage={stage} />
      ))}
    </ol>
  )
}

function AgentRow({ agent, stage }: { agent: AgentRunStep; stage: RunStage }) {
  const [open, setOpen] = useState(false)
  const logRef = useRef<HTMLOListElement>(null)
  const running = agent.status === 'running'

  // Auto-expand while running, and keep the newest log line in view.
  useEffect(() => {
    if (running) setOpen(true)
  }, [running])

  useEffect(() => {
    if (open && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [agent.log.length, open])

  const done = agent.status === 'done'

  return (
    <li className={cn('transition-colors', running && 'bg-accent/[0.04]')}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-raised/40"
      >
        <StatusIcon status={agent.status} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <p className={cn('text-sm font-medium', running ? 'text-accent' : 'text-fg')}>{agent.label}</p>
            <span className="rounded border border-line bg-raised px-1.5 py-px font-mono text-[10px] text-subtle">
              {agent.mode}
            </span>
            <span className="font-mono text-[10px] text-subtle">{agent.agent}</span>
          </div>
          <p className="truncate text-xs text-muted" title={agent.detail}>
            {agent.detail ?? 'queued'}
          </p>
        </div>

        <div className="hidden w-16 shrink-0 text-right sm:block">
          {done ? (
            <span className="tabular font-mono text-[11px] text-pass">{agent.log.length} items</span>
          ) : running ? (
            <span className="tabular font-mono text-[11px] text-accent">reading…</span>
          ) : (
            <span className="font-mono text-[11px] text-subtle">—</span>
          )}
        </div>

        <ChevronRight className={cn('size-4 shrink-0 text-subtle transition-transform', open && 'rotate-90')} />
      </button>

      {open ? (
        <div className="border-t border-line bg-canvas/70 px-4 py-3">
          {agent.log.length === 0 ? (
            <p className="font-mono text-[11px] text-subtle">
              {stage === 'context' ? 'waiting for repository context…' : 'no evidence recorded yet'}
            </p>
          ) : (
            <ol ref={logRef} className="max-h-40 space-y-1 overflow-y-auto">
              {agent.log.map((line, i) => (
                <li key={`${line}-${i}`} className="flex gap-2 font-mono text-[11px] leading-relaxed">
                  <span className="tabular shrink-0 text-subtle">{String(i + 1).padStart(2, '0')}</span>
                  <span className={cn(i === agent.log.length - 1 && running ? 'text-accent' : 'text-muted')}>{line}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : null}
    </li>
  )
}

function StatusIcon({ status }: { status: AgentRunStep['status'] }) {
  const base = 'grid size-6 shrink-0 place-items-center rounded border'
  switch (status) {
    case 'done':
      return (
        <span className={cn(base, 'border-pass/40 bg-pass/10 text-pass')} aria-label="complete">
          <Check className="size-3.5" />
        </span>
      )
    case 'running':
      return (
        <span className={cn(base, 'animate-pulse-ring border-accent/50 bg-accent/10 text-accent')} aria-label="running">
          <Loader2 className="size-3.5 animate-spin" />
        </span>
      )
    case 'failed':
      return (
        <span className={cn(base, 'border-block/40 bg-block/10 text-block')} aria-label="failed">
          <X className="size-3.5" />
        </span>
      )
    default:
      return (
        <span className={cn(base, 'border-line bg-raised text-subtle')} aria-label="queued">
          <Minus className="size-3.5" />
        </span>
      )
  }
}
