import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CircleHelp, GitBranch, ListTree, Rocket, ScanText, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/layout/AppShell'
import { Panel, PanelBody, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { Chip, RiskBadge } from '@/components/ui/Badge'
import { EmptyState, ProgressBar } from '@/components/ui/Feedback'
import { api } from '@/services/api'
import { useApp } from '@/store/store'
import { analyzeIntent } from '@/engine/intent'
import { BENCHMARK_SEEDS } from '@/data/benchmarks'
import { cn } from '@/lib/cn'
import type { Decision, RiskLevel } from '@/types'

/**
 * 9.2 Change Intent Analyzer surface.
 *
 * The intake form is deliberately conversational: a single sentence plus a
 * branch. Everything the analyzer infers is shown before the run starts, so a
 * wrong reading of the intent is caught in seconds rather than after a
 * two-minute analysis.
 */
export default function NewChangePage() {
  const navigate = useNavigate()
  const { notify, refreshRequests } = useApp()
  const [description, setDescription] = useState('')
  const [branch, setBranch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>()
  const [touched, setTouched] = useState(false)

  // Live intent preview - same function the backend calls, so what the user
  // approves here is exactly what the agents will reason about.
  const proposal = useMemo(() => analyzeIntent(description), [description])
  const ready = description.trim().length >= 12

  useEffect(() => {
    if (touched && ready) setError(undefined)
  }, [ready, touched])

  const submit = async () => {
    setTouched(true)
    if (!ready) {
      setError('Describe the change in at least a full sentence so the analyzer has something to work with.')
      return
    }
    setSubmitting(true)
    try {
      const cr = await api.createChangeRequest({
        description: description.trim(),
        branch: branch.trim() || undefined,
      })
      await refreshRequests()
      notify({
        title: 'Pre-flight queued',
        detail: `Run for ${cr.id} started. Six explorer agents are reading the repository.`,
        tone: 'info',
      })
      navigate(`/changes/${cr.id}/analyze`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the change request.')
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="9.2 · Change intent analyzer"
        title="Describe the change"
        description="One sentence is enough. The analyzer turns it into a structured proposal, then the explorer agents check it against the indexed repository before any code is written."
      />

      <div className="grid gap-4 lg:grid-cols-5">
        {/* ------------------------------------------------------ Intake */}
        <div className="space-y-4 lg:col-span-3">
          <Panel>
            <PanelHeader
              eyebrow="Step 1"
              title="What are you changing?"
              description="Plain language. Include the technology and the data or contract involved if you can."
              action={<ScanText className="size-4 text-accent" />}
            />
            <PanelBody className="space-y-4">
              <div>
                <label htmlFor="description" className="eyebrow">
                  Change description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  autoFocus
                  placeholder="e.g. For faster analytics, connect the dashboard directly to PostgreSQL instead of going through the analytics API."
                  className={cn(
                    'mt-1.5 w-full resize-y rounded-md border bg-canvas/60 px-3 py-2.5 text-sm leading-relaxed text-fg',
                    'placeholder:text-subtle/70 focus:border-accent/60 focus:outline-none',
                    error ? 'border-block/60' : 'border-line-strong',
                  )}
                />
                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  <span className={error ? 'text-block' : 'text-subtle'}>
                    {error ?? 'The intent preview updates as you type.'}
                  </span>
                  <span className="tabular text-subtle">{description.trim().length} chars</span>
                </div>
              </div>

              <div>
                <label htmlFor="branch" className="eyebrow">
                  Branch <span className="normal-case tracking-normal text-subtle/70">(optional)</span>
                </label>
                <div className="relative mt-1.5">
                  <GitBranch className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-subtle" />
                  <input
                    id="branch"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="feat/dashboard-direct-db"
                    className="w-full rounded-md border border-line-strong bg-canvas/60 py-2 pl-8 pr-3 font-mono text-xs text-fg placeholder:text-subtle/70 focus:border-accent/60 focus:outline-none"
                  />
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                loading={submitting}
                disabled={!ready}
                onClick={submit}
                icon={<Rocket className="size-4" />}
              >
                Run pre-flight
              </Button>
            </PanelBody>
          </Panel>

          {/* Deterministic examples from the benchmark set. */}
          <Panel>
            <PanelHeader
              eyebrow="Step 0"
              title="Or start from a known case"
              description="Each of these is a benchmark scenario with a verified expected verdict."
            />
            <PanelBody>
              <ul className="space-y-1.5">
                {DEMO_CASES.map((s) => (
                  <li key={s.seed.description}>
                    <button
                      type="button"
                      onClick={() => setDescription(s.seed.description)}
                      className="flex w-full items-center gap-3 rounded-md border border-line bg-canvas/40 px-3 py-2 text-left transition-colors hover:border-accent/40 hover:bg-raised/50"
                    >
                      <span className="min-w-0 flex-1 truncate text-xs text-muted">{s.seed.description}</span>
                      <ExpectedPill want={s.seed.groundTruth} />
                      <ArrowRight className="size-3.5 shrink-0 text-subtle" />
                    </button>
                  </li>
                ))}
              </ul>
            </PanelBody>
          </Panel>
        </div>

        {/* ---------------------------------------------- Intent preview */}
        <div className="lg:col-span-2">
          <div className="sticky top-20 space-y-4">
            <Panel>
              <PanelHeader
                eyebrow="Step 1 preview"
                title="Structured proposal"
                description="What the specialist agents will receive."
                action={<Sparkles className="size-4 text-agent" />}
              />
              <PanelBody className="space-y-4">
                {description.trim() === '' ? (
                  <EmptyState
                    icon={<ListTree className="size-6" />}
                    title="Waiting for intent"
                    description="Domains, operations and expected risk appear here as you type."
                  />
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="eyebrow">Expected risk floor</p>
                      <RiskBadge level={proposal.expectedRisk} />
                    </div>
                    <ProgressBar
                      value={RISK_SCALE[proposal.expectedRisk]}
                      status={RISK_STATUS[proposal.expectedRisk]}
                      height={5}
                      label="Expected risk floor"
                    />

                    <Group
                      title="Affected domains"
                      items={proposal.affectedDomains}
                      empty="None matched yet."
                    />
                    <Group
                      title="Likely operations"
                      items={proposal.likelyOperations}
                      empty="None matched yet."
                      mono
                    />

                    <div className="rounded-md border border-line bg-canvas/50 p-3">
                      <p className="eyebrow flex items-center gap-1.5">
                        <CircleHelp className="size-3" /> Assumptions
                      </p>
                      <ul className="mt-1.5 space-y-1">
                        {proposal.assumptions.map((a) => (
                          <li key={a} className="flex gap-2 text-[11px] leading-relaxed text-muted">
                            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-subtle" />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {proposal.clarifications && proposal.clarifications.length > 0 ? (
                      <div className="rounded-md border border-review/30 bg-review/[0.05] p-3">
                        <p className="eyebrow text-review">Clarifications the analyzer wants</p>
                        <ul className="mt-1.5 space-y-1">
                          {proposal.clarifications.map((c) => (
                            <li key={c} className="flex gap-2 text-[11px] leading-relaxed text-muted">
                              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-review" />
                              {c}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2 text-[10px] leading-relaxed text-subtle">
                          These do not block the run. They are attached to the report so the reviewer sees
                          exactly what the engine had to assume.
                        </p>
                      </div>
                    ) : null}
                  </>
                )}
              </PanelBody>
            </Panel>
          </div>
        </div>
      </div>
    </>
  )
}

const RISK_SCALE: Record<RiskLevel, number> = { LOW: 0.18, MEDIUM: 0.45, HIGH: 0.75, CRITICAL: 1 }
const RISK_STATUS = {
  LOW: 'pass',
  MEDIUM: 'review',
  HIGH: 'review',
  CRITICAL: 'block',
} as const

/**
 * One example of each verdict, drawn from the evaluation benchmark so the
 * expected outcome is a verified ground truth rather than a guess.
 */
const DEMO_CASES = [
  { seed: BENCHMARK_SEEDS[0] },  // A1 - frontend -> database, BLOCKED
  { seed: BENCHMARK_SEEDS[2] },  // A3 - duplicate abstraction, REVIEW_REQUIRED
  { seed: BENCHMARK_SEEDS[20] }, // R4 - contained change, CLEARED
] as const

function Group({
  title,
  items,
  empty,
  mono,
}: {
  title: string
  items: string[]
  empty: string
  mono?: boolean
}) {
  return (
    <div>
      <p className="eyebrow">{title}</p>
      {items.length === 0 ? (
        <p className="mt-1 text-[11px] text-subtle">{empty}</p>
      ) : (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {items.map((i) => (
            <Chip key={i} mono={mono} className={mono ? 'text-[10px]' : undefined}>
              {i}
            </Chip>
          ))}
        </div>
      )}
    </div>
  )
}

function ExpectedPill({ want }: { want: Decision }) {
  const tone =
    want === 'BLOCKED' ? 'text-block border-block/40' : want === 'CLEARED' ? 'text-pass border-pass/40' : 'text-review border-review/40'
  return (
    <span className={cn('shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase', tone)}>
      {want.replace('_', ' ')}
    </span>
  )
}
