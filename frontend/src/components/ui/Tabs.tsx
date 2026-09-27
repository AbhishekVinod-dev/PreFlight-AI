import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface TabItem {
  to: string
  label: string
  icon?: ReactNode
  count?: number
  end?: boolean
  disabled?: boolean
}

/** Route-driven tabs: the active tab is derived from the URL, not local state. */
export function Tabs({ items, className }: { items: TabItem[]; className?: string }) {
  return (
    <nav className={cn('flex items-center gap-1 overflow-x-auto', className)} role="tablist">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          role="tab"
          aria-disabled={item.disabled}
          onClick={(e) => item.disabled && e.preventDefault()}
          className={({ isActive }) =>
            cn(
              'relative flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors',
              isActive
                ? 'border-accent text-fg'
                : 'border-transparent text-subtle hover:border-line-strong hover:text-muted',
              item.disabled && 'pointer-events-none opacity-40',
            )
          }
        >
          {item.icon}
          {item.label}
          {item.count !== undefined ? (
            <span className="tabular rounded bg-raised px-1.5 py-px font-mono text-[10px] text-muted">
              {item.count}
            </span>
          ) : null}
        </NavLink>
      ))}
    </nav>
  )
}
