import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { dimensionTone } from '@/lib/status'
import type { DimensionStatus } from '@/types'

/** Determinate progress bar with an accessible value. */
export function ProgressBar({
  value,
  status = 'pending',
  className,
  height = 4,
  label,
}: {
  value: number
  status?: DimensionStatus
  className?: string
  height?: number
  label?: string
}) {
  const pct = Math.max(0, Math.min(1, value))
  const color = dimensionTone[status].hex
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('w-full overflow-hidden rounded-full bg-line', className)}
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-200 ease-out"
        style={{ width: `${pct * 100}%`, backgroundColor: color }}
      />
    </div>
  )
}

/** Segmented bar for factor contributions (PRD 14 risk breakdown). */
export function FactorBar({
  weight,
  max,
  color,
  className,
}: {
  weight: number
  max: number
  color: string
  className?: string
}) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-line', className)}>
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${Math.min(100, (weight / max) * 100)}%`, backgroundColor: color }}
      />
    </div>
  )
}

export function ConfidenceMeter({ value, className }: { value: number; className?: string }) {
  const color = value >= 0.9 ? '#35d6a0' : value >= 0.7 ? '#f6b545' : '#22d3ee'
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-1 w-16 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full" style={{ width: `${value * 100}%`, backgroundColor: color }} />
      </div>
      <span className="tabular font-mono text-[11px] text-muted">{value.toFixed(2)}</span>
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-raised', className)} />
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block size-4 animate-spin rounded-full border-2 border-line-strong border-t-accent',
        className,
      )}
    />
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      {icon ? <div className="text-subtle">{icon}</div> : null}
      <div>
        <p className="text-sm font-medium text-fg">{title}</p>
        {description ? <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-subtle">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
