import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'

const SECTIONS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#specialists', label: 'Specialist agents' },
  { href: '#trust', label: 'Trust model' },
  { href: '#policies', label: 'Architecture-as-code' },
  { href: '#benchmark', label: 'Benchmark' },
  { href: '#bob', label: 'IBM Bob integration' },
]

const CONSOLE = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/changes/new', label: 'New pre-flight' },
  { to: '/architecture', label: 'Architecture graph' },
  { to: '/policies', label: 'Policy engine' },
  { to: '/decisions', label: 'Decision records' },
  { to: '/metrics', label: 'Metrics' },
]

const RESOURCES = [
  { href: 'https://bob.ibm.com/docs/ide', label: 'IBM Bob overview' },
  { href: 'https://bob.ibm.com/docs/ide/tutorials/start-a-project', label: '/init and AGENTS.md' },
  { href: 'https://bob.ibm.com/docs/shell/features/subagents', label: 'Subagents' },
  { href: 'https://bob.ibm.com/docs/ide/configuration/custom-modes', label: 'Custom modes' },
]

function FooterColumn({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="eyebrow">{title}</p>
      <ul className="mt-2.5 space-y-1.5">{children}</ul>
    </div>
  )
}

export function LandingFooter() {
  return (
    <footer className="border-t border-line/60 bg-surface/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-md border border-accent/40 bg-accent/10 text-accent">
                <ShieldCheck className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold tracking-tight text-fg">
                  Architectural
                </span>
                <span className="eyebrow block">Pre-Flight</span>
              </span>
            </div>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-subtle">
              An engineering governance layer that decides whether a proposed change
              should be built &mdash; before it is written.
            </p>
          </div>

          <FooterColumn title="Product">
            {SECTIONS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="text-[13px] text-muted underline-offset-2 transition-colors hover:text-fg hover:underline"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </FooterColumn>

          <FooterColumn title="Console">
            {CONSOLE.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className="text-[13px] text-muted underline-offset-2 transition-colors hover:text-fg hover:underline"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </FooterColumn>

          <FooterColumn title="Resources">
            {RESOURCES.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[13px] text-muted underline-offset-2 transition-colors hover:text-fg hover:underline"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </FooterColumn>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-line/60 pt-6 text-[11px] text-subtle sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono">
            architectural-preflight · PRD v1.0 · orchestration on IBM Bob 2.0
          </p>
          <p className="max-w-md sm:text-right">
            Performance and rework figures shown on this page are targets from the product
            specification, validated against the evaluation benchmark &mdash; not marketing claims.
          </p>
        </div>
      </div>
    </footer>
  )
}
