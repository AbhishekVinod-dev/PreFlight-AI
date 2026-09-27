import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/cn'

const LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#policies',     label: 'Policies' },
  { href: '#results',      label: 'Results' },
]

export function LandingNav() {
  const [scrolled,   setScrolled]  = useState(false)
  const [activeHref, setActive]    = useState<string | null>(null)
  const [open,       setOpen]      = useState(false)
  const menuRef                    = useRef<HTMLDivElement>(null)

  /* shadow on scroll */
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 32)
    fn()
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  /* active section via IntersectionObserver */
  useEffect(() => {
    const els = LINKS.map(l => document.querySelector(l.href)).filter(Boolean) as Element[]
    if (!els.length) return
    const io = new IntersectionObserver(
      entries => {
        const hit = entries.find(e => e.isIntersecting)
        if (hit) setActive('#' + hit.target.id)
      },
      { rootMargin: '-30% 0px -60% 0px' },
    )
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  /* close mobile menu on outside click */
  useEffect(() => {
    if (!open) return
    const fn = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open])

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-all duration-200',
        scrolled ? 'bg-white/95 shadow-[0_1px_0_0_var(--color-line)] backdrop-blur-md'
                 : 'bg-white/75 backdrop-blur-sm',
      )}
    >
      {/* ── main bar ── */}
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">

        {/* Wordmark — no icon */}
        <Link to="/" className="mr-10 shrink-0 select-none">
          <span className="text-base font-bold tracking-tight text-fg">Pre-Flight</span>
          <span className="ml-1.5 text-base font-light tracking-tight text-accent">by IBM</span>
        </Link>

        {/* Desktop links */}
        <nav aria-label="Sections" className="hidden items-center gap-0.5 md:flex">
          {LINKS.map(l => (
            <a
              key={l.href}
              href={l.href}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-semibold transition-colors duration-150',
                activeHref === l.href
                  ? 'bg-accent/10 text-accent'
                  : 'text-muted hover:bg-panel hover:text-fg',
              )}
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-3">
          <Link
            to="/dashboard"
            className="hidden text-sm text-muted transition-colors hover:text-fg sm:block"
          >
            Sign in
          </Link>
          <Link
            to="/changes/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90 active:scale-[0.98]"
          >
            Get started <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {/* Hamburger — mobile only */}
        <button
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
          className="ml-4 flex size-9 flex-col items-center justify-center gap-[5px] rounded-md text-muted transition-colors hover:bg-panel hover:text-fg md:hidden"
        >
          <span className={cn('h-0.5 w-5 rounded-full bg-current transition-all duration-200', open && 'translate-y-[7px] rotate-45')} />
          <span className={cn('h-0.5 w-5 rounded-full bg-current transition-all duration-200', open && 'opacity-0')} />
          <span className={cn('h-0.5 w-5 rounded-full bg-current transition-all duration-200', open && '-translate-y-[7px] -rotate-45')} />
        </button>
      </div>

      {/* ── mobile menu ── */}
      {open && (
        <div
          ref={menuRef}
          className="absolute inset-x-0 top-16 border-y border-line bg-white shadow-lg md:hidden"
        >
          <div className="mx-auto max-w-6xl px-4 pb-4 pt-2">
            <ul className="space-y-0.5">
              {LINKS.map(l => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'block rounded-md px-4 py-2.5 text-sm transition-colors',
                      activeHref === l.href
                        ? 'bg-accent/10 font-medium text-accent'
                        : 'font-normal text-fg hover:bg-panel',
                    )}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2 border-t border-line pt-3">
              <Link
                to="/dashboard"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-lg border border-line py-2.5 text-center text-sm font-medium text-fg hover:bg-panel"
              >
                Sign in
              </Link>
              <Link
                to="/changes/new"
                onClick={() => setOpen(false)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent py-2.5 text-sm font-semibold text-white hover:bg-accent/90"
              >
                Get started <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
