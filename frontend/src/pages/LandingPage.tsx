import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowDown,
  Ban,
  Boxes,
  FileCode2,
  Gavel,
  GitBranch,
  Layers,
  Network,
  Radar,
  Rocket,
  ScrollText,
  ShieldAlert,
  Split,
  Terminal,
  Timer,
  TriangleAlert,
  Users,
  Waypoints,
  Workflow,
  X,
} from 'lucide-react'
import { CtaLink, Section, SectionHeading } from '@/components/landing/Section'
import { LandingNav } from '@/components/landing/LandingNav'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { GatePreview } from '@/components/landing/GatePreview'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { cn } from '@/lib/cn'
import { decisionTone } from '@/lib/status'
import { countLabel } from '@/lib/format'
import { ADRS, CONTRACTS, DEPENDENCIES, PROJECT, RULES } from '@/data/repository'
import { BENCHMARK_SEEDS } from '@/data/benchmarks'
import type { Decision } from '@/types'

/**
 * Marketing surface for Architectural Pre-Flight.
 *
 * Numbers, verdicts and evidence shown here are derived from the same
 * fixtures the console runs on (`data/repository`, `data/benchmarks`), so the
 * page cannot claim something the product would not produce. Anything that is
 * a specification target rather than a measurement is labelled as such.
 */

const BLOCKING_RULES = RULES.filter((r) => r.enforcement === 'block').length
const BREAKING_CONTRACTS = CONTRACTS.filter((c) => c.breaking).length
const FORBIDDEN_DEPS = DEPENDENCIES.filter((d) => d.policy === 'forbidden')

const DECISION_MIX = (['BLOCKED', 'REVIEW_REQUIRED', 'CLEARED'] as Decision[]).map((d) => ({
  decision: d,
  count: BENCHMARK_SEEDS.filter((s) => s.groundTruth === d).length,
}))

const CATEGORY_MIX = (
  ['architecture', 'contract', 'dependency', 'refactoring', 'security'] as const
).map((c) => ({
  category: c,
  count: BENCHMARK_SEEDS.filter((s) => s.category === c).length,
}))

export default function LandingPage() {
  return (
    <div className="relative z-10 min-h-screen">
      <LandingNav />
      <Hero />
      <ProblemSection />
      <HowItWorksSection />
      <PolicySection />
      <ResultsSection />
      <FinalCta />
      <LandingFooter />
    </div>
  )
}

/* ------------------------------------------------------------------ Hero */

function Hero() {
  return (
    <section className="relative overflow-hidden pb-16 pt-12 sm:pb-20 sm:pt-16">
      {/* Background photo */}
      <img
        aria-hidden
        src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1920&q=85&auto=format&fit=crop"
        alt=""
        fetchPriority="high"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
        style={{ zIndex: -2 }}
      />

      {/* Full-section dark-to-light scrim — photo shows on the right, text side is clean */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: -1,
          background:
            'linear-gradient(100deg, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.93) 38%, rgba(255,255,255,0.55) 58%, rgba(255,255,255,0.0) 75%)',
        }}
      />

      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-10">
        {/* Text column — sits on the opaque part of the scrim */}
        <div>
          <p className="eyebrow flex items-center gap-2 text-accent">
            <span className="inline-block size-1.5 rounded-full bg-accent" />
            Architectural Pre-Flight · IBM Bob 2.0
          </p>

          <h1 className="mt-4 text-balance text-4xl font-bold leading-[1.08] tracking-tight text-gray-900 sm:text-5xl">
            Know it's safe to build
            <br />
            <span className="text-accent">before you build it.</span>
          </h1>

          <p className="mt-5 max-w-xl text-pretty text-[15px] leading-relaxed text-gray-600">
            Describe the change you want to make. Pre-Flight reads your repository,
            checks your contracts and policies, and tells you — with evidence —
            whether it's{' '}
            <span className="font-semibold text-indigo-600">good to go</span>,{' '}
            <span className="font-semibold text-amber-600">needs a second look</span>, or{' '}
            <span className="font-semibold text-rose-600">needs rethinking</span>{' '}
            before a single line of code is written.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <CtaLink
              to="/changes/new"
              size="lg"
              icon={<Rocket className="size-4" />}
              iconAfter={<ArrowRight className="size-4" />}
            >
              Check my change
            </CtaLink>
            <CtaLink
              href="#how-it-works"
              variant="secondary"
              size="lg"
              iconAfter={<ArrowDown className="size-4" />}
            >
              See how it works
            </CtaLink>
          </div>

          <dl className="mt-9 grid max-w-lg grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
            {[
              { label: 'Files indexed', value: PROJECT.index.files },
              { label: 'Contracts', value: CONTRACTS.length },
              { label: 'Enforced rules', value: RULES.length },
              { label: 'Accepted ADRs', value: ADRS.length },
            ].map((s) => (
              <div key={s.label} className="flex flex-col-reverse">
                <dd className="tabular text-2xl font-bold leading-none text-gray-900">
                  {s.value.toLocaleString()}
                </dd>
                <dt className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                  {s.label}
                </dt>
              </div>
            ))}
          </dl>
        </div>

        <GatePreview className="lg:pl-2" />
      </div>
    </section>
  )
}

/* --------------------------------------------------------------- Problem */

const TODAYS_FLOW = [
  'Requirement',
  'Developer starts coding',
  'Implementation',
  'Build, test, review',
  { label: 'Architecture or contract problem discovered', flag: true },
  'Refactoring',
  'More testing',
  'More review',
]

const PREFLIGHT_FLOW = [
  'Describe what you want to build',
  'Pre-Flight reads the repository',
  'Six checks run in parallel',
  'Policy engine weighs the evidence',
  { label: 'Clear to go · Needs review · Stop and rethink', flag: true },
  'Fix plan reviewed and approved by you',
  'Implementation follows the approved plan',
  'Same checks re-run to confirm the result',
]

const GLOBALLY_WRONG = [
  {
    title: 'A service that already exists',
    body: 'A new NotificationService is proposed. The repository already owns fan-out delivery over the EventBus.',
  },
  {
    title: 'A boundary walked straight through',
    body: 'The dashboard queries PostgreSQL directly because the analytics API felt like an extra hop.',
  },
  {
    title: 'A field rename with consumers',
    body: 'User.name becomes User.displayName. Eight consumers, three of them outside this repository, still read the old name.',
  },
  {
    title: 'A package nobody should adopt',
    body: 'A deprecated formatter, a forbidden polyfill, or a third-party library for something the platform already owns.',
  },
  {
    title: 'A migration with an unknown blast radius',
    body: 'A column is dropped. One consumer of it is documented in a spreadsheet, not in the schema.',
  },
  {
    title: 'A decision the team already made',
    body: 'RabbitMQ looks fine. ADR-014 settled the broker eight months ago — it just never made it into the next conversation.',
  },
]

function ProblemSection() {
  return (
    <Section
      id="problem"
      tone="block"
      bgImage="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1600&q=80&auto=format&fit=crop"
      bgOverlay="linear-gradient(105deg,rgba(244,246,251,0.96) 0%,rgba(244,246,251,0.82) 45%,rgba(244,246,251,0.45) 70%,rgba(244,246,251,0.12) 100%)"
    >

      <SectionHeading
        eyebrow="The problem"
        title={
          <>
            Most architectural problems are found after the code is already written.
          </>
        }
        lede="A change can look perfectly fine on its own but break something important in the wider codebase. By the time that surfaces in review, the work is done, tested, and merged — and fixing it means starting over."
      />

      <div className="mt-9 grid gap-5 lg:grid-cols-2">
        <FlowCard
          title="The usual way"
          tone="block"
          items={TODAYS_FLOW}
          footnote="Everything below the flag is rework — paid for in time, re-tests and frustration."
        />
        <FlowCard
          title="With Pre-Flight first"
          tone="pass"
          items={PREFLIGHT_FLOW}
          footnote="The flag is a clear decision with evidence and a fix plan — not another vague review comment."
        />
      </div>

      <div className="mt-12">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-gray-400">
          Common things Pre-Flight catches early
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GLOBALLY_WRONG.map((item) => (
            <article
              key={item.title}
              className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-3 flex size-8 items-center justify-center rounded-xl bg-amber-50">
                <TriangleAlert className="size-4 text-amber-500" />
              </div>
              <h3 className="text-[14px] font-bold leading-snug text-gray-900">{item.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-gray-500">{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </Section>
  )
}

type FlowItem = string | { label: string; flag: boolean }

function FlowCard({
  title,
  items,
  tone,
  footnote,
}: {
  title: string
  items: FlowItem[]
  tone: 'block' | 'pass'
  footnote: string
}) {
  const t = tone === 'block' ? decisionTone.BLOCKED : decisionTone.CLEARED
  const isBlock = tone === 'block'

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div
        className="flex items-center justify-between gap-3 px-5 py-4"
        style={{ borderBottom: `2px solid ${t.hex}` }}
      >
        <h3 className="text-[15px] font-bold text-gray-900">{title}</h3>
        <span
          className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest"
          style={{
            color: t.hex,
            backgroundColor: `color-mix(in oklab, ${t.hex} 10%, transparent)`,
          }}
        >
          {isBlock ? 'reactive' : 'preventive'}
        </span>
      </div>

      {/* Steps */}
      <ol className="px-5 py-4">
        {items.map((item, i) => {
          const flagged = typeof item !== 'string' && item.flag
          const label = typeof item === 'string' ? item : item.label
          return (
            <li key={label} className="relative flex gap-3.5 pb-3 last:pb-0">
              {/* Connector line */}
              {i < items.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-[8px] top-5 h-full w-px"
                  style={{ backgroundColor: flagged ? t.hex : '#e5e7eb' }}
                />
              )}
              {/* Dot */}
              <span
                aria-hidden
                className="relative mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border-2"
                style={{
                  borderColor: flagged ? t.hex : '#d1d5db',
                  backgroundColor: flagged ? `color-mix(in oklab, ${t.hex} 15%, white)` : 'white',
                }}
              >
                {flagged && (
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: t.hex }}
                  />
                )}
              </span>
              {/* Label */}
              <span
                className={cn(
                  'text-[13px] leading-snug',
                  flagged ? 'font-semibold' : 'font-normal text-gray-500',
                )}
                style={flagged ? { color: t.hex } : undefined}
              >
                {label}
              </span>
            </li>
          )
        })}
      </ol>

      {/* Footnote */}
      <div className="border-t border-gray-100 bg-gray-50 px-5 py-3">
        <p className="text-[12px] leading-relaxed text-gray-400">{footnote}</p>
      </div>
    </div>
  )
}

/* --------------------------------------------------------- How it works */

const CHECK_NAMES = [
  'architecture',
  'contracts',
  'dependencies',
  'impact',
  'security',
  'past decisions',
]

const PHASES = [
  {
    key: 'understand',
    label: 'Describe',
    icon: Radar,
    start: 1,
    steps: [
      { title: 'One sentence is enough', body: '"Add Google OAuth login." That\'s it. No ticket links, no diagrams, no context docs.' },
      { title: 'Pre-Flight maps the change', body: 'It works out which parts of the codebase are involved and what the realistic risk looks like — before anything is checked.' },
    ],
  },
  {
    key: 'analyse',
    label: 'Check',
    icon: Split,
    start: 3,
    steps: [
      { title: 'Reads your actual codebase', body: `${PROJECT.index.modules} modules, ${PROJECT.index.symbols.toLocaleString()} symbols, calls, imports, APIs, events, tables and lockfile entries — all resolved.` },
      { title: 'Six checks run in parallel', body: 'Architecture, contracts, dependencies, impact, security and past decisions — each checked independently at the same time.' },
      { title: 'Evidence collected, not guessed', body: 'Every finding links back to the exact rule, file, line, and the consumers affected.' },
    ],
  },
  {
    key: 'decide',
    label: 'Decide',
    icon: Gavel,
    start: 6,
    steps: [
      { title: 'A clear verdict with reasons', body: 'Not a black-box score — you can see exactly what contributed and why.' },
      { title: 'Good to go, review, or stop', body: `${BLOCKING_RULES} rules are hard stops. Everything else gives you a clear explanation and lets you decide.` },
      { title: 'Fix plan ready to approve', body: 'Ordered steps you review and sign off before anything is changed.' },
    ],
  },
  {
    key: 'build',
    label: 'Build',
    icon: Workflow,
    start: 9,
    steps: [
      { title: 'Work within what was approved', body: 'Implementation stays inside the boundaries that were checked. Nothing extra, nothing unexpected.' },
      { title: 'Checks re-run on the result', body: 'The same rules are verified against the finished work, so nothing slips through during the build.' },
    ],
  },
]

const SPECIALISTS = [
  {
    icon: Waypoints,
    name: 'Architecture',
    tone: 'accent' as const,
    checks: [
      'Checks layer and service boundaries aren\'t crossed',
      'Spots circular dependencies before they become a problem',
      'Flags duplicate work that could extend something that already exists',
      'Notices when the approach doesn\'t match how the rest of the codebase is built',
    ],
    verdict: 'Hard rule violations stop the change. Borderline cases are flagged for your review.',
  },
  {
    icon: FileCode2,
    name: 'Contracts',
    tone: 'agent' as const,
    checks: [
      `Covers ${CONTRACTS.length} contracts — APIs, types, events, databases, config and auth`,
      `Identifies which changes would break something downstream (${BREAKING_CONTRACTS} currently at risk)`,
      'Lists every consumer of each contract, including external ones',
      'Tells you whether a schema change is additive or breaking',
    ],
    verdict: 'Breaking a contract that has consumers is a hard stop.',
  },
  {
    icon: Boxes,
    name: 'Dependencies',
    tone: 'review' as const,
    checks: [
      'Reads from your actual lockfile and registry — not from memory',
      'Checks for deprecated packages, version conflicts and policy violations',
      `Suggests internal alternatives where they exist (${FORBIDDEN_DEPS.filter((d) => d.internalAlternative).length} recorded here)`,
      'Flags maintenance risk and migration implications',
    ],
    verdict: `Banned packages never make it into your lockfile. ${FORBIDDEN_DEPS.length} are blocked in this repo.`,
  },
  {
    icon: GitBranch,
    name: 'Impact',
    tone: 'accent' as const,
    checks: [
      'Shows every file, module, API, table and event the change touches',
      'Finds downstream consumers and the tests covering them',
      'Routes ownership to the right team for review',
      'Ranks potential breaking changes by how serious they are',
    ],
    verdict: 'A large footprint raises the risk score — it doesn\'t automatically stop the change.',
  },
  {
    icon: ShieldAlert,
    name: 'Security',
    tone: 'block' as const,
    checks: [
      'Checks for auth boundary changes',
      'Catches secrets that could end up in a client bundle',
      'Flags direct database access and sensitive data flows',
      'Spots new outbound calls and privilege escalation',
    ],
    verdict: 'Security concerns are weighed in the overall verdict — a boundary breach is a hard stop.',
  },
  {
    icon: ScrollText,
    name: 'Past decisions',
    tone: 'agent' as const,
    checks: [
      `Indexes ${ADRS.length} accepted decision records with their rationale`,
      'Treats rejected alternatives as constraints, not just history',
      'Flags proposals that contradict a past decision',
      'Feeds new decisions back as rules for next time',
    ],
    verdict: 'Keeps institutional knowledge in the loop, even when the people aren\'t.',
  },
]

function HowItWorksSection() {
  return (
    <Section
      id="how-it-works"
      tone="accent"
      bgImage="https://images.unsplash.com/photo-1551434678-e076c223a692?w=1600&q=80&auto=format&fit=crop"
      bgOverlay="rgba(244,246,251,0.55)"
    >
      <SectionHeading
        eyebrow="How it works"
        title="From one sentence to a safe, verified change."
        lede="Describe what you want to build. Pre-Flight does the research, runs the checks, gives you a clear verdict with evidence, and keeps you in control every step of the way."
      />

      <div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PHASES.map((phase) => (
          <div key={phase.key} className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {/* Phase header */}
            <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-4">
              <span className="flex size-8 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <phase.icon className="size-4" />
              </span>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{phase.label}</p>
            </div>

            <ol className="flex-1 space-y-4 px-5 py-4">
              {phase.steps.map((step, i) => (
                <li key={step.title} className="flex gap-3">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent/10 font-mono text-[10px] font-bold text-accent">
                    {phase.start + i}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold leading-snug text-gray-900">{step.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-gray-500">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            {phase.key === 'analyse' && (
              <div className="border-t border-gray-100 bg-gray-50 px-5 py-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Checks included</p>
                <div className="flex flex-wrap gap-1">
                  {CHECK_NAMES.map((a) => (
                    <span
                      key={a}
                      className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[9px] text-indigo-600"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Confidence bar */}
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-3.5 shadow-sm">
        <Layers className="size-4 shrink-0 text-gray-400" />
        <span className="text-sm text-gray-600">
          Every verdict comes with its evidence attached — whether it's clear to go or needs a rethink, you always know exactly why.
          Verified facts can stop a change. Reasoned findings ask for your input. Gaps in evidence are called out clearly, never swept under the rug.
        </span>
        <CtaLink to="/changes/new" variant="ghost" size="sm" className="ml-auto" iconAfter={<ArrowRight className="size-3" />}>
          Try it now
        </CtaLink>
      </div>

      {/* Six checks grid */}
      <div className="mt-10">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-gray-400">What each check covers</p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {SPECIALISTS.map((s) => {
            const toneColors = {
              accent: { bg: 'bg-indigo-50', text: 'text-indigo-600', dot: 'bg-indigo-400' },
              agent:  { bg: 'bg-violet-50',  text: 'text-violet-600',  dot: 'bg-violet-400' },
              review: { bg: 'bg-amber-50',   text: 'text-amber-600',   dot: 'bg-amber-400' },
              block:  { bg: 'bg-rose-50',    text: 'text-rose-600',    dot: 'bg-rose-400' },
            }[s.tone]
            return (
              <article key={s.name} className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
                  <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', toneColors.bg)}>
                    <s.icon className={cn('size-4', toneColors.text)} />
                  </span>
                  <h3 className="text-[14px] font-bold text-gray-900">{s.name}</h3>
                  <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gray-500">
                    read only
                  </span>
                </div>
                <ul className="flex-1 space-y-2 px-5 py-4">
                  {s.checks.map((c) => (
                    <li key={c} className="flex gap-2.5 text-[13px] leading-relaxed text-gray-600">
                      <span className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', toneColors.dot)} />
                      {c}
                    </li>
                  ))}
                </ul>
                <div className="border-t border-gray-100 bg-gray-50 px-5 py-3">
                  <p className="text-[12px] leading-relaxed text-gray-500">{s.verdict}</p>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </Section>
  )
}

/* -------------------------------------------------------------- Policies */

const ARCHITECTURE_YAML = `version: "1.0"

layers:
  frontend:
    allowed_dependencies: [api, ui]
  api:
    allowed_dependencies: [services, schemas]
  services:
    allowed_dependencies: [repositories, external]
  repositories:
    allowed_dependencies: [database]

rules:
  - id: ARCH-001
    description: "Frontend must not access database"
    from: frontend
    to: database
    action: block
  - id: ARCH-006
    description: "Credentials must never reach a client bundle"
    expression: "no(frontend -/-> secret)"
    action: block
`

const DEPENDENCY_YAML = `dependencies:
  forbidden:
    - moment        # deprecated upstream
    - node-fetch    # native fetch already exists
    - rabbitmq      # contradicts ADR-014
  approval_required:
    - library-x     # WebSocketGateway owns sockets (ADR-021)
    - pg            # repositories own SQL (ADR-009)
`

function PolicySection() {
  return (
    <Section
      id="policies"
      tone="review"
      bgImage="https://images.unsplash.com/photo-1542903660-eedba2cda473?w=1600&q=80&auto=format&fit=crop"
      bgOverlay="rgba(244,246,251,0.55)"
    >
      <SectionHeading
        eyebrow="Your rules, in your repo"
        title="Policies live next to your code, not in a separate dashboard."
        lede="You define which layers can talk to which, which packages are off-limits, and which past decisions should never be reversed. Pre-Flight reads those files and enforces them — the rules can't drift because they're versioned right alongside the code."
      />

      <div className="mt-9 grid gap-6 lg:grid-cols-2 lg:gap-8">
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">Rules in this repository</p>
          <ul className="space-y-2">
            {RULES.slice(0, 4).map((r) => (
              <li key={r.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-gray-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-gray-600">
                    {r.id}
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                      r.enforcement === 'block'
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-amber-50 text-amber-600',
                    )}
                  >
                    {r.enforcement}
                  </span>
                  <span className="text-[13px] font-semibold text-gray-900">{r.description}</span>
                </div>
                <p className="mt-2 font-mono text-[11px] text-gray-400">{r.expression}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] leading-relaxed text-gray-500">
            {RULES.length} rules total, {BLOCKING_RULES} of them hard stops.
            The rest flag things for your attention — not every concern is a violation.
          </p>
        </div>

        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
            <CodeBlock code={ARCHITECTURE_YAML} path="policies/architecture.yaml" maxHeight={340} />
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
            <CodeBlock code={DEPENDENCY_YAML} path="policies/dependencies.yaml" maxHeight={200} />
          </div>
          <p className="text-[12px] leading-relaxed text-gray-500">
            The same policies run in CI: a blocked change exits non-zero and the pull request stays
            red until the plan is amended or a human overrides with a reason.
          </p>
        </div>
      </div>
    </Section>
  )
}

/* ------------------------------------------- Results, Bob & Teams (merged) */

const TARGETS = [
  { value: '≥90%', label: 'less time spent on dead-end refactors', note: 'measured against a baseline in constructed dead-end scenarios' },
  { value: '0', label: 'deprecated or policy-blocked adoptions', note: 'in benchmark scenarios designed to probe the guardrail' },
  { value: '100%', label: 'of supported change types contract-checked', note: 'pre-implementation, not post-implementation' },
]

const PERF_TARGETS = [
  { label: 'Initial index', value: '< 2 min' },
  { label: 'Incremental index', value: '< 30 s' },
  { label: 'Pre-flight analysis', value: '< 60 s' },
  { label: 'Simple local change', value: '< 15 s' },
]

const MODE_MAP = [
  { key: 'PLAN', body: 'Understand the intent and map out what the change will touch.' },
  { key: 'PRE-FLIGHT', body: 'Run all six checks and collect the evidence.' },
  { key: 'APPROVAL', body: 'You review the fix plan and say yes before anything is changed.' },
  { key: 'BUILD', body: 'Implementation follows the approved plan — nothing more, nothing less.' },
  { key: 'VERIFY', body: 'The same checks run again on the finished result.' },
]

const AUDIENCES = [
  {
    icon: Terminal,
    title: 'Developers',
    body: 'Find out whether a change fits the codebase before you write it — not at review time when it\'s already done.',
  },
  {
    icon: Layers,
    title: 'Tech leads & architects',
    body: 'Turn the boundaries you\'ve always defended in review into rules that are checked automatically on every change.',
  },
  {
    icon: Workflow,
    title: 'Platform & DevOps',
    body: 'A proper CI gate — real exit code, scoped access, a full audit trail of every decision and its reasoning.',
  },
  {
    icon: Users,
    title: 'Engineering managers',
    body: 'Less rework, fewer surprises in review, and a clear record of why architectural decisions were made.',
  },
]

const NON_GOALS = [
  'Not a coding tool — it runs before any code is written.',
  'Not a replacement for static analysis, security scanners or contract-testing frameworks.',
  'Not a vulnerability database — it reads your lockfile, your registry and your policy files.',
  'Not an architecture modelling tool — it works with the evidence your codebase already has.',
]

function ResultsSection() {
  return (
    <Section
      id="results"
      tone="accent"
      bgImage="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1600&q=80&auto=format&fit=crop"
      bgOverlay="rgba(244,246,251,0.55)"
    >
      <SectionHeading
        eyebrow="Results, built on IBM Bob 2.0 · Who it's for"
        title={
          <>
            {BENCHMARK_SEEDS.length} changes tested. One clear answer every time.
          </>
        }
        lede="Pre-Flight is tested against scenarios where the correct verdict is already known — before the tool sees it. That way you can see exactly where it's reliable, not just take our word for it."
      />

      {/* ── Benchmark row ── */}
      <div className="mt-9 grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">Verdict distribution</p>
          <div className="space-y-3">
            {DECISION_MIX.map(({ decision, count }) => {
              const t = decisionTone[decision]
              return (
                <div key={decision}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] font-semibold" style={{ color: t.hex }}>{t.label}</span>
                    <span className="font-mono text-[12px] text-gray-500">{count}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(count / BENCHMARK_SEEDS.length) * 100}%`, backgroundColor: t.hex }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-widest text-gray-400">By category</p>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_MIX.map((c) => (
              <span key={c.category} className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[11px] text-gray-600">
                {c.category} <span className="font-bold text-gray-900">{c.count}</span>
              </span>
            ))}
          </div>

          <p className="mt-4 border-t border-gray-100 pt-3 text-[12px] leading-relaxed text-gray-500">
            Most scenarios are blocking on purpose — that's where the guardrail earns its keep.
          </p>
        </div>

        <div className="space-y-4 lg:col-span-3">
          <div className="grid gap-3 sm:grid-cols-3">
            {TARGETS.map((t) => (
              <div key={t.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-3xl font-bold leading-none text-accent">{t.value}</p>
                <p className="mt-2.5 text-[13px] font-semibold leading-snug text-gray-900">{t.label}</p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-gray-500">{t.note}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Timer className="size-4 text-gray-400" />
              <p className="text-[13px] font-bold text-gray-900">Performance targets</p>
              <span className="ml-auto rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-semibold text-gray-500">
                targets, not measurements
              </span>
            </div>
            <dl className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
              {PERF_TARGETS.map((p) => (
                <div key={p.label} className="flex items-center justify-between gap-3 border-b border-gray-100 pb-2">
                  <dt className="text-[13px] text-gray-600">{p.label}</dt>
                  <dd className="font-mono text-[12px] font-bold text-gray-900">{p.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[12px] leading-relaxed text-gray-500">
              {countLabel(BENCHMARK_SEEDS.length, 'scenario')} · duration and false-positive rate reported per run.
            </p>
          </div>
        </div>
      </div>

      {/* ── Bob mode lifecycle ── */}
      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <div>
          <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-gray-400">Built on IBM Bob 2.0</p>
          <ul className="space-y-3">
            {[
              {
                icon: Radar,
                title: 'Plan, build and ask — each mode has a clear role',
                body: 'Planning maps the change, building carries out the approved plan, and asking answers questions like "what does this repo already do about auth?"',
              },
              {
                icon: Network,
                title: 'Each check runs in its own context',
                body: 'The six checks don\'t interfere with each other. Each one focuses on what it knows best and returns a clear summary.',
              },
              {
                icon: ScrollText,
                title: 'Repository knowledge persists across sessions',
                body: 'Project structure, stack, dependencies, conventions and past decisions stay available — you don\'t have to re-explain things each time.',
              },
              {
                icon: Workflow,
                title: 'Pre-Flight is a proper workflow, not a plugin',
                body: 'It can read your graph and your policies. It cannot write anything until you\'ve said yes to the plan.',
              },
            ].map((item) => (
              <li key={item.title} className="flex gap-3.5">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <item.icon className="size-4" />
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-gray-900">{item.title}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-gray-500">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <CtaLink
              href="https://bob.ibm.com/docs/ide"
              variant="secondary"
              icon={<ArrowRight className="size-3.5" />}
            >
              IBM Bob documentation
            </CtaLink>
            <CtaLink to="/dashboard" variant="ghost">
              Open the console
            </CtaLink>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-3.5">
            <Workflow className="size-4 text-gray-400" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Workflow lifecycle</p>
          </div>
          <ol className="divide-y divide-gray-100">
            {MODE_MAP.map((m, i) => (
              <li key={m.key} className="flex items-center gap-3.5 px-5 py-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent/10 font-mono text-[10px] font-bold text-accent">
                  {i + 1}
                </span>
                <span className="w-24 shrink-0 font-mono text-[10px] font-bold uppercase tracking-wide text-accent">
                  {m.key}
                </span>
                <span className="min-w-0 text-[12px] leading-relaxed text-gray-600">{m.body}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* ── Who it's for ── */}
      <div className="mt-10">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-gray-400">Who it's for</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIENCES.map((a) => (
            <article key={a.title} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <span className="mb-3 flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <a.icon className="size-5" />
              </span>
              <h3 className="text-[14px] font-bold text-gray-900">{a.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-gray-500">{a.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-5 py-3.5">
            <Ban className="size-4 text-gray-400" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">What Pre-Flight is not</p>
          </div>
          <ul className="grid sm:grid-cols-2">
            {NON_GOALS.map((n) => (
              <li key={n} className="flex items-start gap-3 border-b border-r border-gray-100 px-5 py-4 last:border-b-0">
                <X className="mt-0.5 size-4 shrink-0 text-gray-300" />
                <span className="text-[13px] leading-relaxed text-gray-600">{n}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------ Final CTA */

const CLI = `$ preflight init && preflight index
$ preflight analyze --change "Add a real-time notification service using Library X"

Architecture       PASS
Contracts          FAIL
Dependencies       FAIL
Security           PASS
Impact             REVIEW

RESULT: BLOCKED

Reason: NotificationService already owns fan-out delivery
        (ARCH-004) and library-x is approval-required.
Exit code: 1
`

function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-line/60 py-16 sm:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(45% 60% at 50% 100%, color-mix(in oklab, var(--color-accent) 14%, transparent), transparent 70%)',
        }}
      />

      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="eyebrow">Ready to try it?</p>
          <h2 className="mt-3 text-balance text-2xl font-semibold leading-tight tracking-tight text-fg sm:text-3xl">
            Check your next change before it becomes your next rework.
          </h2>
          <p className="mt-4 max-w-lg text-pretty text-sm leading-relaxed text-muted">
            Point Pre-Flight at a repository, describe what you want to build, and get a
            clear verdict with the evidence behind it. The demo runs on ORCA — {PROJECT.index.files.toLocaleString()}{' '}
            files, {countLabel(CONTRACTS.length, 'contract')}, {countLabel(RULES.length, 'rule')} and{' '}
            {countLabel(ADRS.length, 'accepted decision')}.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <CtaLink
              to="/changes/new"
              size="lg"
              icon={<Rocket className="size-4" />}
              iconAfter={<ArrowRight className="size-4" />}
            >
              Check my change
            </CtaLink>
            <CtaLink to="/architecture" variant="secondary" size="lg" icon={<Waypoints className="size-4" />}>
              Explore the codebase
            </CtaLink>
          </div>

          <p className="mt-5 font-mono text-[11px] text-subtle">
            or browse the console directly —{' '}
            <Link to="/dashboard" className="text-accent underline-offset-2 hover:underline">
              /dashboard
            </Link>
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-line-strong">
          <CodeBlock code={CLI} path="terminal · preflight ci" maxHeight={420} />
        </div>
      </div>
    </section>
  )
}
