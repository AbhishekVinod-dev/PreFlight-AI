import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { buttonClass, type ButtonSize, type ButtonVariant } from '@/components/ui/Button'

/**
 * Building blocks shared by every section of the marketing page.
 *
 * The console (AppShell) is a dense instrument panel: the site is the same
 * instrument photographed from further away. Same tokens, same type scale,
 * more air.
 */

interface SectionProps {
  id: string
  children: ReactNode
  className?: string
  divider?: boolean
  tone?: 'accent' | 'agent' | 'pass' | 'review' | 'block'
  /** Unsplash (or any) image URL to use as a section background */
  bgImage?: string
  /** CSS background value for the overlay on top of bgImage. Defaults to a light wash. */
  bgOverlay?: string
}

export function Section({ id, children, className, divider = true, tone, bgImage, bgOverlay }: SectionProps) {
  return (
    <section
      id={id}
      className={cn('relative scroll-mt-16 overflow-hidden', divider && 'border-t border-line/60', 'py-14 sm:py-20', className)}
    >
      {/* Optional background photo */}
      {bgImage && (
        <img
          aria-hidden
          src={bgImage}
          alt=""
          loading="lazy"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
          style={{ zIndex: -2 }}
        />
      )}
      {/* Overlay — defaults to a near-opaque canvas wash so content is always readable */}
      {bgImage && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            zIndex: -1,
            background: bgOverlay ?? 'rgba(244,246,251,0.88)',
          }}
        />
      )}
      {tone ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, color-mix(in oklab, var(--color-${tone}) 45%, transparent), transparent)`,
          }}
        />
      ) : null}
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">{children}</div>
    </section>
  )
}

/** Standard section header: PRD reference, headline, one paragraph of lede. */
export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = 'left',
  action,
  className,
}: {
  eyebrow: string
  title: ReactNode
  lede?: ReactNode
  align?: 'left' | 'center'
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        align === 'center' ? 'items-center text-center' : 'lg:flex-row lg:items-end lg:justify-between',
        className,
      )}
    >
      {/* Frosted backdrop ensures heading text is readable over any background photo */}
      <div
        className={cn(
          'max-w-2xl rounded-2xl px-6 py-5',
          align === 'center' && 'mx-auto',
        )}
        style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      >
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#4f46e5' }}>
          {eyebrow}
        </p>
        <h2 className="mt-2 text-balance text-2xl font-bold leading-tight tracking-tight sm:text-3xl" style={{ color: '#111827' }}>
          {title}
        </h2>
        {lede ? (
          <p className="mt-3 max-w-xl text-pretty text-sm leading-relaxed sm:text-[15px]" style={{ color: '#374151' }}>
            {lede}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  )
}

/**
 * Anchor that looks like a Button. `to` renders a router link, `href` an
 * external one — the footer and the Bob section need the latter.
 */
export function CtaLink({
  to,
  href,
  variant = 'primary',
  size = 'md',
  icon,
  iconAfter,
  className,
  children,
}: {
  to?: string
  href?: string
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  iconAfter?: ReactNode
  className?: string
  children: ReactNode
}) {
  const classes = buttonClass(variant, size, className)
  const inner = (
    <>
      {icon}
      {children}
      {iconAfter}
    </>
  )

  if (href) {
    // In-page anchors stay in the tab; only real external links open a new one.
    return href.startsWith('#') ? (
      <a href={href} className={classes}>
        {inner}
      </a>
    ) : (
      <a href={href} target="_blank" rel="noreferrer" className={classes}>
        {inner}
      </a>
    )
  }
  return (
    <Link to={to ?? '/'} className={classes}>
      {inner}
    </Link>
  )
}

/** Tailwind needs literal class strings, so the marker tones are spelled out. */
const MARKER_TONE: Record<'accent' | 'pass' | 'review' | 'block' | 'agent', string> = {
  accent: 'border-accent/40 bg-accent/10 text-accent',
  pass: 'border-pass/40 bg-pass/10 text-pass',
  review: 'border-review/40 bg-review/10 text-review',
  block: 'border-block/40 bg-block/10 text-block',
  agent: 'border-agent/40 bg-agent/10 text-agent',
}

/** Numbered step marker used by the pipeline and mapping lists. */
export function StepMarker({
  index,
  tone = 'accent',
}: {
  index: number | string
  tone?: 'accent' | 'pass' | 'review' | 'block' | 'agent'
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'tabular grid size-6 shrink-0 place-items-center rounded border font-mono text-[10px] font-semibold',
        MARKER_TONE[tone],
      )}
    >
      {index}
    </span>
  )
}
