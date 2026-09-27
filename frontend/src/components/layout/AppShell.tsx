import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
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
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/changes/new', label: 'New pre-flight', icon: Plus, highlight: true },
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
    <div className="relative z-10 flex min-h-screen flex-col bg-canvas text-fg">
      {/* ------------------------------------------------ Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Brand & Logo */}
          <div className="flex shrink-0 items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-accent/40 bg-accent/10 text-accent transition-all group-hover:scale-105 group-hover:border-accent group-hover:shadow-xs">
                <ShieldCheck className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold tracking-tight text-fg">Architectural</span>
                  <span className="rounded bg-accent/15 px-1.5 py-0.2 font-mono text-[9px] font-bold text-accent uppercase tracking-wider">
                    GATE
                  </span>
                </div>
                <p className="eyebrow text-[9.5px] leading-tight text-subtle">Pre-Flight Orchestrator</p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden items-center gap-1 xl:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
                    isActive
                      ? 'bg-raised font-semibold text-fg shadow-xs ring-1 ring-accent/30'
                      : item.highlight
                      ? 'text-accent hover:bg-accent/10 hover:text-accent font-semibold'
                      : 'text-subtle hover:bg-raised/70 hover:text-fg'
                  )
                }
              >
                <item.icon
                  className={cn(
                    'size-3.5 shrink-0',
                    item.highlight && 'text-accent'
                  )}
                />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Right Action Widgets & Repository Telemetry */}
          <div className="flex items-center gap-3">
            {/* Repository Info & Re-index Widget */}
            <div className="hidden sm:flex items-center gap-2 rounded-lg border border-line bg-surface/80 px-2.5 py-1 text-xs shadow-xs">
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted">
                <Boxes className="size-3.5 text-subtle" />
                <span className="font-semibold text-fg">{project?.name.toLowerCase() ?? 'orca'}</span>
                <span className="text-subtle">@{project?.defaultBranch ?? 'main'}</span>
              </div>
              <span className="text-subtle/50">|</span>
              <span className="font-mono text-[10.5px] text-subtle">
                {project ? relativeTime(project.lastIndexedAt) : '2m ago'}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-1.5 text-[10.5px] hover:text-accent"
                onClick={reindex}
                loading={indexing}
                title="Re-index repository graph"
                icon={<RefreshCw className="size-2.5" />}
              >
                Sync
              </Button>
            </div>

            {/* External Links */}
            <div className="hidden lg:flex items-center gap-2 font-mono text-[11px] text-subtle">
              <Link
                to="/"
                className="underline-offset-2 hover:text-muted hover:underline"
              >
                Site
              </Link>
              <span>·</span>
              <a
                href="https://bob.ibm.com/docs/ide"
                target="_blank"
                rel="noreferrer"
                className="underline-offset-2 hover:text-muted hover:underline"
              >
                IBM Bob
              </a>
            </div>

            <StatusBadge status="cleared" showGlyph={false} className="hidden sm:inline-flex text-[10px]" />
          </div>
        </div>

        {/* Secondary Sub-Navbar for smaller screens or responsive overflow */}
        <div className="flex items-center gap-1 overflow-x-auto border-t border-line/60 px-4 py-1.5 xl:hidden scrollbar-none">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-raised font-semibold text-fg ring-1 ring-accent/30'
                    : item.highlight
                    ? 'text-accent font-semibold'
                    : 'text-subtle hover:bg-raised/60 hover:text-fg'
                )
              }
            >
              <item.icon className="size-3 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </header>

      {/* ----------------------------------------------------------- Main Page Content */}
      <main key={pathname} className="mx-auto w-full max-w-[1600px] flex-1 animate-fade-in px-4 py-6 sm:px-6 lg:px-8">
        <ErrorBoundary label={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>

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
