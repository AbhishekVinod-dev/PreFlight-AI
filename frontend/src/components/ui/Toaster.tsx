import { useApp } from '@/store/store'
import { cn } from '@/lib/cn'
import { CheckCircle2, Info, ShieldAlert, TriangleAlert, X } from 'lucide-react'

const TONE = {
  info: { icon: Info, cls: 'text-accent border-accent/40' },
  pass: { icon: CheckCircle2, cls: 'text-pass border-pass/40' },
  review: { icon: TriangleAlert, cls: 'text-review border-review/40' },
  block: { icon: ShieldAlert, cls: 'text-block border-block/40' },
} as const

export function Toaster() {
  const { toasts, dismiss } = useApp()
  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => {
        const { icon: Icon, cls } = TONE[t.tone]
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex animate-rise items-start gap-3 rounded-lg border bg-panel/95 p-3 shadow-xl backdrop-blur',
              cls,
            )}
          >
            <Icon className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-fg">{t.title}</p>
              {t.detail ? <p className="mt-0.5 text-xs leading-relaxed text-muted">{t.detail}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="shrink-0 rounded p-0.5 text-subtle transition-colors hover:text-fg"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
