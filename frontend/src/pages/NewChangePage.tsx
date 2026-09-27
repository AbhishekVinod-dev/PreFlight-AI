import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Boxes,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  CircleHelp,
  Code2,
  Cpu,
  Database,
  FileCode2,
  GitBranch,
  Info,
  Layers,
  Layout,
  ListTree,
  Lock,
  Network,
  Package,
  Radio,
  Rocket,
  ScanText,
  Search,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Shuffle,
  Sliders,
  Sparkles,
  Terminal,
  Trash2,
  Wand2,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { RiskBadge } from '@/components/ui/Badge'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { api } from '@/services/api'
import { useApp } from '@/store/store'
import { analyzeIntent } from '@/engine/intent'
import { BENCHMARK_SEEDS, type BenchmarkSeed } from '@/data/benchmarks'
import { cn } from '@/lib/cn'
import type { Decision, RiskLevel } from '@/types'

/**
 * 9.2 Change Intent Analyzer surface.
 *
 * The bridge between natural language engineering intent and deterministic pre-flight governance.
 * Evaluates proposed changes against the repository knowledge graph, domain contracts, and
 * architecture rules before any code is generated or written.
 */

const HIGH_RISK_OPS = new Set([
  'open_database_connection',
  'bypass_service_layer',
  'modify_auth_service',
  'replace_event_transport',
  'add_broker',
  'create_migration',
  'drop_field',
])

const QUICK_STARTERS = [
  {
    label: 'Direct DB Bypass',
    icon: Database,
    description: 'For faster analytics, connect the dashboard directly to PostgreSQL instead of going through the analytics API.',
    branch: 'feat/dashboard-direct-db',
    category: 'architecture',
  },
  {
    label: 'Breaking Column Drop',
    icon: Trash2,
    description: 'Drop the last_login_ip column from the users table.',
    branch: 'feat/drop-last-login-ip',
    category: 'contract',
  },
  {
    label: 'Add RabbitMQ Broker',
    icon: Radio,
    description: 'Introduce RabbitMQ as our message broker for asynchronous event delivery.',
    branch: 'feat/rabbitmq-broker',
    category: 'dependency',
  },
  {
    label: 'Google OAuth SSO',
    icon: Lock,
    description: 'Add Google OAuth login and authentication provider to the identity gateway.',
    branch: 'feat/google-oauth',
    category: 'security',
  },
  {
    label: 'Duplicate Service',
    icon: Boxes,
    description: 'Create a new NotificationService to handle live updates and email delivery.',
    branch: 'feat/new-notification-service',
    category: 'architecture',
  },
  {
    label: 'Safe UI & Docs Chore',
    icon: CheckCircle2,
    description: 'Update the dashboard button label and fix a typo in the README.',
    branch: 'chore/labels-readme',
    category: 'refactoring',
  },
]

const EXPLORER_AGENTS = [
  {
    name: 'Context Loader',
    role: 'Index Graph & AST',
    icon: Database,
    desc: 'Loads 3,841 indexed files & AST symbols',
    domains: ['configuration', 'platform'],
  },
  {
    name: 'Architecture Explorer',
    role: 'ARCH-001..007 Rules',
    icon: Layers,
    desc: 'Layer boundaries, cycles & ADR adherence',
    domains: ['data', 'persistence', 'services', 'frontend', 'infrastructure'],
  },
  {
    name: 'Contract Explorer',
    role: 'Schemas & Endpoints',
    icon: FileCode2,
    desc: 'API schemas, event contracts & migrations',
    domains: ['api', 'events', 'types', 'consumers', 'data'],
  },
  {
    name: 'Dependency Explorer',
    role: 'Packages & Licenses',
    icon: Package,
    desc: 'Package registries, CVEs & lockfiles',
    domains: ['dependencies', 'build'],
  },
  {
    name: 'Security Explorer',
    role: 'Trust Boundaries',
    icon: Shield,
    desc: 'Auth boundaries, secret leaks & RBAC',
    domains: ['authentication', 'users', 'security'],
  },
  {
    name: 'Policy Gate & Synthesis',
    role: 'Deterministic Gate',
    icon: ShieldCheck,
    desc: 'Evidence aggregation & verdict decision',
    domains: ['quality'],
  },
]

export default function NewChangePage() {
  const navigate = useNavigate()
  const { notify, refreshRequests, project } = useApp()
  const [description, setDescription] = useState('')
  const [branch, setBranch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>()
  const [touched, setTouched] = useState(false)

  // View state
  const [activeTab, setActiveTab] = useState<'visual' | 'json'>('visual')
  const [benchmarkFilter, setBenchmarkFilter] = useState<'all' | string>('all')
  const [benchmarkSearch, setBenchmarkSearch] = useState('')
  const [isBenchmarksExpanded, setIsBenchmarksExpanded] = useState(false)

  // Live intent preview
  const proposal = useMemo(() => analyzeIntent(description), [description])
  const ready = description.trim().length >= 12

  useEffect(() => {
    if (touched && ready) setError(undefined)
  }, [ready, touched])

  // Helper to slugify a branch name from intent
  const autoGenerateBranch = useCallback(() => {
    if (!description.trim()) return
    const clean = description
      .toLowerCase()
      .replace(/^e\.g\.?\s*/i, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
    const words = clean.split(/\s+/).filter(Boolean)
    const stopwords = new Set([
      'the', 'a', 'an', 'to', 'for', 'in', 'of', 'and', 'instead', 'by', 'on', 'with', 'from', 'as', 'our', 'new', 'add',
    ])
    const meaningful = words.filter((w) => !stopwords.has(w)).slice(0, 3)
    const slug = meaningful.length > 0 ? meaningful.join('-') : 'change'
    setBranch(`feat/${slug}`)
  }, [description])

  const loadScenario = (seed: BenchmarkSeed) => {
    setDescription(seed.description)
    // Find friendly branch or slugify
    const matchedStarter = QUICK_STARTERS.find((s) => s.description === seed.description)
    if (matchedStarter) {
      setBranch(matchedStarter.branch)
    } else {
      const clean = seed.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      setBranch(`feat/${clean}`)
    }
    setError(undefined)
  }

  const loadRandomScenario = () => {
    const randomIndex = Math.floor(Math.random() * BENCHMARK_SEEDS.length)
    loadScenario(BENCHMARK_SEEDS[randomIndex])
  }

  const handleClear = () => {
    setDescription('')
    setBranch('')
    setError(undefined)
    setTouched(false)
  }

  const submit = async () => {
    setTouched(true)
    if (!ready) {
      setError('Describe the change in at least a full sentence (12+ characters) so the analyzer can parse domains and operations.')
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
        title: 'Pre-flight pipeline dispatched',
        detail: `Run for ${cr.id} started. Six specialist explorer agents are indexing repository graph.`,
        tone: 'info',
      })
      navigate(`/changes/${cr.id}/analyze`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the change request.')
      setSubmitting(false)
    }
  }

  // Handle Ctrl+Enter / Cmd+Enter keyboard shortcut
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      if (ready && !submitting) {
        submit()
      }
    }
  }

  // Filter benchmark seeds
  const filteredBenchmarks = useMemo(() => {
    return BENCHMARK_SEEDS.filter((s) => {
      const matchesCategory = benchmarkFilter === 'all' || s.category === benchmarkFilter
      const matchesSearch =
        benchmarkSearch === '' ||
        s.name.toLowerCase().includes(benchmarkSearch.toLowerCase()) ||
        s.description.toLowerCase().includes(benchmarkSearch.toLowerCase()) ||
        s.id.toLowerCase().includes(benchmarkSearch.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [benchmarkFilter, benchmarkSearch])

  return (
    <div className="space-y-6 pb-12" onKeyDown={handleKeyDown}>
      {/* ------------------------------------------------ Top Context Bar */}
      <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold tracking-wider text-accent uppercase">
              <span className="size-1.5 animate-pulse rounded-full bg-accent" />
              9.2 · Change Intent Analyzer
            </span>
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-subtle">
              <span className="size-1.5 rounded-full bg-pass" />
              Pre-Flight Orchestrator Active
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">Formulate Change Intent</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">
            Describe your intended architectural modification in plain English. The real-time parser infers boundaries,
            impacted contracts, and baseline risk floor before dispatching the specialist explorer agents.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="rounded-lg border border-line bg-surface/80 px-3.5 py-2 text-right shadow-xs">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-subtle">Target Repository</div>
            <div className="mt-0.5 flex items-center justify-end gap-2 font-mono text-xs text-fg">
              <span className="flex items-center gap-1 font-semibold">
                <GitBranch className="size-3.5 text-accent" />
                {project?.name.toLowerCase() ?? 'orca'}
                <span className="font-normal text-subtle">@{project?.defaultBranch ?? 'main'}</span>
              </span>
              <span className="shrink-0 rounded bg-raised px-1.5 py-0.5 font-mono text-[10px] font-medium text-subtle">
                {project?.index.files.toLocaleString() ?? '3,841'} files
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------- Verified Benchmark Library */}
      <section className="glass-panel overflow-hidden border border-line-strong/60 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-canvas/70 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-7 place-items-center rounded-md border border-agent/30 bg-agent/10 text-agent">
              <Sparkles className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-fg">
                  Verified Benchmark Library
                </h2>
                <span className="rounded-full border border-line-strong bg-raised px-2 py-0.2 font-mono text-[10px] font-semibold text-muted">
                  24 Ground-Truth Seeds
                </span>
              </div>
              <p className="text-[11px] text-subtle">
                Evaluation scenarios with verified architectural verdicts from human architects.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={loadRandomScenario}
              icon={<Shuffle className="size-3" />}
              className="text-xs"
              title="Pick a random benchmark case"
            >
              Surprise me
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsBenchmarksExpanded((v) => !v)}
              icon={isBenchmarksExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              className="text-xs text-muted"
            >
              {isBenchmarksExpanded ? 'Collapse Library' : 'Browse All (24)'}
            </Button>
          </div>
        </div>

        {/* Collapsed horizontal quick-strip */}
        {!isBenchmarksExpanded ? (
          <div className="flex items-center gap-2 overflow-x-auto p-3 scrollbar-none">
            <span className="shrink-0 text-[11px] font-medium text-subtle">Quick picks:</span>
            {BENCHMARK_SEEDS.slice(0, 6).map((seed) => {
              const isSelected = description === seed.description
              return (
                <button
                  key={seed.id}
                  type="button"
                  onClick={() => loadScenario(seed)}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-xs transition-all',
                    isSelected
                      ? 'border-accent bg-accent/10 text-fg shadow-xs ring-1 ring-accent/30'
                      : 'border-line bg-canvas/40 text-muted hover:border-accent/40 hover:bg-raised/60 hover:text-fg'
                  )}
                >
                  <span className="font-mono text-[10px] font-semibold text-accent">{seed.id}</span>
                  <span className="max-w-[180px] truncate text-[11.5px] font-medium">{seed.name}</span>
                  <ExpectedPill want={seed.groundTruth} />
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => setIsBenchmarksExpanded(true)}
              className="flex shrink-0 items-center gap-1 rounded-lg border border-dashed border-line px-2.5 py-1.5 text-xs text-subtle hover:border-accent/50 hover:text-accent"
            >
              +18 more <ArrowRight className="size-3" />
            </button>
          </div>
        ) : (
          /* Expanded full library browser */
          <div className="space-y-3.5 p-4 animate-fade-in">
            {/* Filter toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all', label: 'All Cases', count: BENCHMARK_SEEDS.length },
                  { id: 'architecture', label: 'Architecture', count: 5 },
                  { id: 'contract', label: 'Contracts', count: 5 },
                  { id: 'dependency', label: 'Dependencies', count: 5 },
                  { id: 'refactoring', label: 'Refactoring', count: 4 },
                  { id: 'security', label: 'Security', count: 5 },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setBenchmarkFilter(tab.id)}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                      benchmarkFilter === tab.id
                        ? 'bg-accent text-white shadow-xs'
                        : 'bg-raised text-muted hover:bg-line-strong hover:text-fg'
                    )}
                  >
                    {tab.label}
                    <span className="ml-1.5 font-mono text-[10px] opacity-80">({tab.count})</span>
                  </button>
                ))}
              </div>

              {/* Search box */}
              <div className="relative min-w-[220px]">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-subtle" />
                <input
                  type="text"
                  placeholder="Filter scenarios by name..."
                  value={benchmarkSearch}
                  onChange={(e) => setBenchmarkSearch(e.target.value)}
                  className="w-full rounded-md border border-line bg-canvas/60 py-1.5 pl-8 pr-3 text-xs text-fg placeholder:text-subtle/70 focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            {/* Grid of seeds */}
            <div className="grid max-h-[320px] gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
              {filteredBenchmarks.map((seed) => {
                const isSelected = description === seed.description
                return (
                  <button
                    key={seed.id}
                    type="button"
                    onClick={() => loadScenario(seed)}
                    className={cn(
                      'group flex flex-col justify-between rounded-lg border p-3 text-left transition-all',
                      isSelected
                        ? 'border-accent bg-accent/[0.08] shadow-xs ring-1 ring-accent/40'
                        : 'border-line bg-canvas/50 hover:border-accent/40 hover:bg-raised/70'
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-raised px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-accent">
                            {seed.id}
                          </span>
                          <span className="text-[11px] font-semibold text-fg group-hover:text-accent">
                            {seed.name}
                          </span>
                        </div>
                        <ExpectedPill want={seed.groundTruth} />
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted">
                        {seed.description}
                      </p>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between border-t border-line/60 pt-2 text-[10.5px] text-subtle">
                      <span className="truncate italic font-mono">{seed.groundTruthLabel}</span>
                      <span className="font-semibold uppercase tracking-wider text-muted">{seed.category}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {/* ------------------------------------------------ Main Grid (Intake & Live Analysis) */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* ==================================================== Left Column: Intake Studio */}
        <div className="space-y-5 lg:col-span-7">
          <div className="glass-panel overflow-hidden border border-line-strong/60 shadow-xs">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line bg-canvas/60 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="grid size-7 place-items-center rounded-md border border-accent/40 bg-accent/10 text-accent">
                  <ScanText className="size-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-fg">Step 1 · Specify Proposed Change</h2>
                  <p className="text-xs text-subtle">
                    Provide the architectural hypothesis, component, or contract you intend to touch.
                  </p>
                </div>
              </div>

              {description && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-subtle transition-colors hover:bg-raised hover:text-block"
                  title="Clear form"
                >
                  <Trash2 className="size-3" />
                  Clear
                </button>
              )}
            </div>

            <div className="p-5 space-y-5">
              {/* Quick Template Starters */}
              <div>
                <label className="eyebrow mb-2 flex items-center gap-1.5">
                  <Sparkles className="size-3 text-accent" />
                  Quick Intent Starters
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_STARTERS.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => {
                        setDescription(s.description)
                        setBranch(s.branch)
                        setError(undefined)
                      }}
                      className={cn(
                        'flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors',
                        description === s.description
                          ? 'border-accent bg-accent/10 font-semibold text-accent'
                          : 'border-line bg-raised/50 text-muted hover:border-line-strong hover:bg-raised hover:text-fg'
                      )}
                    >
                      <s.icon className="size-3 text-subtle" />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description Input Container */}
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="description" className="eyebrow">
                    Change Description <span className="text-block">*</span>
                  </label>
                  <span className="text-[11px] text-subtle">
                    Press <kbd className="rounded border border-line bg-raised px-1 py-0.2 font-mono text-[10px]">Ctrl+Enter</kbd> to run
                  </span>
                </div>

                <div className="relative mt-2">
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    autoFocus
                    placeholder="e.g. For faster analytics, connect the dashboard directly to PostgreSQL instead of going through the analytics API."
                    className={cn(
                      'w-full resize-y rounded-lg border bg-canvas/70 p-3.5 text-sm leading-relaxed text-fg shadow-inner transition-all',
                      'placeholder:text-subtle/60 focus:border-accent focus:bg-canvas focus:outline-none focus:ring-2 focus:ring-accent/20',
                      error ? 'border-block/80 ring-2 ring-block/20' : 'border-line-strong'
                    )}
                  />
                </div>

                {/* Validation and Character Counter bar */}
                <div className="mt-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {error ? (
                      <span className="flex items-center gap-1 font-medium text-block">
                        <CircleAlert className="size-3.5" />
                        {error}
                      </span>
                    ) : ready ? (
                      <span className="flex items-center gap-1 text-pass">
                        <CheckCircle2 className="size-3.5" />
                        Ready for explorer agents analysis
                      </span>
                    ) : (
                      <span className="text-subtle">
                        Minimum 12 characters required ({Math.max(0, 12 - description.trim().length)} more needed)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs tabular text-subtle">
                      {description.trim().length} chars
                    </span>
                    <div
                      className={cn(
                        'size-2 rounded-full',
                        ready ? 'bg-pass' : description.trim().length > 0 ? 'bg-review' : 'bg-line-strong'
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Branch Configuration Input */}
              <div className="rounded-lg border border-line bg-canvas/40 p-3.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="branch" className="eyebrow flex items-center gap-1.5">
                    <GitBranch className="size-3 text-accent" />
                    Target Feature Branch
                    <span className="normal-case tracking-normal text-subtle">(optional)</span>
                  </label>

                  {description.trim().length > 5 && (
                    <button
                      type="button"
                      onClick={autoGenerateBranch}
                      className="flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
                    >
                      <Wand2 className="size-3" />
                      Auto-generate branch slug
                    </button>
                  )}
                </div>

                <div className="relative mt-2">
                  <GitBranch className="pointer-events-none absolute left-3 top-2.5 size-4 text-subtle" />
                  <input
                    id="branch"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="feat/dashboard-direct-db"
                    className="w-full rounded-md border border-line bg-canvas/80 py-2 pl-9 pr-3 font-mono text-xs text-fg placeholder:text-subtle/60 focus:border-accent focus:outline-none"
                  />
                </div>

                <p className="mt-1.5 font-mono text-[10.5px] text-subtle">
                  Pre-flight checks will merge against <span className="font-semibold text-fg">orca@main</span>.
                </p>
              </div>

              {/* Primary Action Button */}
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  className={cn(
                    'w-full py-3.5 text-sm font-semibold transition-all',
                    ready && 'glow-accent bg-gradient-to-r from-accent to-agent hover:brightness-105'
                  )}
                  loading={submitting}
                  disabled={!ready}
                  onClick={submit}
                  icon={<Rocket className="size-4.5" />}
                >
                  {submitting ? 'Dispatching Explorer Agents…' : 'Run Architectural Pre-Flight'}
                </Button>

                <div className="mt-2.5 flex items-center justify-center gap-2 text-[11.5px] text-subtle">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="size-3.5 text-pass" />
                    Zero code risk
                  </span>
                  <span>·</span>
                  <span>Evaluates against 6,233 graph relationships</span>
                  <span>·</span>
                  <span className="font-mono text-muted">~2.8s</span>
                </div>
              </div>
            </div>
          </div>

          {/* Explorer Subagents Blueprint Card */}
          <div className="rounded-xl border border-line bg-surface/50 p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <div className="flex items-center gap-2">
                <Cpu className="size-4 text-accent" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-fg">
                  Multi-Agent Pre-Flight Pipeline
                </h3>
              </div>
              <span className="font-mono text-[10.5px] text-subtle">6 Specialist Subagents</span>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {EXPLORER_AGENTS.map((agent) => {
                // Check if this agent is targeted by current proposal domains
                const isTargeted =
                  proposal.affectedDomains.length > 0 &&
                  agent.domains.some((d) => proposal.affectedDomains.includes(d))

                return (
                  <div
                    key={agent.name}
                    className={cn(
                      'flex items-start gap-2.5 rounded-lg border p-2.5 transition-colors',
                      isTargeted
                        ? 'border-accent/40 bg-accent/[0.06] shadow-xs'
                        : 'border-line/70 bg-canvas/40'
                    )}
                  >
                    <div
                      className={cn(
                        'mt-0.5 grid size-6 shrink-0 place-items-center rounded',
                        isTargeted ? 'bg-accent/20 text-accent' : 'bg-raised text-subtle'
                      )}
                    >
                      <agent.icon className="size-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-xs font-semibold text-fg">{agent.name}</p>
                        {isTargeted && (
                          <span className="rounded bg-accent/20 px-1 font-mono text-[9px] font-bold text-accent">
                            TARGETED
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[10.5px] text-subtle">{agent.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ==================================================== Right Column: Proposal & Risk Cockpit */}
        <div className="lg:col-span-5">
          <div className="sticky top-20 space-y-4">
            <div className="glass-panel overflow-hidden border border-line-strong/60 shadow-xs">
              {/* Header with View Tabs */}
              <div className="flex items-center justify-between border-b border-line bg-canvas/70 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-agent" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-fg">
                    Live Proposal Analysis
                  </span>
                </div>

                {/* Tab Pill Switcher */}
                <div className="flex items-center rounded-lg border border-line bg-raised p-0.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('visual')}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                      activeTab === 'visual'
                        ? 'bg-canvas text-fg shadow-xs'
                        : 'text-subtle hover:text-muted'
                    )}
                  >
                    Visual
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('json')}
                    className={cn(
                      'flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                      activeTab === 'json'
                        ? 'bg-canvas text-fg shadow-xs'
                        : 'text-subtle hover:text-muted'
                    )}
                  >
                    <Code2 className="size-3" />
                    AST / JSON
                  </button>
                </div>
              </div>

              <div className="p-4">
                {description.trim() === '' ? (
                  /* Engaging Empty State */
                  <div className="py-8 text-center">
                    <div className="mx-auto grid size-12 place-items-center rounded-full border border-agent/30 bg-agent/10 text-agent">
                      <ListTree className="size-6" />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-fg">Awaiting Intent Specification</h3>
                    <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-subtle">
                      Type a change description on the left or select a verified benchmark seed to see real-time domain mapping, risk floor, and inferred operations.
                    </p>

                    <div className="mt-5 border-t border-line/60 pt-4">
                      <p className="eyebrow mb-2">Try a 1-click test</p>
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => loadScenario(BENCHMARK_SEEDS[0])}
                          className="flex items-center justify-between rounded-md border border-line bg-canvas/60 px-3 py-2 text-left text-xs transition-colors hover:border-accent hover:bg-raised/70"
                        >
                          <span className="truncate text-muted">A1 · Connect dashboard directly to PostgreSQL</span>
                          <ArrowRight className="size-3 text-subtle" />
                        </button>
                        <button
                          type="button"
                          onClick={() => loadScenario(BENCHMARK_SEEDS[1])}
                          className="flex items-center justify-between rounded-md border border-line bg-canvas/60 px-3 py-2 text-left text-xs transition-colors hover:border-accent hover:bg-raised/70"
                        >
                          <span className="truncate text-muted">C2 · Breaking event schema in NotificationEvent</span>
                          <ArrowRight className="size-3 text-subtle" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : activeTab === 'json' ? (
                  /* CodeBlock JSON view */
                  <div className="space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between text-xs text-subtle">
                      <span className="font-mono text-[11px]">ChangeProposalPayload.json</span>
                      <span className="font-mono text-[10px]">Ready for POST /api/preflight</span>
                    </div>
                    <CodeBlock
                      code={JSON.stringify(proposal, null, 2)}
                      path="proposal.json"
                      maxHeight={480}
                      className="rounded-lg border border-line"
                    />
                  </div>
                ) : (
                  /* Visual Proposal view */
                  <div className="space-y-4 animate-fade-in">
                    {/* Risk Floor Cockpit Card */}
                    <div
                      className={cn(
                        'rounded-xl border p-4 transition-all shadow-xs',
                        proposal.expectedRisk === 'CRITICAL'
                          ? 'border-block/40 bg-block/[0.05] glow-rose'
                          : proposal.expectedRisk === 'HIGH'
                          ? 'border-review/40 bg-review/[0.05] glow-amber'
                          : proposal.expectedRisk === 'MEDIUM'
                          ? 'border-review/30 bg-review/[0.03]'
                          : 'border-pass/30 bg-pass/[0.04] glow-emerald'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="eyebrow">Expected Risk Floor</p>
                          <p className="text-xs text-subtle">
                            {proposal.expectedRisk === 'CRITICAL' || proposal.expectedRisk === 'HIGH'
                              ? 'Architectural violation or breaking contract detected'
                              : proposal.expectedRisk === 'MEDIUM'
                              ? 'Review required by domain policy'
                              : 'Safe localized modification'}
                          </p>
                        </div>
                        <RiskBadge level={proposal.expectedRisk} />
                      </div>

                      {/* Animated Tier Meter */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[11px] font-mono text-muted mb-1">
                          <span>Severity tier</span>
                          <span className="font-semibold tabular">
                            {Math.round(RISK_SCALE[proposal.expectedRisk] * 100)}%
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-line/80">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              proposal.expectedRisk === 'CRITICAL'
                                ? 'bg-block'
                                : proposal.expectedRisk === 'HIGH'
                                ? 'bg-review'
                                : proposal.expectedRisk === 'MEDIUM'
                                ? 'bg-amber-500'
                                : 'bg-pass'
                            )}
                            style={{ width: `${RISK_SCALE[proposal.expectedRisk] * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Signal rationale note */}
                      {proposal.notes && proposal.notes.length > 0 && (
                        <div className="mt-3 rounded-lg border border-line/60 bg-canvas/70 p-2.5 text-xs text-fg leading-relaxed">
                          <div className="flex items-center gap-1.5 font-semibold text-[11px] text-muted mb-0.5">
                            <Info className="size-3 text-subtle" />
                            Signal Rationale
                          </div>
                          {proposal.notes[0]}
                        </div>
                      )}
                    </div>

                    {/* Affected Domains */}
                    <div className="rounded-lg border border-line bg-canvas/40 p-3.5">
                      <div className="flex items-center justify-between">
                        <p className="eyebrow flex items-center gap-1.5">
                          <Layers className="size-3 text-accent" />
                          Affected Domains ({proposal.affectedDomains.length})
                        </p>
                        <span className="text-[10px] text-subtle">Inferred from AST keywords</span>
                      </div>

                      {proposal.affectedDomains.length === 0 ? (
                        <p className="mt-2 text-xs text-subtle italic">
                          No specific domain keyword matched. Will evaluate across full graph.
                        </p>
                      ) : (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {proposal.affectedDomains.map((domain) => {
                            const info = getDomainVisuals(domain)
                            const Icon = info.icon
                            return (
                              <span
                                key={domain}
                                className={cn(
                                  'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium',
                                  info.color
                                )}
                              >
                                <Icon className="size-3" />
                                {domain}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Likely Operations */}
                    <div className="rounded-lg border border-line bg-canvas/40 p-3.5">
                      <div className="flex items-center justify-between">
                        <p className="eyebrow flex items-center gap-1.5">
                          <Terminal className="size-3 text-accent" />
                          Likely Graph Operations ({proposal.likelyOperations.length})
                        </p>
                        <span className="text-[10px] text-subtle">Predicted code mutations</span>
                      </div>

                      {proposal.likelyOperations.length === 0 ? (
                        <p className="mt-2 text-xs text-subtle italic">No direct operation pattern matched.</p>
                      ) : (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {proposal.likelyOperations.map((op) => {
                            const isHighRisk = HIGH_RISK_OPS.has(op)
                            return (
                              <span
                                key={op}
                                className={cn(
                                  'inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-[11px]',
                                  isHighRisk
                                    ? 'border-block/40 bg-block/10 text-block font-semibold'
                                    : 'border-line bg-raised/70 text-muted'
                                )}
                              >
                                {isHighRisk && <ShieldAlert className="size-3 shrink-0 text-block" />}
                                {op}
                                {isHighRisk && (
                                  <span className="rounded bg-block/20 px-1 py-0.2 text-[9px] uppercase tracking-wider font-bold">
                                    HIGH RISK
                                  </span>
                                )}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Assumptions Card */}
                    <div className="rounded-lg border border-line bg-canvas/50 p-3.5">
                      <p className="eyebrow flex items-center gap-1.5 text-fg">
                        <CircleHelp className="size-3.5 text-accent" />
                        Inferred Assumptions
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {proposal.assumptions.map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-muted">
                            <Check className="mt-0.5 size-3 shrink-0 text-pass" />
                            <span>{a}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Clarifications Alert Banner */}
                    {proposal.clarifications && proposal.clarifications.length > 0 && (
                      <div className="rounded-lg border border-review/40 bg-review/[0.06] p-3.5">
                        <div className="flex items-center gap-1.5">
                          <CircleAlert className="size-3.5 text-review" />
                          <p className="eyebrow text-review">Clarifications Needed by Reviewer</p>
                        </div>
                        <ul className="mt-2 space-y-1.5">
                          {proposal.clarifications.map((c, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-muted">
                              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-review" />
                              <span>{c}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2.5 border-t border-review/20 pt-2 text-[10.5px] leading-relaxed text-subtle">
                          These questions do not block pre-flight execution; they will be attached to the gate audit report for human sign-off.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const RISK_SCALE: Record<RiskLevel, number> = {
  LOW: 0.18,
  MEDIUM: 0.45,
  HIGH: 0.75,
  CRITICAL: 1.0,
}

function ExpectedPill({ want }: { want: Decision }) {
  const tone =
    want === 'BLOCKED'
      ? 'text-block border-block/40 bg-block/10'
      : want === 'CLEARED'
      ? 'text-pass border-pass/40 bg-pass/10'
      : 'text-review border-review/40 bg-review/10'
  return (
    <span className={cn('shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-wider', tone)}>
      {want.replace('_', ' ')}
    </span>
  )
}

function getDomainVisuals(domain: string): { icon: React.ComponentType<{ className?: string }>; color: string } {
  switch (domain.toLowerCase()) {
    case 'data':
    case 'persistence':
      return { icon: Database, color: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-800' }
    case 'authentication':
    case 'security':
    case 'users':
      return { icon: Lock, color: 'border-rose-500/30 bg-rose-500/10 text-rose-800' }
    case 'platform':
    case 'realtime':
      return { icon: Radio, color: 'border-purple-500/30 bg-purple-500/10 text-purple-800' }
    case 'events':
      return { icon: Zap, color: 'border-amber-500/30 bg-amber-500/10 text-amber-800' }
    case 'api':
    case 'services':
      return { icon: Network, color: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-800' }
    case 'frontend':
    case 'web':
      return { icon: Layout, color: 'border-sky-500/30 bg-sky-500/10 text-sky-800' }
    case 'dependencies':
    case 'build':
      return { icon: Package, color: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-800' }
    case 'infrastructure':
      return { icon: Server, color: 'border-red-500/30 bg-red-500/10 text-red-800' }
    case 'types':
    case 'consumers':
      return { icon: FileCode2, color: 'border-teal-500/30 bg-teal-500/10 text-teal-800' }
    case 'configuration':
      return { icon: Sliders, color: 'border-slate-500/30 bg-slate-500/10 text-slate-800' }
    default:
      return { icon: Layers, color: 'border-line bg-raised text-muted' }
  }
}
