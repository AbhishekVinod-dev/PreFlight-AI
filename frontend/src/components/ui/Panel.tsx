import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface PanelProps {
  children: ReactNode
  className?: string
  /** Removes body padding for tables/graphs. */
  flush?: boolean
}

export function Panel({ children, className, flush }: PanelProps) {
  return <section className={cn('panel', className)}>{flush ? children : <div className="p-4">{children}</div>}</section>
}

interface HeaderProps {
  title: ReactNode
  eyebrow?: ReactNode
  action?: ReactNode
  description?: ReactNode
  className?: string
}

export function PanelHeader({ title, eyebrow, action, description, className }: HeaderProps) {
  return (
    <header
      className={cn(
        'flex items-start justify-between gap-4 border-b border-line px-4 py-3',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 className="truncate text-sm font-semibold text-fg">{title}</h2>
        {description ? <p className="mt-0.5 text-xs leading-relaxed text-subtle">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </header>
  )
}

export function PanelBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('p-4', className)}>{children}</div>
}

export function PanelFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <footer className={cn('flex items-center gap-3 border-t border-line px-4 py-3', className)}>
      {children}
    </footer>
  )
}
