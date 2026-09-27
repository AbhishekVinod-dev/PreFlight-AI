import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Boxes,
  FileCode2,
  Gauge,
  GitPullRequestArrow,
  LayoutDashboard,
  Plus,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Waypoints,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useApp } from '@/store/store'
import { relativeTime } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Toaster } from '@/components/ui/Toaster'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { StatusBadge } from '@/components/ui/Badge'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/changes/new', label: 'New pre-flight', icon: Plus },
  { to: '/changes', label: 'Change requests', icon: GitPullRequestArrow },
  { to: '/architecture', label: 'Architecture graph', icon: Waypoints },
  { to: '/policies', label: 'Architecture-as-code', icon: FileCode2 },
  { to: '/decisions', label: 'Decision records', icon: ScrollText },
  { to: '/metrics', label: 'Metrics & benchmark', icon: Gauge },
]

export function AppShell() {
  const { project, indexing, reindex } = useApp()
  const { pathname } = useLocation()

  return (
    <div className="relative z-10 flex min-h-screen">
      {/* ---------------------------------------------------------- Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface/70 backdrop-blur lg:flex">
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-4">
          <div className="grid size-8 shrink-0 place-items-center rounded-md border border-accent/40 bg-accent/10 text-accent">
            <ShieldCheck className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">Architectural</p>
            <p className="eyebrow">Pre-Flight</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-raised font-medium text-fg shadow-[inset_2px_0_0_0_var(--color-accent)]'
                    : 'text-muted hover:bg-raised/60 hover:text-fg',
                )
              }
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Repository footer: PRD 16 dashboard context, always visible. */}
        <div className="border-t border-line p-3">
          <div className="rounded-lg border border-line bg-panel p-3">
            <div className="flex items-center gap-2">
              <Boxes className="size-3.5 text-subtle" />
              <p className="truncate font-mono text-xs text-fg">{project?.name ?? '—'}</p>
            </div>
            <p className="mt-1 truncate font-mono text-[10px] text-subtle">{project?.repository}</p>
            <dl className="mt-2.5 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <dt className="text-subtle">Last indexed</dt>
                <dd className="text-muted">{project ? relativeTime(project.lastIndexedAt) : '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-subtle">Branch</dt>
                <dd className="font-mono text-muted">{project?.defaultBranch ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-subtle">Files</dt>
                <dd className="tabular text-muted">{project?.index.files.toLocaleString() ?? '—'}</dd>
              </div>
            </dl>
            <Button
              size="sm"
              variant="secondary"
              className="mt-3 w-full"
              onClick={reindex}
              loading={indexing}
              icon={<RefreshCw className="size-3" />}
            >
              Re-index
            </Button>
          </div>
        </div>
      </aside>

      {/* ----------------------------------------------------------- Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-2 lg:hidden">
              <ShieldCheck className="size-4 text-accent" />
              <span className="text-sm font-semibold">Pre-Flight</span>
            </div>
            <p className="hidden font-mono text-[11px] text-subtle lg:block">
              bob-preflight · {project?.name.toLowerCase() ?? 'repo'}@{project?.defaultBranch ?? 'main'}
            </p>
            <div className="ml-auto flex items-center gap-2">
              <a
                href="https://bob.ibm.com/docs/ide"
                target="_blank"
                rel="noreferrer"
                className="hidden text-[11px] text-subtle underline-offset-2 hover:text-muted hover:underline sm:inline"
              >
                IBM Bob 2.0
              </a>
              <StatusBadge status="cleared" showGlyph={false} className="hidden sm:inline-flex" />
            </div>
          </div>

          {/* Mobile nav */}
          <nav className="flex gap-1 overflow-x-auto border-t border-line px-2 py-1 lg:hidden">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex shrink-0 items-center gap-1.5 rounded px-2 py-1.5 text-xs',
                    isActive ? 'bg-raised text-fg' : 'text-subtle',
                  )
                }
              >
                <item.icon className="size-3.5" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main key={pathname} className="mx-auto w-full max-w-[1400px] flex-1 animate-fade-in px-4 py-6 sm:px-6">
          <ErrorBoundary label={pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <Toaster />
    </div>
  )
}

/** Standard page header used by every screen. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-fg">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}
